# """Display the live Urban Sentinel camera stream with model detections."""
# import argparse
# import logging
# import sys
# import threading
# import time
# from collections import deque
# from pathlib import Path

# import cv2
# import numpy as np

# BACKEND_ROOT = Path(__file__).resolve().parents[1]
# if str(BACKEND_ROOT) not in sys.path:
#     sys.path.insert(0, str(BACKEND_ROOT))

# from scripts.realtime_camera_client import FFmpegFrameReader
# from app.ai.inference import is_qualified_hazard_detection

# LOGGER = logging.getLogger("urban_sentinel.camera_visualizer")
# DEFAULT_RTSP_URL = "rtsp://127.0.0.1:8554/urban-sentinel-direct"
# # Keep raw pipe output near the measured YOLO display rate (~7.4 FPS).
# VISUALIZER_OUTPUT_FPS = 7.0

# HAZARD_STYLE = {
#     "fire": (0, 0, 255),       # red: fire and smoke
#     "flood": (255, 100, 0),    # blue: flood / waterlogging
#     "accident": (0, 200, 255),  # yellow: accident
# }
# HAZARD_LABEL = {
#     "fire": "FIRE/SMOKE",
#     "flood": "FLOOD",
#     "accident": "ACCIDENT",
# }


# def parse_args() -> argparse.Namespace:
#     parser = argparse.ArgumentParser(description=__doc__)
#     parser.add_argument("--rtsp-url", default=DEFAULT_RTSP_URL)
#     return parser.parse_args()


# def draw_detections(frame: np.ndarray, inference_results: dict) -> int:
#     """Draw model boxes and return the number of displayed detections."""
#     count = 0
#     for model_key, results in inference_results.items():
#         if model_key not in HAZARD_STYLE or not results:
#             continue
#         result = results[0]
#         color = HAZARD_STYLE[model_key]
#         category = HAZARD_LABEL[model_key]

#         for box in result.boxes:
#             class_id = int(box.cls[0])
#             confidence = float(box.conf[0])
#             class_name = str(result.names[class_id])
#             if not is_qualified_hazard_detection({
#                 "model": model_key,
#                 "class": class_name,
#                 "confidence": confidence,
#             }):
#                 continue
#             x1, y1, x2, y2 = (
#                 int(round(coordinate)) for coordinate in box.xyxy[0].tolist()
#             )
#             label = f"{category} | {class_name} {confidence:.2f}"

#             cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
#             (label_width, label_height), baseline = cv2.getTextSize(
#                 label, cv2.FONT_HERSHEY_SIMPLEX, 0.55, 2
#             )
#             label_top = max(0, y1 - label_height - baseline - 8)
#             cv2.rectangle(
#                 frame,
#                 (x1, label_top),
#                 (x1 + label_width + 8, label_top + label_height + baseline + 6),
#                 color,
#                 cv2.FILLED,
#             )
#             cv2.putText(
#                 frame,
#                 label,
#                 (x1 + 4, label_top + label_height + 1),
#                 cv2.FONT_HERSHEY_SIMPLEX,
#                 0.55,
#                 (255, 255, 255),
#                 2,
#                 cv2.LINE_AA,
#             )
#             count += 1
#     return count


# class LatestFrameSource:
#     """Continuously read FFmpeg frames while keeping only the newest frame."""

#     def __init__(self, url: str, output_fps: float):
#         self.url = url
#         self.output_fps = output_fps
#         self._lock = threading.Lock()
#         self._stop = threading.Event()
#         self._thread: threading.Thread | None = None
#         self._reader: FFmpegFrameReader | None = None
#         self._frame: np.ndarray | None = None
#         self._sequence = 0
#         self._status = "CONNECTING"

#     def start(self) -> None:
#         self._thread = threading.Thread(
#             target=self._read_loop,
#             name="camera-frame-reader",
#             daemon=True,
#         )
#         self._thread.start()

#     def snapshot(self) -> tuple[np.ndarray | None, int, str]:
#         with self._lock:
#             return self._frame, self._sequence, self._status

#     def _set_status(self, status: str) -> None:
#         with self._lock:
#             self._status = status

#     def _read_loop(self) -> None:
#         reconnect_delay = 1.0
#         while not self._stop.is_set():
#             reader = FFmpegFrameReader(self.url, output_fps=self.output_fps)
#             with self._lock:
#                 self._reader = reader
#                 self._status = "CONNECTING"
#             try:
#                 reader.start()
#                 reconnect_delay = 1.0
#                 self._set_status("LIVE")
#                 LOGGER.info("Connected to RTSP stream: %s", self.url)

#                 while not self._stop.is_set():
#                     frame = reader.read_frame()
#                     if frame is None:
#                         raise RuntimeError("FFmpeg stream ended")
#                     with self._lock:
#                         self._frame = frame
#                         self._sequence += 1
#                         self._status = "LIVE"
#             except (OSError, RuntimeError) as exc:
#                 if not self._stop.is_set():
#                     self._set_status("RECONNECTING")
#                     LOGGER.warning("Camera stream unavailable (%s); retrying", str(exc)[:200])
#             finally:
#                 reader.stop()
#                 with self._lock:
#                     if self._reader is reader:
#                         self._reader = None

#             if not self._stop.wait(reconnect_delay):
#                 reconnect_delay = min(reconnect_delay * 2, 10.0)

#     def stop(self) -> None:
#         self._stop.set()
#         with self._lock:
#             reader = self._reader
#         # Make a pending pipe read return; the reader thread owns pipe cleanup.
#         if reader is not None and reader.process is not None and reader.process.poll() is None:
#             reader.process.terminate()
#         if self._thread is not None:
#             self._thread.join(timeout=7)


# def main() -> int:
#     args = parse_args()

#     # Use exactly the existing production inference entry point and model settings.
#     from app.ai.inference import run_inference

#     window_name = "Urban Sentinel - Live Camera"
#     cv2.namedWindow(window_name, cv2.WINDOW_NORMAL)
#     source = LatestFrameSource(args.rtsp_url, output_fps=VISUALIZER_OUTPUT_FPS)
#     source.start()

#     processed_times: deque[float] = deque(maxlen=30)
#     last_sequence = -1
#     display_frame: np.ndarray | None = None
#     detection_count = 0
#     inference_fps = 0.0

#     try:
#         while True:
#             frame, sequence, status = source.snapshot()
#             if frame is not None and sequence != last_sequence:
#                 display_frame = frame.copy()
#                 try:
#                     results = run_inference(frame)
#                     detection_count = draw_detections(display_frame, results)
#                 except Exception:
#                     LOGGER.exception("Inference failed for a camera frame")
#                     detection_count = 0

#                 last_sequence = sequence
#                 now = time.monotonic()
#                 processed_times.append(now)
#                 if len(processed_times) > 1:
#                     elapsed = processed_times[-1] - processed_times[0]
#                     inference_fps = (len(processed_times) - 1) / elapsed if elapsed else 0.0

#             if display_frame is None:
#                 view = np.zeros((360, 640, 3), dtype=np.uint8)
#             else:
#                 view = display_frame.copy()

#             status_color = (40, 200, 40) if status == "LIVE" else (0, 165, 255)
#             cv2.rectangle(view, (0, 0), (view.shape[1], 42), (25, 25, 25), cv2.FILLED)
#             status_text = (
#                 f"Urban Sentinel | {status} | inference FPS: {inference_fps:.1f}"
#                 f" | detections: {detection_count} | q: quit"
#             )
#             cv2.putText(
#                 view,
#                 status_text,
#                 (12, 28),
#                 cv2.FONT_HERSHEY_SIMPLEX,
#                 0.65,
#                 status_color,
#                 2,
#                 cv2.LINE_AA,
#             )
#             cv2.imshow(window_name, view)
#             if cv2.waitKey(1) & 0xFF == ord("q"):
#                 break
#     except KeyboardInterrupt:
#         LOGGER.info("Stopping live camera visualizer")
#     finally:
#         source.stop()
#         cv2.destroyAllWindows()

#     return 0


# if __name__ == "__main__":
#     logging.basicConfig(
#         level=logging.INFO,
#         format="%(asctime)s %(levelname)s %(name)s: %(message)s",
#     )
#     raise SystemExit(main())


"""Display the live Urban Sentinel camera stream with model detections."""

import argparse
import logging
import os
import queue
import sys
import threading
import time
from collections import deque
from pathlib import Path

import cv2
import httpx
import numpy as np

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from scripts.realtime_camera_client import FFmpegFrameReader
from app.ai.inference import is_qualified_hazard_detection

LOGGER = logging.getLogger("urban_sentinel.camera_visualizer")

DEFAULT_RTSP_URL = "rtsp://127.0.0.1:8554/urban-sentinel-direct"
DEFAULT_BACKEND_URL = os.getenv(
    "URBAN_SENTINEL_BACKEND_URL",
    "http://localhost:8000/api/v1",
)
DEFAULT_DEVICE_ID = os.getenv("URBAN_SENTINEL_DEVICE_ID", "camera_1")
DEFAULT_BACKEND_SAMPLE_FPS = float(os.getenv("URBAN_SENTINEL_SAMPLE_FPS", "2"))

# Keep raw pipe output near the measured YOLO display rate.
VISUALIZER_OUTPUT_FPS = 7.0

# How often to refresh the display while inference is running.
DISPLAY_REFRESH_MS = 15

HAZARD_STYLE = {
    "fire": (0, 0, 255),       # Red: fire and smoke
    "flood": (255, 100, 0),    # Blue: flood / waterlogging
    "accident": (0, 200, 255), # Yellow: accident
}

HAZARD_LABEL = {
    "fire": "FIRE/SMOKE",
    "flood": "FLOOD",
    "accident": "ACCIDENT",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--rtsp-url", default=DEFAULT_RTSP_URL)
    parser.add_argument("--backend-url", default=DEFAULT_BACKEND_URL)
    parser.add_argument("--device-id", default=DEFAULT_DEVICE_ID)
    parser.add_argument(
        "--backend-sample-fps",
        type=float,
        default=DEFAULT_BACKEND_SAMPLE_FPS,
        help="Maximum frame submission rate to the incident API (default: 2 FPS)",
    )
    return parser.parse_args()


def draw_detections(frame: np.ndarray, inference_results: dict) -> int:
    """Draw qualified model detections and return the displayed count."""
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
                int(round(coordinate))
                for coordinate in box.xyxy[0].tolist()
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
                (
                    x1 + label_width + 8,
                    label_top + label_height + baseline + 6,
                ),
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
    """Read FFmpeg frames continuously, keeping only the newest frame."""

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
            reader = FFmpegFrameReader(
                self.url,
                output_fps=self.output_fps,
            )

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
                    LOGGER.warning(
                        "Camera stream unavailable (%s); retrying",
                        str(exc)[:200],
                    )

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

        # Make a pending pipe read return. The reader thread owns cleanup.
        if (
            reader is not None
            and reader.process is not None
            and reader.process.poll() is None
        ):
            reader.process.terminate()

        if self._thread is not None:
            self._thread.join(timeout=7)


class InferenceWorker:
    """Run inference separately so the GUI remains responsive."""

    def __init__(self):
        self._lock = threading.Lock()
        self._stop = threading.Event()
        self._thread: threading.Thread | None = None

        self._input_frame: np.ndarray | None = None
        self._input_sequence = -1

        self._output_frame: np.ndarray | None = None
        self._output_sequence = -1
        self._detection_count = 0
        self._inference_fps = 0.0
        self._status = "WAITING FOR FRAME"

        self._processed_times: deque[float] = deque(maxlen=30)

    def submit(self, frame: np.ndarray, sequence: int) -> None:
        # Keep only the latest frame; do not build up a queue.
        with self._lock:
            if sequence == self._input_sequence:
                return

            self._input_frame = frame.copy()
            self._input_sequence = sequence

    def start(self) -> None:
        self._thread = threading.Thread(
            target=self._run,
            name="camera-inference",
            daemon=True,
        )
        self._thread.start()

    def snapshot(
        self,
    ) -> tuple[np.ndarray | None, int, int, float, str]:
        with self._lock:
            frame = (
                self._output_frame.copy()
                if self._output_frame is not None
                else None
            )
            return (
                frame,
                self._output_sequence,
                self._detection_count,
                self._inference_fps,
                self._status,
            )

    def _run(self) -> None:
        # Import lazily so GUI startup is not delayed by inference imports.
        try:
            from app.ai.inference import run_inference
        except Exception:
            LOGGER.exception("Could not import the inference entry point")
            with self._lock:
                self._status = "INFERENCE IMPORT ERROR"
            return

        while not self._stop.is_set():
            with self._lock:
                frame = self._input_frame
                sequence = self._input_sequence

            if frame is None or sequence == self._output_sequence:
                self._stop.wait(0.01)
                continue

            try:
                LOGGER.info("Starting inference for frame %s", sequence)
                started = time.monotonic()

                annotated = frame.copy()
                results = run_inference(frame)
                detection_count = draw_detections(annotated, results)

                elapsed = time.monotonic() - started
                self._processed_times.append(time.monotonic())

                if len(self._processed_times) > 1:
                    window_elapsed = (
                        self._processed_times[-1] - self._processed_times[0]
                    )
                    inference_fps = (
                        (len(self._processed_times) - 1) / window_elapsed
                        if window_elapsed > 0
                        else 0.0
                    )
                else:
                    inference_fps = 0.0

                with self._lock:
                    self._output_frame = annotated
                    self._output_sequence = sequence
                    self._detection_count = detection_count
                    self._inference_fps = inference_fps
                    self._status = "INFERENCE LIVE"

                LOGGER.info(
                    "Inference completed for frame %s in %.2fs; detections=%d",
                    sequence,
                    elapsed,
                    detection_count,
                )

            except Exception:
                LOGGER.exception(
                    "Inference failed for frame %s",
                    sequence,
                )
                with self._lock:
                    self._status = "INFERENCE ERROR"

                self._stop.wait(0.25)

    def stop(self) -> None:
        self._stop.set()

        if self._thread is not None:
            self._thread.join(timeout=7)


class BackendFrameSubmitter:
    """Send sampled camera frames through the existing backend inference path."""

    def __init__(self, backend_url: str, device_id: str, sample_fps: float):
        if sample_fps <= 0:
            raise ValueError("backend sample FPS must be greater than zero")

        self.endpoint = f"{backend_url.rstrip('/')}/camera/frame"
        self.device_id = device_id
        self.interval = 1.0 / sample_fps
        self._queue: queue.Queue[tuple[np.ndarray, int]] = queue.Queue(maxsize=1)
        self._stop = threading.Event()
        self._thread: threading.Thread | None = None
        self._last_queued_at = 0.0

    def start(self) -> None:
        self._thread = threading.Thread(
            target=self._run,
            name="camera-backend-submit",
            daemon=True,
        )
        self._thread.start()
        LOGGER.info(
            "Backend frame submission enabled: endpoint=%s device_id=%s sample_fps=%.2f",
            self.endpoint,
            self.device_id,
            1.0 / self.interval,
        )

    def submit(self, frame: np.ndarray, sequence: int) -> None:
        now = time.monotonic()
        if self._stop.is_set() or now - self._last_queued_at < self.interval:
            return

        self._last_queued_at = now
        item = (frame.copy(), sequence)
        try:
            self._queue.put_nowait(item)
        except queue.Full:
            # Keep the newest frame so a slow API cannot build an old-frame backlog.
            try:
                self._queue.get_nowait()
            except queue.Empty:
                pass
            try:
                self._queue.put_nowait(item)
            except queue.Full:
                LOGGER.warning("Backend frame queue is full; skipping frame %d", sequence)

    def _run(self) -> None:
        try:
            with httpx.Client(timeout=10.0) as client:
                while not self._stop.is_set() or not self._queue.empty():
                    try:
                        frame, sequence = self._queue.get(timeout=0.25)
                    except queue.Empty:
                        continue

                    encoded_ok, jpeg = cv2.imencode(
                        ".jpg",
                        frame,
                        [cv2.IMWRITE_JPEG_QUALITY, 85],
                    )
                    if not encoded_ok:
                        LOGGER.error("Could not JPEG-encode backend frame %d", sequence)
                        continue

                    try:
                        response = client.post(
                            self.endpoint,
                            data={"device_id": self.device_id},
                            files={
                                "file": (
                                    "camera.jpg",
                                    jpeg.tobytes(),
                                    "image/jpeg",
                                )
                            },
                        )
                    except httpx.HTTPError as exc:
                        LOGGER.error(
                            "Backend frame submission failed for frame %d (%s)",
                            sequence,
                            str(exc)[:240],
                        )
                        continue

                    if response.is_error:
                        detail = response.text.replace("\r", " ").replace("\n", " ")[:300]
                        LOGGER.error(
                            "Backend rejected frame %d: HTTP %d | %s",
                            sequence,
                            response.status_code,
                            detail,
                        )
                        continue

                    try:
                        payload = response.json()
                        if not isinstance(payload, dict):
                            raise ValueError("response JSON was not an object")
                    except ValueError as exc:
                        LOGGER.error(
                            "Backend returned invalid JSON for frame %d: HTTP %d (%s)",
                            sequence,
                            response.status_code,
                            str(exc)[:160],
                        )
                        continue

                    classification = payload.get("classification") or {}
                    incident = payload.get("incident") or {}
                    incident_id = incident.get("id")
                    incident_type = classification.get("incident_type") or "none"
                    severity = classification.get("severity") or "none"
                    detections = payload.get("detections") or []
                    LOGGER.info(
                        "Backend frame response: frame=%d HTTP %d detections=%d "
                        "classification=%s/%s incident_id=%s",
                        sequence,
                        response.status_code,
                        len(detections),
                        incident_type,
                        severity,
                        incident_id if incident_id is not None else "none",
                    )
                    if incident_type != "none" and incident_id is None:
                        LOGGER.warning(
                            "Frame %d classified as %s but no incident was confirmed yet",
                            sequence,
                            incident_type,
                        )
        except Exception:
            LOGGER.exception("Backend frame submitter stopped unexpectedly")

    def stop(self) -> None:
        self._stop.set()
        if self._thread is not None:
            self._thread.join(timeout=12)


def main() -> int:
    args = parse_args()

    if args.backend_sample_fps <= 0:
        raise SystemExit("--backend-sample-fps must be greater than zero")

    window_name = "Urban Sentinel - Live Camera"

    LOGGER.info("OpenCV version: %s", cv2.__version__)
    if hasattr(cv2, "currentUIFramework"):
        LOGGER.info("OpenCV GUI framework: %s", cv2.currentUIFramework())

    source = LatestFrameSource(
        args.rtsp_url,
        output_fps=VISUALIZER_OUTPUT_FPS,
    )
    inference = InferenceWorker()
    backend_submitter = BackendFrameSubmitter(
        args.backend_url,
        args.device_id,
        args.backend_sample_fps,
    )

    try:
        LOGGER.info("Creating visualizer window")
        cv2.namedWindow(window_name, cv2.WINDOW_NORMAL)
        cv2.resizeWindow(window_name, 960, 540)

        startup_frame = np.zeros((540, 960, 3), dtype=np.uint8)
        cv2.putText(
            startup_frame,
            "Urban Sentinel - Connecting to camera...",
            (30, 270),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.8,
            (255, 255, 255),
            2,
            cv2.LINE_AA,
        )
        cv2.imshow(window_name, startup_frame)
        cv2.waitKey(1)
        LOGGER.info("Startup window displayed")

        source.start()
        inference.start()
        backend_submitter.start()

        last_submitted_sequence = -1
        last_log_time = 0.0

        while True:
            frame, sequence, stream_status = source.snapshot()

            if frame is not None and sequence != last_submitted_sequence:
                inference.submit(frame, sequence)
                backend_submitter.submit(frame, sequence)
                last_submitted_sequence = sequence

            (
                annotated_frame,
                inference_sequence,
                detection_count,
                inference_fps,
                inference_status,
            ) = inference.snapshot()

            if annotated_frame is not None:
                view = annotated_frame
            elif frame is not None:
                # Show the raw camera feed while the first inference runs.
                view = frame.copy()
            else:
                view = np.zeros((540, 960, 3), dtype=np.uint8)
                cv2.putText(
                    view,
                    "Waiting for camera stream...",
                    (30, 270),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.8,
                    (255, 255, 255),
                    2,
                    cv2.LINE_AA,
                )

            status_color = (
                (40, 200, 40)
                if stream_status == "LIVE"
                else (0, 165, 255)
            )

            cv2.rectangle(
                view,
                (0, 0),
                (view.shape[1], 42),
                (25, 25, 25),
                cv2.FILLED,
            )

            status_text = (
                f"Urban Sentinel | stream: {stream_status}"
                f" | AI: {inference_status}"
                f" | FPS: {inference_fps:.1f}"
                f" | detections: {detection_count}"
                f" | q: quit"
            )

            cv2.putText(
                view,
                status_text,
                (12, 28),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.55,
                status_color,
                2,
                cv2.LINE_AA,
            )

            cv2.imshow(window_name, view)

            # Pump GUI events on the main thread even while inference runs.
            key = cv2.waitKey(DISPLAY_REFRESH_MS) & 0xFF

            if key == ord("q"):
                break

            now = time.monotonic()
            if now - last_log_time >= 10:
                LOGGER.info(
                    "Display active | stream=%s | AI=%s | "
                    "frame=%s | detections=%d",
                    stream_status,
                    inference_status,
                    inference_sequence,
                    detection_count,
                )
                last_log_time = now

    except KeyboardInterrupt:
        LOGGER.info("Stopping live camera visualizer")

    except Exception:
        LOGGER.exception("Live camera visualizer failed")
        return 1

    finally:
        backend_submitter.stop()
        inference.stop()
        source.stop()
        cv2.destroyAllWindows()

    return 0


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    raise SystemExit(main())
