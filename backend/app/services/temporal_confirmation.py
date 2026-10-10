"""In-process temporal confirmation for camera visual detections.

State is intentionally memory-only for the current single-process development
setup. It resets when the backend process/reloader restarts and is not shared
between multiple worker processes.
"""
import asyncio
from dataclasses import dataclass

from app.models.enums import IncidentTypeEnum
from app.services.incident_engine import Classification

CONFIRMATION_FRAMES = 3


@dataclass
class _Streak:
    count: int = 0
    dispatched: bool = False


class TemporalConfirmation:
    """Require consecutive same-hazard classifications for each camera."""

    def __init__(self, confirmation_frames: int = CONFIRMATION_FRAMES):
        if confirmation_frames < 1:
            raise ValueError("confirmation_frames must be at least 1")
        self.confirmation_frames = confirmation_frames
        self._streaks: dict[tuple[int, IncidentTypeEnum], _Streak] = {}
        self._active_hazard_by_camera: dict[int, IncidentTypeEnum] = {}
        self._locks_by_camera: dict[int, asyncio.Lock] = {}

    def _lock_for_camera(self, camera_id: int) -> asyncio.Lock:
        # Devices are registered database records, so this lock set is bounded
        # by the cameras handled by this backend process.
        return self._locks_by_camera.setdefault(camera_id, asyncio.Lock())

    async def process(self, camera_id: int, classification: Classification) -> Classification | None:
        """Return the classification once on its confirmation frame only."""
        async with self._lock_for_camera(camera_id):
            hazard = classification.incident_type
            active_hazard = self._active_hazard_by_camera.get(camera_id)

            if active_hazard is not None and active_hazard != hazard:
                self._streaks.pop((camera_id, active_hazard), None)

            key = (camera_id, hazard)
            streak = self._streaks.setdefault(key, _Streak())
            self._active_hazard_by_camera[camera_id] = hazard

            if streak.count < self.confirmation_frames:
                streak.count += 1

            if streak.count == self.confirmation_frames and not streak.dispatched:
                streak.dispatched = True
                return classification

            return None

    async def reset(self, camera_id: int) -> None:
        """Clear the camera's active streak after a frame has no classification."""
        async with self._lock_for_camera(camera_id):
            hazard = self._active_hazard_by_camera.pop(camera_id, None)
            if hazard is not None:
                self._streaks.pop((camera_id, hazard), None)


temporal_confirmation = TemporalConfirmation()
