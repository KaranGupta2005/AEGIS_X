"""
AEGIS-X Cognitive State Dataset Generator
==========================================
Generates 5000 synthetic labeled samples (balanced across 6 classes) for training
the Random Forest cognitive state classifier.

States: calm, focused, distressed, panicked, coerced, robotic

Features (8):
    1. hesitation_ratio         (0-1)     — fraction of time spent idle
    2. correction_rate          (0-1)     — backspace/undo rate per character
    3. typing_speed_cps         (0.5-12)  — characters per second
    4. typing_rhythm_variance   (0.1-350) — inter-key timing variance in ms
    5. touch_duration_mean      (20-600)  — finger-on-screen time in ms
    6. gyroscope_variance       (0-0.15)  — device shake/movement
    7. interaction_intensity    (0-50)    — total events per 2-second window
    8. swipe_straightness       (0.2-1.0) — linearity of swipe paths
"""

import numpy as np
import pandas as pd
from pathlib import Path

np.random.seed(42)

OUTPUT_DIR = Path(__file__).parent.parent / "data" / "synthetic"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_FILE = OUTPUT_DIR / "cognitive_training_data.csv"

TOTAL_SAMPLES = 5000
N_STATES = 6
N_PER_STATE = TOTAL_SAMPLES // N_STATES  # 833 per state, remainder goes to edge cases

FEATURE_NAMES = [
    "hesitation_ratio",
    "correction_rate",
    "typing_speed_cps",
    "typing_rhythm_variance",
    "touch_duration_mean",
    "gyroscope_variance",
    "interaction_intensity",
    "swipe_straightness",
]

# Global feature bounds for clamping
FEATURE_BOUNDS = {
    "hesitation_ratio": (0.0, 1.0),
    "correction_rate": (0.0, 1.0),
    "typing_speed_cps": (0.5, 12.0),
    "typing_rhythm_variance": (0.1, 350.0),
    "touch_duration_mean": (20.0, 600.0),
    "gyroscope_variance": (0.0, 0.15),
    "interaction_intensity": (0.0, 50.0),
    "swipe_straightness": (0.2, 1.0),
}

# State-specific ranges: (min, max) for each feature
STATE_RANGES = {
    "calm": {
        "hesitation_ratio": (0.05, 0.15),
        "correction_rate": (0.02, 0.08),
        "typing_speed_cps": (2.5, 5.0),
        "typing_rhythm_variance": (20.0, 60.0),
        "touch_duration_mean": (80.0, 160.0),
        "gyroscope_variance": (0.008, 0.025),
        "interaction_intensity": (5.0, 12.0),
        "swipe_straightness": (0.75, 0.92),
    },
    "focused": {
        "hesitation_ratio": (0.02, 0.10),
        "correction_rate": (0.01, 0.05),
        "typing_speed_cps": (3.5, 6.0),
        "typing_rhythm_variance": (15.0, 45.0),
        "touch_duration_mean": (60.0, 130.0),
        "gyroscope_variance": (0.005, 0.018),
        "interaction_intensity": (8.0, 18.0),
        "swipe_straightness": (0.80, 0.95),
    },
    "distressed": {
        "hesitation_ratio": (0.20, 0.45),
        "correction_rate": (0.10, 0.25),
        "typing_speed_cps": (1.5, 3.5),
        "typing_rhythm_variance": (50.0, 150.0),
        "touch_duration_mean": (130.0, 250.0),
        "gyroscope_variance": (0.020, 0.050),
        "interaction_intensity": (3.0, 8.0),
        "swipe_straightness": (0.60, 0.80),
    },
    "panicked": {
        "hesitation_ratio": (0.40, 0.75),
        "correction_rate": (0.20, 0.50),
        "typing_speed_cps": (0.5, 2.0),
        "typing_rhythm_variance": (100.0, 300.0),
        "touch_duration_mean": (200.0, 450.0),
        "gyroscope_variance": (0.040, 0.090),
        "interaction_intensity": (1.0, 5.0),
        "swipe_straightness": (0.40, 0.70),
    },
    "coerced": {
        "hesitation_ratio": (0.50, 0.85),
        "correction_rate": (0.25, 0.60),
        "typing_speed_cps": (0.3, 1.5),
        "typing_rhythm_variance": (150.0, 350.0),
        "touch_duration_mean": (250.0, 550.0),
        "gyroscope_variance": (0.050, 0.120),
        "interaction_intensity": (1.0, 3.0),
        "swipe_straightness": (0.30, 0.65),
    },
    "robotic": {
        "hesitation_ratio": (0.00, 0.03),
        "correction_rate": (0.00, 0.02),
        "typing_speed_cps": (7.0, 12.0),
        "typing_rhythm_variance": (0.5, 5.0),
        "touch_duration_mean": (30.0, 60.0),
        "gyroscope_variance": (0.000, 0.003),
        "interaction_intensity": (15.0, 45.0),
        "swipe_straightness": (0.95, 1.00),
    },
}


def generate_samples_for_state(state: str, n: int) -> pd.DataFrame:
    """
    Generate n samples for a given cognitive state using uniform distribution
    within the specified range, then add Gaussian noise (5-10% of range).
    """
    ranges = STATE_RANGES[state]
    data = {}

    for feat in FEATURE_NAMES:
        lo, hi = ranges[feat]
        feat_range = hi - lo

        # Generate base samples uniformly within the range
        mid = (lo + hi) / 2.0
        spread = feat_range / 2.0
        # Use truncated normal centered in range for more realistic bell shape
        base = np.random.normal(mid, spread * 0.4, n)

        # Add Gaussian noise: 5-10% of feature range
        noise_scale = feat_range * np.random.uniform(0.05, 0.10)
        noise = np.random.normal(0, noise_scale, n)
        values = base + noise

        # Clamp to global feature bounds
        global_lo, global_hi = FEATURE_BOUNDS[feat]
        values = np.clip(values, global_lo, global_hi)

        data[feat] = values

    data["label"] = state
    return pd.DataFrame(data)


def generate_edge_cases(n: int) -> pd.DataFrame:
    """
    Generate edge-case samples that blur boundaries between adjacent states.
    These use interpolated features between two neighboring states.
    """
    # Adjacent state pairs that are hardest to distinguish
    boundary_pairs = [
        ("calm", "focused"),
        ("focused", "distressed"),
        ("distressed", "panicked"),
        ("panicked", "coerced"),
        ("calm", "robotic"),  # Low hesitation overlap
    ]

    samples_per_pair = n // len(boundary_pairs)
    remainder = n - samples_per_pair * len(boundary_pairs)
    frames = []

    for i, (state_a, state_b) in enumerate(boundary_pairs):
        count = samples_per_pair + (1 if i < remainder else 0)
        ranges_a = STATE_RANGES[state_a]
        ranges_b = STATE_RANGES[state_b]

        data = {}
        for feat in FEATURE_NAMES:
            lo_a, hi_a = ranges_a[feat]
            lo_b, hi_b = ranges_b[feat]

            # Interpolate: pick a blend factor near the boundary (0.4-0.6)
            blend = np.random.uniform(0.35, 0.65, count)

            mid_a = (lo_a + hi_a) / 2.0
            mid_b = (lo_b + hi_b) / 2.0
            spread_a = (hi_a - lo_a) / 2.0
            spread_b = (hi_b - lo_b) / 2.0

            # Blend centers and generate from the blended distribution
            blended_mid = mid_a * (1 - blend) + mid_b * blend
            blended_spread = spread_a * (1 - blend) + spread_b * blend

            values = np.random.normal(blended_mid, blended_spread * 0.3)

            # Add noise
            feat_range = max(hi_a - lo_a, hi_b - lo_b)
            noise = np.random.normal(0, feat_range * 0.07, count)
            values = values + noise

            # Clamp to global bounds
            global_lo, global_hi = FEATURE_BOUNDS[feat]
            values = np.clip(values, global_lo, global_hi)
            data[feat] = values

        # Assign label to the "more severe" state in the pair
        # (makes the model learn to err on the side of caution)
        data["label"] = state_b
        frames.append(pd.DataFrame(data))

    return pd.concat(frames, ignore_index=True)


def main():
    print("=" * 70)
    print("  AEGIS-X: Cognitive State Dataset Generation")
    print("=" * 70)
    print()

    # Calculate sample counts
    # 95% regular samples, 5% edge cases
    n_edge = int(TOTAL_SAMPLES * 0.05)  # 250 edge cases
    n_regular = TOTAL_SAMPLES - n_edge   # 4750 regular samples
    n_per_state = n_regular // N_STATES  # ~791 per state
    # Distribute remainder
    remainder = n_regular - (n_per_state * N_STATES)

    print(f"Total samples:     {TOTAL_SAMPLES}")
    print(f"Regular samples:   {n_regular} ({n_per_state} per state + {remainder} extra)")
    print(f"Edge cases:        {n_edge} (5% boundary-blurring samples)")
    print()

    # Generate regular samples for each state
    frames = []
    states = list(STATE_RANGES.keys())
    for i, state in enumerate(states):
        count = n_per_state + (1 if i < remainder else 0)
        df_state = generate_samples_for_state(state, count)
        frames.append(df_state)
        print(f"  Generated {count:>4} samples for: {state}")

    # Generate edge cases
    df_edge = generate_edge_cases(n_edge)
    frames.append(df_edge)
    print(f"  Generated {len(df_edge):>4} edge-case samples")

    # Combine and shuffle
    dataset = pd.concat(frames, ignore_index=True)
    dataset = dataset.sample(frac=1, random_state=42).reset_index(drop=True)

    # Verify total
    assert len(dataset) == TOTAL_SAMPLES, f"Expected {TOTAL_SAMPLES}, got {len(dataset)}"

    # Save
    dataset.to_csv(OUTPUT_FILE, index=False)

    print()
    print(f"Dataset shape: {dataset.shape}")
    print(f"\nClass distribution:")
    print(dataset["label"].value_counts().sort_index().to_string())
    print(f"\nFeature statistics (mean per state):")
    print("-" * 70)
    summary = dataset.groupby("label")[FEATURE_NAMES].mean().round(4)
    print(summary.to_string())
    print()
    print(f"Saved to: {OUTPUT_FILE.resolve()}")
    print()
    print("=" * 70)
    print("  Dataset generation complete!")
    print("=" * 70)


if __name__ == "__main__":
    main()
