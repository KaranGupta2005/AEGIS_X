"""
AEGIS-X Cognitive State Dataset Generator V2
==============================================
Generates 25,000 synthetic labeled samples for training the cognitive state
classifier with significantly improved coverage:

1. WIDER DISTRIBUTIONS — more natural variance within each state
2. OVERLAPPING BOUNDARIES — realistic ambiguity between adjacent states
3. TEMPORAL SEQUENCES — progressive state transitions (calm→distressed→panicked)
4. REALISTIC NOISE — calm people who type fast, focused people who hesitate
5. DEMOGRAPHIC VARIANCE — different user archetypes (elderly, fast typist, etc.)
6. EDGE CASES — 15% boundary-blurring samples (up from 5%)
7. ADVERSARIAL EXAMPLES — subtle robotic behavior that mimics humans

States: calm, focused, distressed, panicked, coerced, robotic

Features (8):
    1. hesitation_ratio         (0-1)
    2. correction_rate          (0-1)
    3. typing_speed_cps         (0.5-12)
    4. typing_rhythm_variance   (0.1-350)
    5. touch_duration_mean      (20-600)
    6. gyroscope_variance       (0-0.15)
    7. interaction_intensity    (0-50)
    8. swipe_straightness       (0.2-1.0)
"""

import numpy as np
import pandas as pd
from pathlib import Path

np.random.seed(42)

OUTPUT_DIR = Path(__file__).parent.parent / "data" / "synthetic"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_FILE = OUTPUT_DIR / "cognitive_training_data.csv"

TOTAL_SAMPLES = 25000
N_STATES = 6

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

# ═══════════════════════════════════════════════════════════════════════════════
# STATE DISTRIBUTIONS — V2: WIDER, MORE REALISTIC, WITH OVERLAP
# ═══════════════════════════════════════════════════════════════════════════════
# Each state now has:
#   - mean/std (Gaussian core)
#   - outlier_fraction: % of samples that are realistic outliers
#   - outlier_shift: how far outliers deviate from the mean

STATE_PARAMS = {
    "calm": {
        "hesitation_ratio":       {"mean": 0.09, "std": 0.05, "outlier_shift": 0.08},
        "correction_rate":        {"mean": 0.04, "std": 0.03, "outlier_shift": 0.05},
        "typing_speed_cps":       {"mean": 3.5,  "std": 1.0,  "outlier_shift": 1.5},
        "typing_rhythm_variance": {"mean": 38.0, "std": 18.0, "outlier_shift": 25.0},
        "touch_duration_mean":    {"mean": 115.0,"std": 35.0, "outlier_shift": 45.0},
        "gyroscope_variance":     {"mean": 0.015,"std": 0.008,"outlier_shift": 0.012},
        "interaction_intensity":  {"mean": 8.0,  "std": 3.5,  "outlier_shift": 5.0},
        "swipe_straightness":     {"mean": 0.83, "std": 0.07, "outlier_shift": 0.10},
    },
    "focused": {
        "hesitation_ratio":       {"mean": 0.05, "std": 0.04, "outlier_shift": 0.06},
        "correction_rate":        {"mean": 0.025,"std": 0.02, "outlier_shift": 0.04},
        "typing_speed_cps":       {"mean": 4.8,  "std": 1.2,  "outlier_shift": 1.8},
        "typing_rhythm_variance": {"mean": 28.0, "std": 14.0, "outlier_shift": 20.0},
        "touch_duration_mean":    {"mean": 88.0, "std": 30.0, "outlier_shift": 40.0},
        "gyroscope_variance":     {"mean": 0.010,"std": 0.006,"outlier_shift": 0.010},
        "interaction_intensity":  {"mean": 13.0, "std": 4.5,  "outlier_shift": 6.0},
        "swipe_straightness":     {"mean": 0.87, "std": 0.06, "outlier_shift": 0.09},
    },
    "distressed": {
        "hesitation_ratio":       {"mean": 0.32, "std": 0.10, "outlier_shift": 0.12},
        "correction_rate":        {"mean": 0.16, "std": 0.07, "outlier_shift": 0.09},
        "typing_speed_cps":       {"mean": 2.4,  "std": 0.8,  "outlier_shift": 1.0},
        "typing_rhythm_variance": {"mean": 95.0, "std": 35.0, "outlier_shift": 45.0},
        "touch_duration_mean":    {"mean": 185.0,"std": 50.0, "outlier_shift": 60.0},
        "gyroscope_variance":     {"mean": 0.035,"std": 0.012,"outlier_shift": 0.015},
        "interaction_intensity":  {"mean": 5.5,  "std": 2.5,  "outlier_shift": 3.0},
        "swipe_straightness":     {"mean": 0.70, "std": 0.09, "outlier_shift": 0.12},
    },
    "panicked": {
        "hesitation_ratio":       {"mean": 0.55, "std": 0.14, "outlier_shift": 0.15},
        "correction_rate":        {"mean": 0.33, "std": 0.12, "outlier_shift": 0.14},
        "typing_speed_cps":       {"mean": 1.3,  "std": 0.5,  "outlier_shift": 0.7},
        "typing_rhythm_variance": {"mean": 185.0,"std": 60.0, "outlier_shift": 70.0},
        "touch_duration_mean":    {"mean": 310.0,"std": 70.0, "outlier_shift": 80.0},
        "gyroscope_variance":     {"mean": 0.065,"std": 0.020,"outlier_shift": 0.025},
        "interaction_intensity":  {"mean": 3.0,  "std": 1.5,  "outlier_shift": 2.0},
        "swipe_straightness":     {"mean": 0.55, "std": 0.11, "outlier_shift": 0.13},
    },
    "coerced": {
        "hesitation_ratio":       {"mean": 0.68, "std": 0.13, "outlier_shift": 0.14},
        "correction_rate":        {"mean": 0.42, "std": 0.13, "outlier_shift": 0.15},
        "typing_speed_cps":       {"mean": 0.8,  "std": 0.4,  "outlier_shift": 0.5},
        "typing_rhythm_variance": {"mean": 250.0,"std": 65.0, "outlier_shift": 70.0},
        "touch_duration_mean":    {"mean": 400.0,"std": 85.0, "outlier_shift": 90.0},
        "gyroscope_variance":     {"mean": 0.085,"std": 0.025,"outlier_shift": 0.030},
        "interaction_intensity":  {"mean": 1.8,  "std": 1.0,  "outlier_shift": 1.2},
        "swipe_straightness":     {"mean": 0.42, "std": 0.10, "outlier_shift": 0.12},
    },
    "robotic": {
        "hesitation_ratio":       {"mean": 0.008,"std": 0.008,"outlier_shift": 0.015},
        "correction_rate":        {"mean": 0.005,"std": 0.005,"outlier_shift": 0.010},
        "typing_speed_cps":       {"mean": 9.5,  "std": 1.2,  "outlier_shift": 1.5},
        "typing_rhythm_variance": {"mean": 2.5,  "std": 1.8,  "outlier_shift": 3.0},
        "touch_duration_mean":    {"mean": 45.0, "std": 10.0, "outlier_shift": 15.0},
        "gyroscope_variance":     {"mean": 0.001,"std": 0.001,"outlier_shift": 0.002},
        "interaction_intensity":  {"mean": 22.0, "std": 8.0,  "outlier_shift": 10.0},
        "swipe_straightness":     {"mean": 0.97, "std": 0.02, "outlier_shift": 0.03},
    },
}

# ═══════════════════════════════════════════════════════════════════════════════
# USER ARCHETYPES — different "normal" looks different for different people
# ═══════════════════════════════════════════════════════════════════════════════

ARCHETYPES = {
    "elderly_user": {
        # Elderly users: slower typing, more hesitation even when calm
        "hesitation_ratio": +0.06,
        "correction_rate": +0.03,
        "typing_speed_cps": -1.2,
        "typing_rhythm_variance": +15.0,
        "touch_duration_mean": +40.0,
        "gyroscope_variance": +0.008,
        "interaction_intensity": -2.0,
        "swipe_straightness": -0.05,
    },
    "power_user": {
        # Power users: fast typing, low hesitation, high intensity
        "hesitation_ratio": -0.03,
        "correction_rate": -0.01,
        "typing_speed_cps": +1.8,
        "typing_rhythm_variance": -10.0,
        "touch_duration_mean": -25.0,
        "gyroscope_variance": -0.003,
        "interaction_intensity": +5.0,
        "swipe_straightness": +0.04,
    },
    "anxious_baseline": {
        # Naturally anxious people: higher baseline hesitation/variance
        "hesitation_ratio": +0.08,
        "correction_rate": +0.04,
        "typing_speed_cps": -0.5,
        "typing_rhythm_variance": +20.0,
        "touch_duration_mean": +20.0,
        "gyroscope_variance": +0.010,
        "interaction_intensity": -1.0,
        "swipe_straightness": -0.03,
    },
    "mobile_commuter": {
        # Using phone while moving: high gyroscope, erratic touch
        "hesitation_ratio": +0.02,
        "correction_rate": +0.02,
        "typing_speed_cps": -0.3,
        "typing_rhythm_variance": +12.0,
        "touch_duration_mean": +10.0,
        "gyroscope_variance": +0.025,
        "interaction_intensity": +0.0,
        "swipe_straightness": -0.08,
    },
    "one_handed": {
        # One-handed operation: slower, less accurate
        "hesitation_ratio": +0.04,
        "correction_rate": +0.03,
        "typing_speed_cps": -0.8,
        "typing_rhythm_variance": +8.0,
        "touch_duration_mean": +15.0,
        "gyroscope_variance": +0.005,
        "interaction_intensity": -1.5,
        "swipe_straightness": -0.06,
    },
}

# ═══════════════════════════════════════════════════════════════════════════════
# GENERATION FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

def generate_core_samples(state: str, n: int, outlier_fraction: float = 0.12) -> pd.DataFrame:
    """
    Generate samples from a Gaussian core with realistic outliers.
    
    12% of samples are "outliers" — people who naturally deviate from the
    typical range for their cognitive state. This prevents the model from
    learning overly tight decision boundaries.
    """
    params = STATE_PARAMS[state]
    n_outliers = int(n * outlier_fraction)
    n_core = n - n_outliers
    
    data = {}
    for feat in FEATURE_NAMES:
        p = params[feat]
        
        # Core samples: Gaussian with specified mean/std
        core = np.random.normal(p["mean"], p["std"], n_core)
        
        # Outlier samples: shifted mean (both directions)
        outlier_direction = np.random.choice([-1, 1], size=n_outliers)
        outlier_base = np.random.normal(
            p["mean"], p["std"] * 0.7, n_outliers
        )
        outlier_values = outlier_base + outlier_direction * p["outlier_shift"]
        
        # Combine
        values = np.concatenate([core, outlier_values])
        
        # Clamp to global bounds
        lo, hi = FEATURE_BOUNDS[feat]
        values = np.clip(values, lo, hi)
        data[feat] = values
    
    data["label"] = state
    return pd.DataFrame(data)


def generate_archetype_samples(state: str, n: int) -> pd.DataFrame:
    """
    Generate samples modified by user archetypes.
    Each archetype shifts the base distribution to represent
    different types of real users in the same cognitive state.
    """
    params = STATE_PARAMS[state]
    archetype_names = list(ARCHETYPES.keys())
    samples_per_archetype = n // len(archetype_names)
    remainder = n - samples_per_archetype * len(archetype_names)
    
    frames = []
    for i, arch_name in enumerate(archetype_names):
        count = samples_per_archetype + (1 if i < remainder else 0)
        arch_shift = ARCHETYPES[arch_name]
        
        data = {}
        for feat in FEATURE_NAMES:
            p = params[feat]
            shift = arch_shift.get(feat, 0.0)
            # Shifted Gaussian
            values = np.random.normal(p["mean"] + shift, p["std"] * 1.1, count)
            lo, hi = FEATURE_BOUNDS[feat]
            values = np.clip(values, lo, hi)
            data[feat] = values
        
        data["label"] = state
        frames.append(pd.DataFrame(data))
    
    return pd.concat(frames, ignore_index=True)


def generate_transition_sequences(n: int) -> pd.DataFrame:
    """
    Generate samples that represent TRANSITIONS between cognitive states.
    
    In real life, a user doesn't jump from calm to panicked instantly.
    They transition through intermediate states. These samples capture
    the "in-between" moments where classification is hardest.
    
    Transitions modeled:
        calm → focused → distressed → panicked → coerced (escalation)
        calm → robotic (sudden takeover)
        focused → distressed (mild stress onset)
        panicked → calm (recovery after false alarm)
    """
    TRANSITIONS = [
        ("calm", "focused", 0.15),
        ("calm", "distressed", 0.10),
        ("focused", "distressed", 0.20),
        ("distressed", "panicked", 0.20),
        ("panicked", "coerced", 0.15),
        ("calm", "robotic", 0.05),
        ("focused", "robotic", 0.05),
        ("panicked", "calm", 0.05),  # recovery
        ("coerced", "panicked", 0.05),  # de-escalation
    ]
    
    frames = []
    for state_a, state_b, fraction in TRANSITIONS:
        count = int(n * fraction)
        params_a = STATE_PARAMS[state_a]
        params_b = STATE_PARAMS[state_b]
        
        # Generate blend factors between 0.2 and 0.8 (the ambiguous zone)
        blend = np.random.beta(2.5, 2.5, count)  # concentrated around 0.5
        blend = blend * 0.6 + 0.2  # shift to [0.2, 0.8]
        
        data = {}
        for feat in FEATURE_NAMES:
            pa = params_a[feat]
            pb = params_b[feat]
            
            # Interpolate between the two state distributions
            means = pa["mean"] * (1 - blend) + pb["mean"] * blend
            stds = pa["std"] * (1 - blend) + pb["std"] * blend
            
            values = np.random.normal(means, stds * 0.8)
            lo, hi = FEATURE_BOUNDS[feat]
            values = np.clip(values, lo, hi)
            data[feat] = values
        
        # Label assignment: if blend > 0.5, assign the "more severe" state
        # This makes the model err on the side of caution
        labels = np.where(blend > 0.5, state_b, state_a)
        data["label"] = labels
        frames.append(pd.DataFrame(data))
    
    return pd.concat(frames, ignore_index=True)


def generate_subtle_robotic(n: int) -> pd.DataFrame:
    """
    Generate SUBTLE robotic samples that mimic human behavior.
    
    Sophisticated bots try to look human. They add artificial jitter,
    introduce fake hesitations, and vary their timing. But they still
    have telltale signs: too-regular variance patterns, slightly-too-perfect
    straightness, and periodicity in their "randomness."
    
    These are the hardest samples for the model — a bot pretending to be calm.
    """
    data = {}
    
    # Mimicking calm/focused but with subtle robotic signatures
    data["hesitation_ratio"] = np.random.beta(1.5, 15, n).clip(0.0, 0.15)
    data["correction_rate"] = np.random.exponential(0.015, n).clip(0.0, 0.06)
    # Speed: human-like range but suspiciously consistent (low std)
    data["typing_speed_cps"] = np.random.normal(4.2, 0.4, n).clip(2.5, 6.0)
    # Rhythm: too-low variance (mechanical regularity masked by fake jitter)
    data["typing_rhythm_variance"] = np.random.gamma(2, 4, n).clip(1.0, 25.0)
    # Touch: consistent (simulated touch)
    data["touch_duration_mean"] = np.random.normal(80, 8, n).clip(50, 120)
    # Gyroscope: very low (phone on desk) but with small fake movement
    data["gyroscope_variance"] = np.random.exponential(0.003, n).clip(0.0, 0.015)
    # Intensity: moderate-high (bots are efficient)
    data["interaction_intensity"] = np.random.normal(14, 3, n).clip(8, 25)
    # Swipe: too straight (programmatic gestures with noise added)
    data["swipe_straightness"] = np.random.normal(0.93, 0.03, n).clip(0.85, 1.0)
    
    data["label"] = "robotic"
    return pd.DataFrame(data)


def generate_stressed_normal(n: int) -> pd.DataFrame:
    """
    Generate samples of CALM users who naturally exhibit stress-like features.
    
    Real-world scenarios:
    - Person in a hurry (higher speed, less accuracy)
    - Cold hands (higher gyroscope, slower touch)
    - Distracted by environment (higher hesitation but still calm state)
    - First-time app user (confused but not stressed)
    
    These should be labeled CALM/FOCUSED despite having elevated metrics.
    The model must learn that elevated metrics alone don't mean distress.
    """
    # Split evenly between calm and focused
    n_calm = n // 2
    n_focused = n - n_calm
    
    frames = []
    
    # Calm people with elevated hesitation (thinking, multitasking)
    data_calm = {}
    data_calm["hesitation_ratio"] = np.random.normal(0.18, 0.06, n_calm).clip(0.05, 0.35)
    data_calm["correction_rate"] = np.random.normal(0.08, 0.03, n_calm).clip(0.01, 0.15)
    data_calm["typing_speed_cps"] = np.random.normal(3.0, 0.8, n_calm).clip(1.5, 5.0)
    data_calm["typing_rhythm_variance"] = np.random.normal(55, 20, n_calm).clip(15, 100)
    data_calm["touch_duration_mean"] = np.random.normal(140, 30, n_calm).clip(80, 220)
    data_calm["gyroscope_variance"] = np.random.normal(0.022, 0.008, n_calm).clip(0.005, 0.045)
    data_calm["interaction_intensity"] = np.random.normal(6, 2.5, n_calm).clip(2, 14)
    data_calm["swipe_straightness"] = np.random.normal(0.77, 0.07, n_calm).clip(0.55, 0.90)
    data_calm["label"] = "calm"
    frames.append(pd.DataFrame(data_calm))
    
    # Focused power users with high speed that looks robotic-ish
    data_foc = {}
    data_foc["hesitation_ratio"] = np.random.beta(1.5, 20, n_focused).clip(0.0, 0.08)
    data_foc["correction_rate"] = np.random.beta(1.5, 30, n_focused).clip(0.0, 0.05)
    data_foc["typing_speed_cps"] = np.random.normal(5.8, 0.9, n_focused).clip(4.0, 8.0)
    data_foc["typing_rhythm_variance"] = np.random.normal(18, 8, n_focused).clip(5, 40)
    data_foc["touch_duration_mean"] = np.random.normal(70, 15, n_focused).clip(40, 110)
    data_foc["gyroscope_variance"] = np.random.normal(0.008, 0.004, n_focused).clip(0.002, 0.020)
    data_foc["interaction_intensity"] = np.random.normal(16, 4, n_focused).clip(8, 28)
    data_foc["swipe_straightness"] = np.random.normal(0.90, 0.04, n_focused).clip(0.80, 0.97)
    data_foc["label"] = "focused"
    frames.append(pd.DataFrame(data_foc))
    
    return pd.concat(frames, ignore_index=True)


def generate_coercion_variants(n: int) -> pd.DataFrame:
    """
    Generate diverse coercion/panic sub-types that occur in the real world.
    
    Variants:
    1. Phone scam (classic): high hesitation, slow typing, shaking
    2. Shoulder surfing: fast compliance, low hesitation (fear-driven speed)
    3. Romance scam: mixed signals — compliant but with guilt pauses
    4. Authority impersonation: moderate distress, compliance bursts
    5. Family emergency scam: extreme panic + high urgency actions
    """
    samples_per_variant = n // 5
    remainder = n - samples_per_variant * 5
    frames = []
    
    # Variant 1: Classic phone scam (high hesitation, shaking)
    n1 = samples_per_variant + (1 if 0 < remainder else 0)
    d1 = {
        "hesitation_ratio": np.random.normal(0.72, 0.10, n1).clip(0.40, 0.95),
        "correction_rate": np.random.normal(0.45, 0.12, n1).clip(0.15, 0.75),
        "typing_speed_cps": np.random.normal(0.7, 0.3, n1).clip(0.3, 1.5),
        "typing_rhythm_variance": np.random.normal(270, 55, n1).clip(150, 350),
        "touch_duration_mean": np.random.normal(420, 80, n1).clip(250, 600),
        "gyroscope_variance": np.random.normal(0.090, 0.025, n1).clip(0.04, 0.15),
        "interaction_intensity": np.random.normal(1.5, 0.8, n1).clip(0, 4),
        "swipe_straightness": np.random.normal(0.38, 0.08, n1).clip(0.20, 0.60),
        "label": "coerced",
    }
    frames.append(pd.DataFrame(d1))
    
    # Variant 2: Shoulder surfing / physical threat (fast compliance)
    n2 = samples_per_variant + (1 if 1 < remainder else 0)
    d2 = {
        "hesitation_ratio": np.random.normal(0.15, 0.08, n2).clip(0.02, 0.35),
        "correction_rate": np.random.normal(0.10, 0.05, n2).clip(0.01, 0.25),
        "typing_speed_cps": np.random.normal(4.5, 1.0, n2).clip(2.5, 7.0),
        "typing_rhythm_variance": np.random.normal(65, 25, n2).clip(20, 130),
        "touch_duration_mean": np.random.normal(95, 25, n2).clip(50, 160),
        "gyroscope_variance": np.random.normal(0.050, 0.020, n2).clip(0.02, 0.10),
        "interaction_intensity": np.random.normal(14, 4, n2).clip(6, 25),
        "swipe_straightness": np.random.normal(0.75, 0.08, n2).clip(0.55, 0.92),
        "label": "coerced",
    }
    frames.append(pd.DataFrame(d2))
    
    # Variant 3: Romance/trust scam (mixed signals, guilt pauses)
    n3 = samples_per_variant + (1 if 2 < remainder else 0)
    d3 = {
        "hesitation_ratio": np.random.normal(0.50, 0.15, n3).clip(0.20, 0.80),
        "correction_rate": np.random.normal(0.30, 0.12, n3).clip(0.08, 0.55),
        "typing_speed_cps": np.random.normal(1.8, 0.7, n3).clip(0.5, 3.5),
        "typing_rhythm_variance": np.random.normal(140, 50, n3).clip(50, 280),
        "touch_duration_mean": np.random.normal(280, 70, n3).clip(130, 450),
        "gyroscope_variance": np.random.normal(0.040, 0.015, n3).clip(0.015, 0.080),
        "interaction_intensity": np.random.normal(4, 2, n3).clip(1, 10),
        "swipe_straightness": np.random.normal(0.58, 0.10, n3).clip(0.35, 0.80),
        "label": "coerced",
    }
    frames.append(pd.DataFrame(d3))
    
    # Variant 4: Authority impersonation (moderate stress, compliance bursts)
    n4 = samples_per_variant + (1 if 3 < remainder else 0)
    d4 = {
        "hesitation_ratio": np.random.normal(0.40, 0.12, n4).clip(0.15, 0.65),
        "correction_rate": np.random.normal(0.22, 0.08, n4).clip(0.06, 0.40),
        "typing_speed_cps": np.random.normal(2.2, 0.8, n4).clip(0.8, 4.0),
        "typing_rhythm_variance": np.random.normal(120, 40, n4).clip(50, 220),
        "touch_duration_mean": np.random.normal(220, 60, n4).clip(100, 380),
        "gyroscope_variance": np.random.normal(0.055, 0.018, n4).clip(0.02, 0.10),
        "interaction_intensity": np.random.normal(5, 2.5, n4).clip(1, 12),
        "swipe_straightness": np.random.normal(0.55, 0.10, n4).clip(0.30, 0.78),
        "label": "coerced",
    }
    frames.append(pd.DataFrame(d4))
    
    # Variant 5: Family emergency scam (extreme panic + urgency)
    n5 = samples_per_variant + (1 if 4 < remainder else 0)
    d5 = {
        "hesitation_ratio": np.random.normal(0.60, 0.12, n5).clip(0.30, 0.85),
        "correction_rate": np.random.normal(0.50, 0.14, n5).clip(0.20, 0.80),
        "typing_speed_cps": np.random.normal(1.0, 0.4, n5).clip(0.3, 2.0),
        "typing_rhythm_variance": np.random.normal(300, 50, n5).clip(180, 350),
        "touch_duration_mean": np.random.normal(380, 90, n5).clip(200, 580),
        "gyroscope_variance": np.random.normal(0.100, 0.030, n5).clip(0.04, 0.15),
        "interaction_intensity": np.random.normal(2.5, 1.2, n5).clip(0, 6),
        "swipe_straightness": np.random.normal(0.35, 0.08, n5).clip(0.20, 0.55),
        "label": "panicked",  # This variant labeled panicked (borderline coercion)
    }
    frames.append(pd.DataFrame(d5))
    
    return pd.concat(frames, ignore_index=True)


def generate_time_of_day_variants(n: int) -> pd.DataFrame:
    """
    Generate samples reflecting time-of-day behavioral shifts.
    
    Real users behave differently at different times:
    - Late night: slower, more errors, longer touches (drowsy)
    - Morning rush: faster but less accurate
    - Post-lunch: slightly slower, more hesitation (food coma)
    
    All still labeled calm/focused — the model must learn these are normal.
    """
    n_per = n // 3
    remainder = n - n_per * 3
    frames = []
    
    # Late night drowsy (still calm, just tired)
    n1 = n_per + (1 if 0 < remainder else 0)
    d1 = {
        "hesitation_ratio": np.random.normal(0.14, 0.05, n1).clip(0.03, 0.28),
        "correction_rate": np.random.normal(0.07, 0.03, n1).clip(0.01, 0.15),
        "typing_speed_cps": np.random.normal(2.5, 0.7, n1).clip(1.2, 4.5),
        "typing_rhythm_variance": np.random.normal(52, 18, n1).clip(15, 95),
        "touch_duration_mean": np.random.normal(150, 35, n1).clip(80, 240),
        "gyroscope_variance": np.random.normal(0.012, 0.006, n1).clip(0.003, 0.030),
        "interaction_intensity": np.random.normal(5, 2, n1).clip(1, 11),
        "swipe_straightness": np.random.normal(0.78, 0.06, n1).clip(0.60, 0.92),
        "label": "calm",
    }
    frames.append(pd.DataFrame(d1))
    
    # Morning rush (focused but hurried)
    n2 = n_per + (1 if 1 < remainder else 0)
    d2 = {
        "hesitation_ratio": np.random.normal(0.04, 0.03, n2).clip(0.0, 0.12),
        "correction_rate": np.random.normal(0.05, 0.03, n2).clip(0.0, 0.12),
        "typing_speed_cps": np.random.normal(5.2, 1.0, n2).clip(3.0, 7.5),
        "typing_rhythm_variance": np.random.normal(30, 12, n2).clip(10, 60),
        "touch_duration_mean": np.random.normal(75, 18, n2).clip(40, 120),
        "gyroscope_variance": np.random.normal(0.020, 0.008, n2).clip(0.005, 0.040),
        "interaction_intensity": np.random.normal(14, 4, n2).clip(6, 25),
        "swipe_straightness": np.random.normal(0.85, 0.05, n2).clip(0.72, 0.95),
        "label": "focused",
    }
    frames.append(pd.DataFrame(d2))
    
    # Post-lunch sluggish (calm, slightly slower)
    n3 = n_per + (1 if 2 < remainder else 0)
    d3 = {
        "hesitation_ratio": np.random.normal(0.12, 0.05, n3).clip(0.03, 0.25),
        "correction_rate": np.random.normal(0.05, 0.025, n3).clip(0.01, 0.12),
        "typing_speed_cps": np.random.normal(3.0, 0.7, n3).clip(1.8, 4.8),
        "typing_rhythm_variance": np.random.normal(45, 15, n3).clip(15, 80),
        "touch_duration_mean": np.random.normal(130, 28, n3).clip(75, 200),
        "gyroscope_variance": np.random.normal(0.013, 0.005, n3).clip(0.004, 0.028),
        "interaction_intensity": np.random.normal(7, 2.5, n3).clip(2, 14),
        "swipe_straightness": np.random.normal(0.81, 0.06, n3).clip(0.65, 0.93),
        "label": "calm",
    }
    frames.append(pd.DataFrame(d3))
    
    return pd.concat(frames, ignore_index=True)


def generate_distress_spectrum(n: int) -> pd.DataFrame:
    """
    Generate a continuous spectrum of distress that spans from mild
    frustration to genuine panic. This fills the gap between calm and panicked.
    
    Scenarios:
    - App crash frustration (mild distress, resolves quickly)
    - Failed OTP (moderate distress with confusion)
    - Unexpected large deduction (shock → distress)
    - Network error during payment (anxiety with anger)
    - Account locked notification (escalating worry)
    """
    # Create a continuous stress gradient from 0.0 to 1.0
    stress = np.random.beta(2, 2, n)  # centered distribution
    
    # Map stress to features with nonlinear curves
    data = {
        "hesitation_ratio": (0.10 + stress * 0.50 + np.random.normal(0, 0.05, n)).clip(0.0, 0.80),
        "correction_rate": (0.05 + stress * 0.35 + np.random.normal(0, 0.04, n)).clip(0.0, 0.60),
        "typing_speed_cps": (4.0 - stress * 2.8 + np.random.normal(0, 0.5, n)).clip(0.5, 6.0),
        "typing_rhythm_variance": (30 + stress * 200 + np.random.normal(0, 20, n)).clip(5, 320),
        "touch_duration_mean": (100 + stress * 250 + np.random.normal(0, 30, n)).clip(50, 500),
        "gyroscope_variance": (0.012 + stress * 0.065 + np.random.normal(0, 0.008, n)).clip(0.0, 0.12),
        "interaction_intensity": (10 - stress * 7 + np.random.normal(0, 2, n)).clip(0, 20),
        "swipe_straightness": (0.88 - stress * 0.40 + np.random.normal(0, 0.05, n)).clip(0.25, 0.98),
    }
    
    # Assign labels based on stress level
    labels = np.where(
        stress < 0.25, "calm",
        np.where(
            stress < 0.45, "distressed",
            np.where(
                stress < 0.70, "panicked",
                "coerced"
            )
        )
    )
    data["label"] = labels
    
    return pd.DataFrame(data)


# ═══════════════════════════════════════════════════════════════════════════════
# MAIN GENERATION PIPELINE
# ═══════════════════════════════════════════════════════════════════════════════

def main():
    print("=" * 70)
    print("  AEGIS-X: Cognitive State Dataset V2 Generation")
    print("  Target: 25,000 samples with wide coverage")
    print("=" * 70)
    print()

    # ─── ALLOCATION ─────────────────────────────────────────────────────
    # 50% core samples (Gaussian + outliers) — 12,500
    # 15% archetype-modified samples — 3,750
    # 15% transition/boundary samples — 3,750
    # 5%  subtle robotic — 1,250
    # 5%  stressed-but-normal — 1,250
    # 5%  coercion variants — 1,250
    # 3%  time-of-day variants — 750
    # 2%  distress spectrum — 500
    
    N_CORE = 12500
    N_ARCHETYPE = 3750
    N_TRANSITION = 3750
    N_SUBTLE_ROBOTIC = 1250
    N_STRESSED_NORMAL = 1250
    N_COERCION_VARIANTS = 1250
    N_TIME_VARIANTS = 750
    N_DISTRESS_SPECTRUM = 500
    
    total_planned = (N_CORE + N_ARCHETYPE + N_TRANSITION + N_SUBTLE_ROBOTIC +
                     N_STRESSED_NORMAL + N_COERCION_VARIANTS + N_TIME_VARIANTS +
                     N_DISTRESS_SPECTRUM)
    
    print(f"  Planned allocation: {total_planned:,} samples")
    print(f"  Core samples:           {N_CORE:>6,} (50%)")
    print(f"  Archetype variants:     {N_ARCHETYPE:>6,} (15%)")
    print(f"  Transition sequences:   {N_TRANSITION:>6,} (15%)")
    print(f"  Subtle robotic:         {N_SUBTLE_ROBOTIC:>6,} (5%)")
    print(f"  Stressed-but-normal:    {N_STRESSED_NORMAL:>6,} (5%)")
    print(f"  Coercion variants:      {N_COERCION_VARIANTS:>6,} (5%)")
    print(f"  Time-of-day variants:   {N_TIME_VARIANTS:>6,} (3%)")
    print(f"  Distress spectrum:      {N_DISTRESS_SPECTRUM:>6,} (2%)")
    print()

    frames = []
    
    # 1. Core samples (balanced across 6 states)
    print("[1/8] Generating core samples with outliers...")
    n_per_state = N_CORE // N_STATES
    core_remainder = N_CORE - n_per_state * N_STATES
    for i, state in enumerate(STATE_PARAMS.keys()):
        count = n_per_state + (1 if i < core_remainder else 0)
        df = generate_core_samples(state, count, outlier_fraction=0.12)
        frames.append(df)
        print(f"    {state:<12} → {len(df):>5} samples")
    
    # 2. Archetype-modified samples
    print("[2/8] Generating archetype-modified samples...")
    n_arch_per_state = N_ARCHETYPE // N_STATES
    arch_remainder = N_ARCHETYPE - n_arch_per_state * N_STATES
    for i, state in enumerate(STATE_PARAMS.keys()):
        count = n_arch_per_state + (1 if i < arch_remainder else 0)
        df = generate_archetype_samples(state, count)
        frames.append(df)
        print(f"    {state:<12} → {len(df):>5} archetype samples")
    
    # 3. Transition sequences
    print("[3/8] Generating transition/boundary samples...")
    df_transitions = generate_transition_sequences(N_TRANSITION)
    frames.append(df_transitions)
    print(f"    Generated {len(df_transitions)} transition samples")
    
    # 4. Subtle robotic
    print("[4/8] Generating subtle robotic (human-mimicking bots)...")
    df_subtle = generate_subtle_robotic(N_SUBTLE_ROBOTIC)
    frames.append(df_subtle)
    print(f"    Generated {len(df_subtle)} subtle robotic samples")
    
    # 5. Stressed-but-normal
    print("[5/8] Generating stressed-but-normal samples...")
    df_stressed_normal = generate_stressed_normal(N_STRESSED_NORMAL)
    frames.append(df_stressed_normal)
    print(f"    Generated {len(df_stressed_normal)} stressed-but-normal samples")
    
    # 6. Coercion variants
    print("[6/8] Generating coercion attack variants...")
    df_coercion = generate_coercion_variants(N_COERCION_VARIANTS)
    frames.append(df_coercion)
    print(f"    Generated {len(df_coercion)} coercion variant samples")
    
    # 7. Time-of-day variants
    print("[7/8] Generating time-of-day behavioral shifts...")
    df_time = generate_time_of_day_variants(N_TIME_VARIANTS)
    frames.append(df_time)
    print(f"    Generated {len(df_time)} time-of-day samples")
    
    # 8. Distress spectrum
    print("[8/8] Generating continuous distress spectrum...")
    df_distress = generate_distress_spectrum(N_DISTRESS_SPECTRUM)
    frames.append(df_distress)
    print(f"    Generated {len(df_distress)} distress spectrum samples")

    # ─── COMBINE & VALIDATE ─────────────────────────────────────────────
    print()
    print("Combining and shuffling...")
    dataset = pd.concat(frames, ignore_index=True)
    
    # Ensure exact target size (trim if over, which can happen from rounding)
    if len(dataset) > TOTAL_SAMPLES:
        dataset = dataset.sample(n=TOTAL_SAMPLES, random_state=42).reset_index(drop=True)
    elif len(dataset) < TOTAL_SAMPLES:
        # Fill remainder with additional core samples
        deficit = TOTAL_SAMPLES - len(dataset)
        extra = generate_core_samples("calm", deficit, outlier_fraction=0.15)
        dataset = pd.concat([dataset, extra], ignore_index=True)
    
    # Final shuffle
    dataset = dataset.sample(frac=1, random_state=42).reset_index(drop=True)
    
    # Final bounds enforcement (safety net)
    for feat in FEATURE_NAMES:
        lo, hi = FEATURE_BOUNDS[feat]
        dataset[feat] = dataset[feat].clip(lo, hi)
    
    # ─── STATISTICS ──────────────────────────────────────────────────────
    print()
    print("=" * 70)
    print("  GENERATION COMPLETE")
    print("=" * 70)
    print(f"\n  Total samples: {len(dataset):,}")
    print(f"\n  Class distribution:")
    dist = dataset["label"].value_counts().sort_index()
    for state, count in dist.items():
        pct = count / len(dataset) * 100
        bar = "█" * int(pct / 2)
        print(f"    {state:<12} {count:>5,} ({pct:>5.1f}%)  {bar}")
    
    print(f"\n  Feature statistics (mean ± std per state):")
    print("  " + "-" * 68)
    for state in sorted(dataset["label"].unique()):
        subset = dataset[dataset["label"] == state]
        print(f"\n  [{state.upper()}]")
        for feat in FEATURE_NAMES:
            m = subset[feat].mean()
            s = subset[feat].std()
            mn = subset[feat].min()
            mx = subset[feat].max()
            print(f"    {feat:<28} {m:>8.3f} ± {s:<7.3f}  [{mn:.3f}, {mx:.3f}]")
    
    # ─── OVERLAP ANALYSIS ────────────────────────────────────────────────
    print(f"\n  Inter-class overlap analysis (feature range overlap %):")
    print("  " + "-" * 68)
    states = sorted(dataset["label"].unique())
    for feat in ["hesitation_ratio", "typing_speed_cps", "gyroscope_variance"]:
        print(f"  {feat}:")
        for i, s1 in enumerate(states):
            for s2 in states[i+1:]:
                d1 = dataset[dataset["label"] == s1][feat]
                d2 = dataset[dataset["label"] == s2][feat]
                # Compute overlap: range of intersection / union
                overlap_lo = max(d1.quantile(0.10), d2.quantile(0.10))
                overlap_hi = min(d1.quantile(0.90), d2.quantile(0.90))
                if overlap_hi > overlap_lo:
                    union_range = max(d1.quantile(0.90), d2.quantile(0.90)) - min(d1.quantile(0.10), d2.quantile(0.10))
                    overlap_pct = (overlap_hi - overlap_lo) / union_range * 100
                    if overlap_pct > 5:
                        print(f"    {s1:<10} ↔ {s2:<10}: {overlap_pct:>5.1f}%")
    
    # ─── SAVE ────────────────────────────────────────────────────────────
    dataset.to_csv(OUTPUT_FILE, index=False)
    print(f"\n  Saved to: {OUTPUT_FILE.resolve()}")
    print(f"  File size: {OUTPUT_FILE.stat().st_size / 1024 / 1024:.1f} MB")
    print()
    print("=" * 70)
    print("  Cognitive dataset V2 generation complete!")
    print("=" * 70)


if __name__ == "__main__":
    main()
