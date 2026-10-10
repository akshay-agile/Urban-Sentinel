import unittest

from app.ai.visual_severity import assess_visual_severity
from app.models.enums import IncidentTypeEnum, SeverityEnum


def detection(class_name: str, coverage: float, confidence: float = 0.7) -> dict:
    return {
        "model": "test",
        "class": class_name,
        "confidence": confidence,
        "bbox_area_fraction": coverage,
    }


class VisualSeverityTests(unittest.TestCase):
    def test_low_severity_from_small_single_accident_region(self):
        result = assess_visual_severity(
            IncidentTypeEnum.accident,
            [detection("Accident", 0.03)],
        )
        self.assertEqual(result.severity, SeverityEnum.low)

    def test_medium_severity_from_typical_accident_region_extent(self):
        result = assess_visual_severity(
            IncidentTypeEnum.accident,
            [detection("Accident", 0.115)],
        )
        self.assertEqual(result.severity, SeverityEnum.medium)
        self.assertIn("11.5%", result.reason)

    def test_high_severity_from_large_accident_region(self):
        result = assess_visual_severity(
            IncidentTypeEnum.accident,
            [detection("Accident", 0.65)],
        )
        self.assertEqual(result.severity, SeverityEnum.high)

    def test_multiple_accident_regions_raise_visual_extent_tier(self):
        result = assess_visual_severity(
            IncidentTypeEnum.accident,
            [detection("Accident", 0.02) for _ in range(3)],
        )
        self.assertEqual(result.severity, SeverityEnum.high)
        self.assertEqual(result.features["detected_region_count"], 3)

    def test_flood_uses_largest_region_coverage(self):
        low = assess_visual_severity(IncidentTypeEnum.flood, [detection("Flood", 0.07)])
        medium = assess_visual_severity(IncidentTypeEnum.flood, [detection("Flood", 0.25)])
        high = assess_visual_severity(IncidentTypeEnum.flood, [detection("Waterlogging", 0.60)])

        self.assertEqual(low.severity, SeverityEnum.low)
        self.assertEqual(medium.severity, SeverityEnum.medium)
        self.assertEqual(high.severity, SeverityEnum.high)

    def test_fire_and_smoke_classes_have_distinct_rules(self):
        smoke_only = assess_visual_severity(IncidentTypeEnum.fire, [detection("smoke", 0.8)])
        one_fire = assess_visual_severity(IncidentTypeEnum.fire, [detection("fire", 0.03)])
        multiple_fires = assess_visual_severity(
            IncidentTypeEnum.fire,
            [detection("fire", 0.02), detection("fire", 0.03)],
        )

        self.assertEqual(smoke_only.severity, SeverityEnum.low)
        self.assertEqual(one_fire.severity, SeverityEnum.medium)
        self.assertEqual(multiple_fires.severity, SeverityEnum.high)

    def test_confidence_alone_does_not_change_severity(self):
        lower_confidence = assess_visual_severity(
            IncidentTypeEnum.accident,
            [detection("Accident", 0.115, confidence=0.55)],
        )
        higher_confidence = assess_visual_severity(
            IncidentTypeEnum.accident,
            [detection("Accident", 0.115, confidence=0.90)],
        )

        self.assertEqual(lower_confidence.severity, SeverityEnum.medium)
        self.assertEqual(lower_confidence.severity, higher_confidence.severity)
        self.assertEqual(lower_confidence.reason, higher_confidence.reason)


if __name__ == "__main__":
    unittest.main()
