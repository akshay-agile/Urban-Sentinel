"""Sample an RTSP camera stream and forward JPEG frames to the camera API."""
import argparse
import logging
import os
import re
import shutil
import subprocess
import threading
import time
from collections import deque
from typing import Any

import cv2
import httpx
import numpy as np

LOGGER = logging.getLogger("urban_sentinel.camera_client")
DEFAULT_RTSP_URL = os.getenv(
    "URBAN_SENTINEL_RTSP_URL",
    "rtsp://127.0.0.1:8554/urban-sentinel-direct",
)
DEFAULT_BACKEND_URL = os.getenv(
    "URBAN_SENTINEL_BACKEND_URL",
    "http://localhost:8000/api/v1",
)
DEFAULT_DEVICE_ID = os.getenv("URBAN_SENTINEL_DEVICE_ID", "camera_1")
DEFAULT_FPS = float(os.getenv("URBAN_SENTINEL_SAMPLE_FPS", "2"))


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--rtsp-url", default=DEFAULT_RTSP_URL)
    parser.add_argument("--backend-url", default=DEFAULT_BACKEND_URL)
    parser.add_argument("--device-id", default=DEFAULT_DEVICE_ID)
    parser.add_argument("--fps", type=float, default=DEFAULT_FPS, help="Maximum submission rate (default: 2 FPS)")
    parser.add_argument("--duration", type=float, default=0, help="Stop after this many seconds; 0 runs until Ctrl+C")
    parser.add_argument("--jpeg-quality", type=int, default=85, help="JPEG quality from 40 to 100")
    parser.add_argument("--request-timeout", type=float, default=20.0)
    return parser.parse_args()


def read_exact(stream, size: int) -> bytearray | None:
    """Read one complete frame-sized block, or return None when the stream ends."""
    frame = bytearray(size)
    view = memoryview(frame)
    offset = 0
    while offset < size:
        chunk = stream.read(size - offset)
        if not chunk:
            return None
        view[offset : offset + len(chunk)] = chunk
        offset += len(chunk)
    return frame


class FFmpegFrameReader:
    """Decode an RTSP stream to bounded, one-frame-at-a-time BGR rawvideo."""

    _VIDEO_SIZE = re.compile(rb"\bVideo:.*?\b(\d{2,5})x(\d{2,5})\b")

    def __init__(
        self,
        url: str,
        startup_timeout: float = 15.0,
        output_fps: float | None = None,
    ):
        self.url = url
        self.startup_timeout = startup_timeout
        if output_fps is not None and output_fps <= 0:
            raise ValueError("output_fps must be greater than zero")
        self.output_fps = output_fps
        self.process: subprocess.Popen | None = None
        self.width: int | None = None
        self.height: int | None = None
        self._dimension_error: str | None = None
        self._reported_frame_size = False
        self._dimensions_ready = threading.Event()
        self._stderr_tail: deque[str] = deque(maxlen=12)
        self._stderr_thread: threading.Thread | None = None

    def start(self) -> None:
        ffmpeg = shutil.which("ffmpeg")
        if not ffmpeg:
            raise FileNotFoundError("ffmpeg was not found on PATH")

        ffprobe = shutil.which("ffprobe")
        if ffprobe:
            self.width, self.height = self._probe_dimensions(ffprobe, self.url)

        command = [
            ffmpeg,
            "-hide_banner",
            "-loglevel",
            "info",
            "-rtsp_transport",
            "tcp",
            "-timeout",
            "5000000",
            "-i",
            self.url,
        ]
        if self.width is not None and self.height is not None:
            # Make the output frame geometry explicit; rawvideo has no headers.
            command.extend(["-s:v", f"{self.width}x{self.height}"])
        if self.output_fps is not None:
            # Drop decoded frames before rawvideo crosses the pipe.
            command.extend(["-vf", f"fps={self.output_fps:g}"])
        command.extend(
            [
                "-an",
                "-sn",
                "-dn",
                "-f",
                "rawvideo",
                "-pix_fmt",
                "bgr24",
                "pipe:1",
            ]
        )
        self.process = subprocess.Popen(
            command,
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            bufsize=0,
        )
        self._stderr_thread = threading.Thread(
            target=self._read_stderr,
            name="ffmpeg-stderr",
            daemon=True,
        )
        self._stderr_thread.start()

        deadline = time.monotonic() + self.startup_timeout
        while not self._dimensions_ready.wait(0.1):
            if self.process.poll() is not None:
                raise RuntimeError(self._startup_error("FFmpeg exited before the video stream became ready"))
            if time.monotonic() >= deadline:
                raise RuntimeError(self._startup_error("Timed out waiting for FFmpeg video dimensions"))
        if self._dimension_error:
            raise RuntimeError(self._dimension_error)
        assert self.width is not None and self.height is not None
        LOGGER.info(
            "FFmpeg rawvideo ready: %dx%d BGR24, %d bytes per frame",
            self.width,
            self.height,
            self.width * self.height * 3,
        )

    @staticmethod
    def _probe_dimensions(ffprobe: str, url: str) -> tuple[int, int] | tuple[None, None]:
        command = [
            ffprobe,
            "-v",
            "error",
            "-rtsp_transport",
            "tcp",
            "-select_streams",
            "v:0",
            "-show_entries",
            "stream=width,height",
            "-of",
            "csv=s=x:p=0",
            url,
        ]
        try:
            result = subprocess.run(
                command,
                check=True,
                capture_output=True,
                text=True,
                timeout=10,
            )
            match = re.search(r"(?m)^\s*(\d{2,5})x(\d{2,5})\s*$", result.stdout)
            if match:
                width, height = (int(value) for value in match.groups())
                if width > 0 and height > 0:
                    LOGGER.info("ffprobe detected RTSP dimensions: %dx%d", width, height)
                    return width, height
        except (OSError, subprocess.SubprocessError):
            pass

        LOGGER.warning("ffprobe did not return video dimensions; using FFmpeg stream metadata")
        return None, None

    def _read_stderr(self) -> None:
        assert self.process is not None and self.process.stderr is not None
        for line in iter(self.process.stderr.readline, b""):
            message = line.decode("utf-8", errors="replace").strip()
            self._stderr_tail.append(message)
            lowered = message.lower()
            if any(
                marker in lowered
                for marker in ("error while decoding", "concealing", "corrupt decoded frame", "invalid nal")
            ):
                LOGGER.warning("FFmpeg decoder reported: %s", message[:300])
            match = self._VIDEO_SIZE.search(line)
            if match:
                detected_width, detected_height = (int(value) for value in match.groups())
                if self.width is not None and self.height is not None and (
                    (self.width, self.height) != (detected_width, detected_height)
                ):
                    self._dimension_error = (
                        f"ffprobe dimensions {self.width}x{self.height} do not match "
                        f"FFmpeg input dimensions {detected_width}x{detected_height}"
                    )
                    self._dimensions_ready.set()
                    continue
                self.width, self.height = detected_width, detected_height
                if self.width > 0 and self.height > 0:
                    self._dimensions_ready.set()

    def _startup_error(self, message: str) -> str:
        details = " | ".join(line for line in self._stderr_tail if line)
        return f"{message}{': ' + details if details else ''}"

    def read_frame(self) -> np.ndarray | None:
        if self.process is None or self.process.stdout is None:
            return None
        assert self.width is not None and self.height is not None
        raw = read_exact(self.process.stdout, self.width * self.height * 3)
        if raw is None:
            return None
        if not self._reported_frame_size:
            LOGGER.info(
                "FFmpeg frame verified: dimensions=%dx%d expected_bytes=%d actual_bytes=%d",
                self.width,
                self.height,
                self.width * self.height * 3,
                len(raw),
            )
            self._reported_frame_size = True
        return np.frombuffer(raw, dtype=np.uint8).reshape((self.height, self.width, 3))

    def stop(self) -> None:
        process = self.process
        if process is None:
            return
        if process.poll() is None:
            process.terminate()
            try:
                process.wait(timeout=3)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait()
        for pipe in (process.stdout, process.stderr):
            if pipe is not None:
                pipe.close()
        if self._stderr_thread is not None:
            self._stderr_thread.join(timeout=1)
        self.process = None


def summarize_response(payload: dict[str, Any]) -> tuple[tuple, str]:
    detections = payload.get("detections") or []
    labels = sorted(
        {
            f"{item.get('model', '?')}:{item.get('class', '?')}"
            for item in detections
        }
    )
    label_summary = ",".join(labels[:5]) or "none"
    if len(labels) > 5:
        label_summary += f",+{len(labels) - 5}"

    classification = payload.get("classification") or {}
    incident = payload.get("incident") or {}
    hazard = classification.get("incident_type") or "none"
    severity = classification.get("severity") or "none"
    incident_id = incident.get("id")
    signature = (tuple(labels), hazard, severity, incident_id)
    message = (
        f"HTTP {payload.get('_http_status', '?')} | detections={label_summary} | "
        f"classification={hazard}/{severity} | incident_id={incident_id or 'none'}"
    )
    return signature, message


def main() -> int:
    args = parse_args()
    if args.fps <= 0:
        raise SystemExit("--fps must be greater than zero")
    if args.duration < 0:
        raise SystemExit("--duration cannot be negative")
    if not 40 <= args.jpeg_quality <= 100:
        raise SystemExit("--jpeg-quality must be between 40 and 100")

    endpoint = f"{args.backend_url.rstrip('/')}/camera/frame"
    interval = 1.0 / args.fps
    start_time = time.monotonic()
    stop_at = start_time + args.duration if args.duration else None
    next_sample_at = start_time
    next_summary_at = start_time + 5
    captured = 0
    encoded = 0
    frames_sent = 0
    responses = 0
    request_failures = 0
    latency_total = 0.0
    last_signature = None
    reader: FFmpegFrameReader | None = None
    reconnect_delay = 1.0

    LOGGER.info(
        "Camera client starting: rtsp=%s backend=%s device_id=%s sample_fps=%.2f",
        args.rtsp_url,
        endpoint,
        args.device_id,
        args.fps,
    )

    try:
        with httpx.Client(timeout=args.request_timeout) as client:
            while stop_at is None or time.monotonic() < stop_at:
                if reader is None:
                    LOGGER.info("Connecting to RTSP stream")
                    startup_timeout = 15.0
                    if stop_at is not None:
                        startup_timeout = min(startup_timeout, max(stop_at - time.monotonic(), 0.1))
                    reader = FFmpegFrameReader(args.rtsp_url, startup_timeout=startup_timeout)
                    try:
                        reader.start()
                    except (OSError, RuntimeError) as exc:
                        LOGGER.warning(
                            "RTSP connection failed (%s); retrying in %.1f seconds",
                            str(exc)[:240],
                            reconnect_delay,
                        )
                        reader.stop()
                        reader = None
                        retry_wait = reconnect_delay
                        if stop_at is not None:
                            retry_wait = min(retry_wait, max(stop_at - time.monotonic(), 0.0))
                        time.sleep(retry_wait)
                        reconnect_delay = min(reconnect_delay * 2, 10.0)
                        continue
                    LOGGER.info("RTSP connected")
                    reconnect_delay = 1.0

                try:
                    frame = reader.read_frame()
                except OSError as exc:
                    LOGGER.warning("FFmpeg frame read failed (%s); reconnecting", str(exc)[:200])
                    frame = None
                if frame is None:
                    LOGGER.warning("FFmpeg stream ended; reconnecting")
                    reader.stop()
                    reader = None
                    retry_wait = reconnect_delay
                    if stop_at is not None:
                        retry_wait = min(retry_wait, max(stop_at - time.monotonic(), 0.0))
                    time.sleep(retry_wait)
                    reconnect_delay = min(reconnect_delay * 2, 10.0)
                    continue

                captured += 1
                now = time.monotonic()
                if now < next_sample_at:
                    continue

                encoded_ok, jpeg = cv2.imencode(
                    ".jpg",
                    frame,
                    [cv2.IMWRITE_JPEG_QUALITY, args.jpeg_quality],
                )
                if not encoded_ok:
                    LOGGER.warning("Could not JPEG-encode sampled frame")
                    next_sample_at = time.monotonic() + interval
                    continue
                encoded += 1

                request_started = time.monotonic()
                try:
                    frames_sent += 1
                    response = client.post(
                        endpoint,
                        data={"device_id": args.device_id},
                        files={"file": ("camera.jpg", jpeg.tobytes(), "image/jpeg")},
                    )
                    latency = time.monotonic() - request_started
                    latency_total += latency
                    responses += 1
                    try:
                        payload = response.json()
                        if not isinstance(payload, dict):
                            payload = {}
                    except ValueError:
                        payload = {}
                    payload["_http_status"] = response.status_code
                    signature, summary = summarize_response(payload)

                    now = time.monotonic()
                    if response.is_error:
                        detail = response.text.replace("\r", " ").replace("\n", " ")[:240]
                        LOGGER.error(
                            "captured=%d sent=%d | %s | latency=%.2fs | %s",
                            captured,
                            frames_sent,
                            summary,
                            latency,
                            detail,
                        )
                    elif signature != last_signature or now >= next_summary_at:
                        LOGGER.info(
                            "captured=%d sent=%d | %s | latency=%.2fs",
                            captured,
                            frames_sent,
                            summary,
                            latency,
                        )
                        last_signature = signature
                        next_summary_at = now + 5
                except httpx.HTTPError as exc:
                    request_failures += 1
                    LOGGER.warning("Backend request failed (%s); continuing", str(exc)[:200])

                next_sample_at = time.monotonic() + interval

    except KeyboardInterrupt:
        LOGGER.info("Stopping camera client")
    finally:
        if reader is not None:
            reader.stop()

    elapsed = max(time.monotonic() - start_time, 0.001)
    average_latency = latency_total / responses if responses else 0.0
    LOGGER.info(
        "Stopped after %.1fs: captured=%d (%.2f FPS), JPEG=%d, frames_sent=%d, HTTP responses=%d "
        "(%.2f FPS), request_failures=%d, average_backend_latency=%.2fs",
        elapsed,
        captured,
        captured / elapsed,
        encoded,
        frames_sent,
        responses,
        responses / elapsed,
        request_failures,
        average_latency,
    )
    return 0


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    raise SystemExit(main())
