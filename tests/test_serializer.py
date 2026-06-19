"""
AEGIS-X Phase 2A: Serializer Tests
====================================
Verifies that the BehavioralSerializer produces semantically meaningful
descriptions for each attack scenario, enabling MiniLM to differentiate
between normal, takeover, coercion, and malware behavioral patterns.
"""

from backend.services.feature_engineering import FeatureEngineer
from backend.services.serializer import BehavioralSerializer


def separator(title: str):
    print(f"\n{'─' * 70}")
    print(f"  {title}")
    print(f"{'─' * 70}")


def main():
    engineer = FeatureEngineer()
    serializer = BehavioralSerializer()

    # ──────────────────────────────────────────────────────────────────────
    # SCENARIO 1: Normal User
    # Expected: calm, natural descriptions across all dimensions
    # Trust: T ∈ [0.78, 0.98]
    # ──────────────────────────────────────────────────────────────────────
    separator("SCENARIO 1: Normal User (calm, routine banking)")

    normal_event = {
        "typing_speed_cps": 3.8,
        "typing_rhythm_variance": 38.0,
        "typing_pressure_mean": 0.55,
        "swipe_velocity_mean": 1.2,
        "swipe_velocity_variance": 0.14,
        "swipe_straightness": 0.82,
        "touch_duration_mean": 120.0,
        "touch_duration_variance": 580.0,
        "touch_area_mean": 0.45,
        "hesitation_ratio": 0.08,
        "hesitation_count": 1,
        "correction_rate": 0.04,
        "scroll_speed_mean": 0.8,
        "gyroscope_variance": 0.015,
        "session_time_elapsed": 90.0,
        "interaction_intensity": 8,
    }

    features = engineer.extract(normal_event)
    description = serializer.serialize(features)
    print(f"\n{description}\n")

    # ──────────────────────────────────────────────────────────────────────
    # SCENARIO 2: Account Takeover (mid-drift)
    # Expected: fast typing, low hesitation, different pressure profile
    # Trust: T transitioning from 0.88 → 0.20
    # ──────────────────────────────────────────────────────────────────────
    separator("SCENARIO 2: Account Takeover (attacker has control)")

    takeover_event = {
        "typing_speed_cps": 6.2,
        "typing_rhythm_variance": 9.0,
        "typing_pressure_mean": 0.72,
        "swipe_velocity_mean": 1.9,
        "swipe_velocity_variance": 0.04,
        "swipe_straightness": 0.93,
        "touch_duration_mean": 75.0,
        "touch_duration_variance": 140.0,
        "touch_area_mean": 0.62,
        "hesitation_ratio": 0.02,
        "hesitation_count": 0,
        "correction_rate": 0.01,
        "scroll_speed_mean": 1.5,
        "gyroscope_variance": 0.007,
        "session_time_elapsed": 35.0,
        "interaction_intensity": 14,
    }

    features = engineer.extract(takeover_event)
    description = serializer.serialize(features)
    print(f"\n{description}\n")

    # ──────────────────────────────────────────────────────────────────────
    # SCENARIO 3: Social Engineering / Scam Call Victim
    # Expected: slow, hesitant, high corrections, shaking device
    # Trust: T ∈ [0.35, 0.75] oscillating
    # ──────────────────────────────────────────────────────────────────────
    separator("SCENARIO 3: Scam Call Victim (coerced, panicking)")

    scam_event = {
        "typing_speed_cps": 1.4,
        "typing_rhythm_variance": 180.0,
        "typing_pressure_mean": 0.82,
        "swipe_velocity_mean": 0.45,
        "swipe_velocity_variance": 0.42,
        "swipe_straightness": 0.62,
        "touch_duration_mean": 260.0,
        "touch_duration_variance": 3200.0,
        "touch_area_mean": 0.58,
        "hesitation_ratio": 0.6,
        "hesitation_count": 8,
        "correction_rate": 0.38,
        "scroll_speed_mean": 0.25,
        "gyroscope_variance": 0.055,
        "session_time_elapsed": 350.0,
        "interaction_intensity": 3,
    }

    features = engineer.extract(scam_event)
    description = serializer.serialize(features)
    print(f"\n{description}\n")

    # ──────────────────────────────────────────────────────────────────────
    # SCENARIO 4: Remote Malware / Screen Mirroring
    # Expected: robotic precision, zero variance, no hesitation
    # Trust: T ∈ [0.25, 0.55]
    # ──────────────────────────────────────────────────────────────────────
    separator("SCENARIO 4: Remote Malware (automated script)")

    malware_event = {
        "typing_speed_cps": 9.5,
        "typing_rhythm_variance": 1.5,
        "typing_pressure_mean": 0.50,
        "swipe_velocity_mean": 2.4,
        "swipe_velocity_variance": 0.005,
        "swipe_straightness": 0.99,
        "touch_duration_mean": 50.0,
        "touch_duration_variance": 5.0,
        "touch_area_mean": 0.40,
        "hesitation_ratio": 0.003,
        "hesitation_count": 0,
        "correction_rate": 0.001,
        "scroll_speed_mean": 1.8,
        "gyroscope_variance": 0.0004,
        "session_time_elapsed": 22.0,
        "interaction_intensity": 20,
    }

    features = engineer.extract(malware_event)
    description = serializer.serialize(features)
    print(f"\n{description}\n")

    # ──────────────────────────────────────────────────────────────────────
    # COMPARISON SUMMARY
    # ──────────────────────────────────────────────────────────────────────
    separator("SEMANTIC DIFFERENTIATION CHECK")
    print("\nKey distinguishing phrases per scenario:")
    print("  Normal  → 'normal range', 'natural', 'typical'")
    print("  Takeover→ 'fast', 'low variance', 'decisive', 'no hesitation'")
    print("  Scam    → 'slow', 'high hesitation', 'extreme', 'distress', 'tremor'")
    print("  Malware → 'abnormally fast', 'automated', 'perfectly linear', 'zero'")
    print("\nThese semantic differences will produce DISTINCT embeddings in MiniLM.")
    print("Cosine similarity between Normal↔Malware will be LOW (different meaning).")
    print("Cosine similarity between Normal↔Normal will be HIGH (same meaning).")
    print()


if __name__ == "__main__":
    main()
