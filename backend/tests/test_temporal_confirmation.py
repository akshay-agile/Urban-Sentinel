import asyncio
import unittest

from app.models.enums import IncidentTypeEnum, SeverityEnum
from app.services.incident_engine import Classification
from app.services.temporal_confirmation import TemporalConfirmation


def classification(hazard: IncidentTypeEnum) -> Classification:
    return Classification(hazard, SeverityEnum.medium, 800.0)


class TemporalConfirmationTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.confirmation = TemporalConfirmation()

    async def test_same_camera_hazard_confirms_on_third_positive(self):
        fire = classification(IncidentTypeEnum.fire)

        self.assertIsNone(await self.confirmation.process(1, fire))
        self.assertIsNone(await self.confirmation.process(1, fire))
        self.assertIs(fire, await self.confirmation.process(1, fire))

    async def test_negative_frame_resets_streak(self):
        fire = classification(IncidentTypeEnum.fire)

        await self.confirmation.process(1, fire)
        await self.confirmation.process(1, fire)
        await self.confirmation.reset(1)

        self.assertIsNone(await self.confirmation.process(1, fire))
        self.assertIsNone(await self.confirmation.process(1, fire))

    async def test_camera_streaks_are_isolated(self):
        fire = classification(IncidentTypeEnum.fire)

        await self.confirmation.process(1, fire)
        await self.confirmation.process(2, fire)
        self.assertIsNone(await self.confirmation.process(1, fire))
        self.assertIsNone(await self.confirmation.process(2, fire))

    async def test_hazard_change_restarts_streak_for_new_hazard(self):
        fire = classification(IncidentTypeEnum.fire)
        flood = classification(IncidentTypeEnum.flood)

        await self.confirmation.process(1, fire)
        await self.confirmation.process(1, fire)
        self.assertIsNone(await self.confirmation.process(1, flood))
        self.assertIsNone(await self.confirmation.process(1, flood))
        self.assertIs(flood, await self.confirmation.process(1, flood))

    async def test_confirmed_hazard_emits_only_once_until_reset(self):
        fire = classification(IncidentTypeEnum.fire)

        await self.confirmation.process(1, fire)
        await self.confirmation.process(1, fire)
        self.assertIs(fire, await self.confirmation.process(1, fire))
        for _ in range(5):
            self.assertIsNone(await self.confirmation.process(1, fire))

    async def test_concurrent_same_camera_updates_do_not_duplicate_confirmation(self):
        fire = classification(IncidentTypeEnum.fire)

        results = await asyncio.gather(
            *(self.confirmation.process(1, fire) for _ in range(20))
        )

        self.assertEqual(sum(result is not None for result in results), 1)
        self.assertIs(fire, next(result for result in results if result is not None))


if __name__ == "__main__":
    unittest.main()
