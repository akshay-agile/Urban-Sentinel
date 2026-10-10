"""Display the live Urban Sentinel camera stream with model detections."""
import argparse
import logging
import sys
import threading
import time
from collections import deque
from pathlib import Path

import cv2
import numpy as np

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from scripts.realtime_camera_client import FFmpegFrameReader
from app.ai.inference import is_qualified_hazard_detection

LOGGER = logging.getLogger("urban_sentinel.camera_visualizer")
DEFAULT_RTSP_URL = "rtsp://127.0.0.1:8554/urban-sentinel-direct"
# Keep raw pipe output near the measured YOLO display rate (~7.4 FPS).
VISUALIZER_OUTPUT_FPS = 7.0

HAZARD_STYLE = {
    "fire": (0, 0, 255),       # red: fire and smoke
    "flood": (255, 100, 0),    # blue: flood / waterlogging
    "accident": (0, 200, 255),  # yellow: accident
}
HAZARD_LABEL = {
    "fire": "FIRE/SMOKE",
    "flood": "FLOOD",
    "accident": "ACCIDENT",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--rtsp-url", default=DEFAULT_RTSP_URL)
    return parser.parse_args()


def draw_detections(frame: np.ndarray, inference_results: dict) -> int:
    """Draw model boxes and return the number of displayed detections."""
    count = 0
    for model_key, results in inference_results.items():
        if model_key not in HAZARD_STYLE or not results:
            continue
        result = results[0]
        color = HAZARD_STYLE[model_key]
        category = HAZARD_LABEL[model_key]

        for box in result.boxes:
            class_id = int(box.cls[0])
            confidence = float(box.conf[0])
            class_name = str(result.names[class_id])
            if not is_qualified_hazard_detection({
                "model": model_key,
                "class": class_name,
                "confidence": confidence,
            }):
                continue
            x1, y1, x2, y2 = (
                int(round(coordinate)) for coordinate in box.xyxy[0].tolist()
            )
            label = f"{category} | {class_name} {confidence:.2f}"

            cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
            (label_width, label_height), baseline = cv2.getTextSize(
                label, cv2.FONT_HERSHEY_SIMPLEX, 0.55, 2
            )
            label_top = max(0, y1 - label_height - baseline - 8)
            cv2.rectangle(
                frame,
                (x1, label_top),
                (x1 + label_width + 8, label_top + label_height + baseline + 6),
                color,
                cv2.FILLED,
            )
            cv2.putText(
                frame,
                label,
                (x1 + 4, label_top + label_height + 1),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.55,
                (255, 255, 255),
                2,
                cv2.LINE_AA,
            )
            count += 1
    return count


class LatestFrameSource:
    """Continuously read FFmpeg frames while keeping only the newest frame."""

    def __init__(self, url: str, output_fps: float):
        self.url = url
        self.output_fps = output_fps
        self._lock = threading.Lock()
        self._stop = threading.Event()
        self._thread: threading.Thread | None = None
        self._reader: FFmpegFrameReader | None = None
        self._frame: np.ndarray | None = None
        self._sequence = 0
        self._status = "CONNECTING"

    def start(self) -> None:
        self._thread = threading.Thread(
            target=self._read_loop,
            name="camera-frame-reader",
            daemon=True,
        )
        self._thread.start()

    def snapshot(self) -> tuple[np.ndarray | None, int, str]:
        with self._lock:
            return self._frame, self._sequence, self._status

    def _set_status(self, status: str) -> None:
        with self._lock:
            self._status = status

    def _read_loop(self) -> None:
        reconnect_delay = 1.0
        while not self._stop.is_set():
            reader = FFmpegFrameReader(self.url, output_fps=self.output_fps)
            with self._lock:
                self._reader = reader
                self._status = "CONNECTING"
            try:
                reader.start()
                reconnect_delay = 1.0
                self._set_status("LIVE")
                LOGGER.info("Connected to RTSP stream: %s", self.url)

                while not self._stop.is_set():
                    frame = reader.read_frame()
                    if frame is None:
                        raise RuntimeError("FFmpeg stream ended")
                    with self._lock:
                        self._frame = frame
                        self._sequence += 1
                        self._status = "LIVE"
            except (OSError, RuntimeError) as exc:
                if not self._stop.is_set():
                    self._set_status("RECONNECTING")
                    LOGGER.warning("Camera stream unavailable (%s); retrying", str(exc)[:200])
            finally:
                reader.stop()
                with self._lock:
                    if self._reader is reader:
                        self._reader = None

            if not self._stop.wait(reconnect_delay):
                reconnect_delay = min(reconnect_delay * 2, 10.0)

    def stop(self) -> None:
        self._stop.set()
        with self._lock:
            reader = self._reader
        # Make a pending pipe read return; the reader thread owns pipe cleanup.
        if reader is not None and reader.process is not None and reader.process.poll() is None:
            reader.process.terminate()
        if self._thread is not None:
            self._thread.join(timeout=7)


def main() -> int:
    args = parse_args()

    # Use exactly the existing production inference entry point and model settings.
    from app.ai.inference import run_inference

    window_name = "Urban Sentinel - Live Camera"
    cv2.namedWindow(window_name, cv2.WINDOW_NORMAL)
    source = LatestFrameSource(args.rtsp_url, output_fps=VISUALIZER_OUTPUT_FPS)
    source.start()

    processed_times: deque[float] = deque(maxlen=30)
    last_sequence = -1
    display_frame: np.ndarray | None = None
    detection_count = 0
    inference_fps = 0.0

    try:
        while True:
            frame, sequence, status = source.snapshot()
            if frame is not None and sequence != last_sequence:
                display_frame = frame.copy()
                try:
                    results = run_inference(frame)
                    detection_count = draw_detections(display_frame, results)
                except Exception:
                    LOGGER.exception("Inference failed for a camera frame")
                    detection_count = 0

                last_sequence = sequence
                now = time.monotonic()
                processed_times.append(now)
                if len(processed_times) > 1:
                    elapsed = processed_times[-1] - processed_times[0]
                    inference_fps = (len(processed_times) - 1) / elapsed if elapsed else 0.0

            if display_frame is None:
                view = np.zeros((360, 640, 3), dtype=np.uint8)
            else:
                view = display_frame.copy()

            status_color = (40, 200, 40) if status == "LIVE" else (0, 165, 255)
            cv2.rectangle(view, (0, 0), (view.shape[1], 42), (25, 25, 25), cv2.FILLED)
            status_text = (
                f"Urban Sentinel | {status} | inference FPS: {inference_fps:.1f}"
                f" | detections: {detection_count} | q: quit"
            )
            cv2.putText(
                view,
                status_text,
                (12, 28),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.65,
                status_color,
                2,
                cv2.LINE_AA,
            )
            cv2.imshow(window_name, view)
            if cv2.waitKey(1) & 0xFF == ord("q"):
                break
    except KeyboardInterrupt:
        LOGGER.info("Stopping live camera visualizer")
    finally:
        source.stop()
        cv2.destroyAllWindows()

    return 0


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    raise SystemExit(main())
