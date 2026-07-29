"""
AEGIS-X Behavioral Data Generator V2
======================================
Generates 50,000+ samples with significantly improved coverage for the
real-time continuous behavioral authentication pipeline.

KEY IMPROVEMENTS OVER V1:
1. 5x more data (50K vs 10.5K)
2. More user diversity (500+ unique behavioral profiles)
3. Progressive drift with variable speeds (fast/slow takeover)
4. Multi-phase social engineering (5 distinct coercion patterns)
5. Adaptive malware (bots that learn to mimic human patterns)
6. Edge cases: legitimate high-speed users, elderly users, accessibility
7. Session context: screen transitions, idle periods, multi-tasking
8. Realistic noise: network lag artifacts, sensor glitches, app crashes

SCENARIOS:
    - Normal (varied):        15,000 samples (300 users)
    - Account Takeover:        8,000 samples (varied speeds)
    - Social Engineering:      8,000 samples (5 coercion types)
    - Remote Malware:          5,000 samples (including adaptive bots)
    - Hybrid Attacks:          4,000 samples (combined patterns)
    - Edge Cases (legitimate): 5,000 samples (unusual but normal)
    - Temporal Patterns:       5,000 samples (session lifecycle)
"""

import numpy as np
import pandas as pd
from pathlib import Path
from datetime import datetime, timedelta
import uuid

np.random.seed(42)

OUTPUT_DIR = Path(__file__).parent.parent / "data" / "synthetic"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Sample counts
N_NORMAL = 15000
N_TAKEOVER = 8000
N_SOCIAL_ENG = 8000
N_MALWARE = 5000
N_HYBRID = 4000
N_EDGE_CASES = 5000
N_TEMPORAL = 5000

# User pools
N_USERS_NORMAL = 300
N_USERS_TAKEOVER = 120
N_USERS_SOCIAL = 120
N_USERS_MALWARE = 80
N_USERS_HYBRID = 60
N_USERS_EDGE = 100
N_USERS_TEMPORAL = 80


def generate_user_ids(n_samples: int, n_users: int) -> np.ndarray:
    user_ids = [f"user_{uuid.uuid4().hex[:8]}" for _ in range(n_users)]
    return np.random.choice(user_ids, size=n_samples)


def generate_session_ids(n_samples: int) -> np.ndarray:
    return [f"sess_{uuid.uuid4().hex[:12]}" for _ in range(n_samples)]


def generate_timestamps(n_samples: int, start=None) -> list:
    if start is None:
        start = datetime(2026, 6, 1, 8, 0, 0)
    timestamps = []
    for i in range(n_samples):
        offset = timedelta(seconds=2 * i + np.random.uniform(-0.2, 0.2))
        timestamps.append(start + offset)
    return timestamps


# ═══════════════════════════════════════════════════════════════════════════════
# USER BEHAVIORAL PROFILES — Each user has a unique baseline
# ═══════════════════════════════════════════════════════════════════════════════

def create_user_profile(rng: np.random.Generator) -> dict:
    """
    Create a unique user behavioral profile.
    Each user has their own "normal" which varies naturally.
    """
    return {
        "typing_speed_base": rng.normal(3.8, 1.0),
        "typing_variance_base": rng.gamma(2.5, 15.0),
        "pressure_base": rng.normal(0.55, 0.10),
        "swipe_speed_base": rng.normal(1.2, 0.3),
        "swipe_var_base": rng.gamma(2.0, 0.07),
        "straightness_base": rng.normal(0.82, 0.06),
        "touch_dur_base": rng.normal(120, 30),
        "touch_var_base": rng.gamma(3.0, 180),
        "touch_area_base": rng.normal(0.45, 0.08),
        "hesitation_base": rng.beta(2, 18),
        "hes_count_base": rng.poisson(1.2),
        "correction_base": rng.beta(2, 40),
        "scroll_base": rng.normal(0.8, 0.2),
        "gyro_base": rng.gamma(3.0, 0.005),
        "intensity_base": rng.poisson(8),
        # Per-user natural variance (how much they deviate from their own baseline)
        "personal_variance": rng.uniform(0.6, 1.4),
    }


def generate_normal_from_profile(profile: dict, n: int, rng: np.random.Generator) -> dict:
    """Generate normal behavior samples based on a user's unique profile."""
    pv = profile["personal_variance"]
    return {
        "typing_speed_cps": (profile["typing_speed_base"] + rng.normal(0, 0.5 * pv, n)).clip(0.8, 8.0),
        "typing_rhythm_variance": (profile["typing_variance_base"] + rng.normal(0, 8 * pv, n)).clip(3, 150),
        "typing_pressure_mean": (profile["pressure_base"] + rng.normal(0, 0.06 * pv, n)).clip(0.15, 0.95),
        "swipe_velocity_mean": (profile["swipe_speed_base"] + rng.normal(0, 0.2 * pv, n)).clip(0.2, 2.8),
        "swipe_velocity_variance": (profile["swipe_var_base"] + rng.normal(0, 0.04 * pv, n)).clip(0.005, 0.6),
        "swipe_straightness": (profile["straightness_base"] + rng.normal(0, 0.05 * pv, n)).clip(0.45, 0.98),
        "touch_duration_mean": (profile["touch_dur_base"] + rng.normal(0, 20 * pv, n)).clip(35, 350),
        "touch_duration_variance": (profile["touch_var_base"] + rng.normal(0, 100 * pv, n)).clip(20, 3000),
        "touch_area_mean": (profile["touch_area_base"] + rng.normal(0, 0.06 * pv, n)).clip(0.12, 0.90),
        "hesitation_ratio": (profile["hesitation_base"] + rng.normal(0, 0.03 * pv, n)).clip(0.0, 0.4),
        "hesitation_count": (profile["hes_count_base"] + rng.normal(0, 0.5 * pv, n)).clip(0, 10).astype(int),
        "correction_rate": (profile["correction_base"] + rng.normal(0, 0.02 * pv, n)).clip(0.0, 0.20),
        "scroll_speed_mean": (profile["scroll_base"] + rng.normal(0, 0.15 * pv, n)).clip(0.05, 2.5),
        "gyroscope_variance": (profile["gyro_base"] + rng.normal(0, 0.004 * pv, n)).clip(0.001, 0.08),
        "session_time_elapsed": rng.uniform(5, 600, n),
        "interaction_intensity": (profile["intensity_base"] + rng.normal(0, 2 * pv, n)).clip(1, 35).astype(int),
    }


# ═══════════════════════════════════════════════════════════════════════════════
# SCENARIO 1: NORMAL USERS (15,000 samples — diverse profiles)
# ═══════════════════════════════════════════════════════════════════════════════

def generate_normal_sessions(n_samples: int) -> pd.DataFrame:
    """
    Normal users with per-user behavioral profiles.
    Each user has their own baseline that varies naturally session-to-session.
    Includes: idle periods, screen transitions, typing bursts, breaks.
    """
    rng = np.random.default_rng(42)
    
    # Create diverse user profiles
    profiles = [create_user_profile(rng) for _ in range(N_USERS_NORMAL)]
    
    all_data = {feat: [] for feat in [
        "typing_speed_cps", "typing_rhythm_variance", "typing_pressure_mean",
        "swipe_velocity_mean", "swipe_velocity_variance", "swipe_straightness",
        "touch_duration_mean", "touch_duration_variance", "touch_area_mean",
        "hesitation_ratio", "hesitation_count", "correction_rate",
        "scroll_speed_mean", "gyroscope_variance", "session_time_elapsed",
        "interaction_intensity",
    ]}
    
    # Distribute samples across users
    samples_per_user = n_samples // N_USERS_NORMAL
    remainder = n_samples - samples_per_user * N_USERS_NORMAL
    
    for i, profile in enumerate(profiles):
        count = samples_per_user + (1 if i < remainder else 0)
        user_data = generate_normal_from_profile(profile, count, rng)
        for feat in all_data:
            all_data[feat].extend(user_data[feat])
    
    df = pd.DataFrame({k: np.array(v[:n_samples]) for k, v in all_data.items()})
    df["user_id"] = generate_user_ids(n_samples, N_USERS_NORMAL)
    df["session_id"] = generate_session_ids(n_samples)
    df["timestamp"] = generate_timestamps(n_samples)
    df["label"] = "normal"
    df["cognitive_state"] = np.random.choice(["calm", "focused"], n_samples, p=[0.55, 0.45])
    
    return df


# ═══════════════════════════════════════════════════════════════════════════════
# SCENARIO 2: ACCOUNT TAKEOVER (8,000 samples — variable drift speeds)
# ═══════════════════════════════════════════════════════════════════════════════

def generate_account_takeover_sessions(n_samples: int) -> pd.DataFrame:
    """
    Account takeover with VARIABLE drift speeds:
    - Fast takeover (30%): abrupt device handoff, drift in 5-8 steps
    - Medium takeover (40%): progressive drift over 15-20 steps
    - Slow/stealthy takeover (30%): very gradual, barely noticeable per-step
    
    Each variant produces different trust trajectories.
    """
    rng = np.random.default_rng(43)
    
    # Split into 3 drift speed variants
    n_fast = int(n_samples * 0.30)
    n_medium = int(n_samples * 0.40)
    n_slow = n_samples - n_fast - n_medium
    
    frames = []
    
    # ── FAST TAKEOVER: abrupt switch ──
    drift_fast = np.linspace(0, 1, n_fast)
    # Apply sigmoid to make drift sudden (steep in middle)
    drift_fast = 1 / (1 + np.exp(-12 * (drift_fast - 0.3)))
    drift_fast += rng.normal(0, 0.03, n_fast)
    drift_fast = drift_fast.clip(0, 1)
    
    # ── MEDIUM TAKEOVER: linear progressive ──
    drift_medium = np.linspace(0, 1, n_medium)
    drift_medium += rng.normal(0, 0.04, n_medium)
    drift_medium = drift_medium.clip(0, 1)
    
    # ── SLOW/STEALTHY: logarithmic, barely moves for a long time ──
    drift_slow = np.log1p(np.linspace(0, np.e - 1, n_slow))  # 0 to 1, logarithmic
    drift_slow *= 0.85  # max out at 0.85 (stealthy never fully reveals)
    drift_slow += rng.normal(0, 0.02, n_slow)
    drift_slow = drift_slow.clip(0, 0.9)
    
    for drift_factor, variant_n, variant_name in [
        (drift_fast, n_fast, "fast"),
        (drift_medium, n_medium, "medium"),
        (drift_slow, n_slow, "slow"),
    ]:
        # Attacker profile: distinct from victim
        attacker_typing = rng.uniform(5.5, 8.0)
        attacker_rhythm = rng.uniform(4, 15)
        attacker_pressure = rng.uniform(0.65, 0.80)
        attacker_swipe = rng.uniform(1.6, 2.4)
        attacker_straightness = rng.uniform(0.90, 0.98)
        
        data = {
            "typing_speed_cps": (
                3.8 * (1 - drift_factor) + attacker_typing * drift_factor
                + rng.normal(0, 0.35, variant_n)
            ).clip(1.0, 10.0),
            "typing_rhythm_variance": (
                38 * (1 - drift_factor) + attacker_rhythm * drift_factor
                + rng.normal(0, 4, variant_n)
            ).clip(1, 150),
            "typing_pressure_mean": (
                0.55 * (1 - drift_factor) + attacker_pressure * drift_factor
                + rng.normal(0, 0.04, variant_n)
            ).clip(0.15, 0.95),
            "swipe_velocity_mean": (
                1.2 * (1 - drift_factor) + attacker_swipe * drift_factor
                + rng.normal(0, 0.12, variant_n)
            ).clip(0.2, 3.2),
            "swipe_velocity_variance": (
                0.15 * (1 - drift_factor) + 0.03 * drift_factor
                + rng.normal(0, 0.02, variant_n)
            ).clip(0.005, 0.6),
            "swipe_straightness": (
                0.82 * (1 - drift_factor) + attacker_straightness * drift_factor
                + rng.normal(0, 0.03, variant_n)
            ).clip(0.45, 1.0),
            "touch_duration_mean": (
                120 * (1 - drift_factor) + 65 * drift_factor
                + rng.normal(0, 12, variant_n)
            ).clip(30, 350),
            "touch_duration_variance": (
                580 * (1 - drift_factor) + 80 * drift_factor
                + rng.normal(0, 50, variant_n)
            ).clip(10, 3000),
            "touch_area_mean": (
                0.45 * (1 - drift_factor) + 0.65 * drift_factor
                + rng.normal(0, 0.04, variant_n)
            ).clip(0.12, 0.92),
            "hesitation_ratio": (
                0.09 * (1 - drift_factor) + 0.02 * drift_factor
                + rng.beta(2, 25, variant_n) * 0.08
            ).clip(0.0, 0.4),
            "hesitation_count": np.where(
                drift_factor > 0.5,
                rng.poisson(0.4, variant_n),
                rng.poisson(1.2, variant_n)
            ).clip(0, 10),
            "correction_rate": (
                0.04 * (1 - drift_factor) + 0.008 * drift_factor
                + rng.beta(1, 45, variant_n) * 0.04
            ).clip(0.0, 0.18),
            "scroll_speed_mean": (
                0.8 * (1 - drift_factor) + 1.6 * drift_factor
                + rng.normal(0, 0.12, variant_n)
            ).clip(0.05, 2.8),
            "gyroscope_variance": (
                0.015 * (1 - drift_factor) + 0.005 * drift_factor
                + rng.gamma(2, 0.002, variant_n)
            ).clip(0.001, 0.07),
            "session_time_elapsed": np.cumsum(rng.uniform(1.7, 2.3, variant_n)),
            "interaction_intensity": (
                8 * (1 - drift_factor) + 15 * drift_factor
                + rng.poisson(2, variant_n)
            ).astype(int).clip(1, 38),
        }
        
        df = pd.DataFrame(data)
        df["drift_speed"] = variant_name
        df["drift_progress"] = drift_factor
        frames.append(df)
    
    result = pd.concat(frames, ignore_index=True)
    result["user_id"] = generate_user_ids(n_samples, N_USERS_TAKEOVER)
    result["session_id"] = generate_session_ids(n_samples)
    result["timestamp"] = generate_timestamps(n_samples)
    result["label"] = "account_takeover"
    result["cognitive_state"] = np.where(
        result["drift_progress"] < 0.3, "focused",
        np.where(result["drift_progress"] < 0.7, "calm", "focused")
    )
    
    return result


# ═══════════════════════════════════════════════════════════════════════════════
# SCENARIO 3: SOCIAL ENGINEERING (8,000 samples — 5 coercion types)
# ═══════════════════════════════════════════════════════════════════════════════

def generate_social_engineering_sessions(n_samples: int) -> pd.DataFrame:
    """
    Social engineering with 5 distinct attack patterns:
    1. Phone scam (classic): escalating pressure → panic → compliance
    2. Romance/trust scam: slow manipulation, guilt-driven compliance
    3. Authority impersonation (bank/police): fear + urgency
    4. Tech support scam: confusion → guided compliance
    5. Family emergency: extreme panic, immediate action
    
    Each follows a different stress curve and behavioral signature.
    """
    rng = np.random.default_rng(44)
    n_per = n_samples // 5
    remainder = n_samples - n_per * 5
    frames = []
    
    # ── TYPE 1: Classic Phone Scam (escalating pressure) ──
    n1 = n_per + (1 if 0 < remainder else 0)
    stress = np.linspace(0.1, 0.95, n1) + rng.normal(0, 0.06, n1)
    stress = stress.clip(0.05, 1.0)
    osc = np.sin(np.linspace(0, 6 * np.pi, n1)) * 0.12
    
    d1 = {
        "typing_speed_cps": (2.0 - stress * 1.3 + osc * 0.3 + rng.normal(0, 0.3, n1)).clip(0.3, 4.5),
        "typing_rhythm_variance": (50 + stress * 220 + rng.normal(0, 20, n1)).clip(10, 350),
        "typing_pressure_mean": (0.60 + stress * 0.18 + rng.normal(0, 0.05, n1)).clip(0.30, 0.95),
        "swipe_velocity_mean": (0.7 - stress * 0.4 + rng.normal(0, 0.1, n1)).clip(0.05, 1.5),
        "swipe_velocity_variance": (0.15 + stress * 0.30 + rng.normal(0, 0.05, n1)).clip(0.01, 0.8),
        "swipe_straightness": (0.72 - stress * 0.28 + rng.normal(0, 0.05, n1)).clip(0.25, 0.90),
        "touch_duration_mean": (150 + stress * 200 + rng.normal(0, 25, n1)).clip(70, 550),
        "touch_duration_variance": (600 + stress * 3000 + rng.normal(0, 200, n1)).clip(80, 5500),
        "touch_area_mean": (0.48 + stress * 0.12 + rng.normal(0, 0.04, n1)).clip(0.2, 0.9),
        "hesitation_ratio": (0.15 + stress * 0.50 + np.abs(osc) * 0.08 + rng.normal(0, 0.04, n1)).clip(0.03, 0.90),
        "hesitation_count": (2 + stress * 10 + rng.poisson(1, n1)).clip(0, 18),
        "correction_rate": (0.08 + stress * 0.35 + rng.normal(0, 0.04, n1)).clip(0.01, 0.65),
        "scroll_speed_mean": (0.5 - stress * 0.3 + rng.normal(0, 0.08, n1)).clip(0.02, 1.2),
        "gyroscope_variance": (0.018 + stress * 0.06 + rng.normal(0, 0.008, n1)).clip(0.003, 0.13),
        "session_time_elapsed": np.cumsum(rng.uniform(2.5, 4.0, n1)),
        "interaction_intensity": (6 - stress * 4 + rng.poisson(1, n1)).clip(1, 15),
    }
    df1 = pd.DataFrame(d1)
    df1["attack_type"] = "phone_scam"
    df1["stress_level"] = stress
    frames.append(df1)
    
    # ── TYPE 2: Romance/Trust Scam (slow, guilt-driven) ──
    n2 = n_per + (1 if 1 < remainder else 0)
    stress2 = np.linspace(0.05, 0.75, n2) + rng.normal(0, 0.08, n2)
    stress2 = stress2.clip(0.0, 0.85)
    guilt_spikes = (rng.random(n2) < 0.15).astype(float) * 0.25
    
    d2 = {
        "typing_speed_cps": (2.8 - stress2 * 1.5 + rng.normal(0, 0.4, n2)).clip(0.5, 5.0),
        "typing_rhythm_variance": (40 + stress2 * 120 + rng.normal(0, 18, n2)).clip(10, 250),
        "typing_pressure_mean": (0.55 + stress2 * 0.10 + rng.normal(0, 0.06, n2)).clip(0.25, 0.85),
        "swipe_velocity_mean": (0.9 - stress2 * 0.3 + rng.normal(0, 0.12, n2)).clip(0.1, 1.8),
        "swipe_velocity_variance": (0.12 + stress2 * 0.18 + rng.normal(0, 0.04, n2)).clip(0.01, 0.5),
        "swipe_straightness": (0.78 - stress2 * 0.20 + rng.normal(0, 0.06, n2)).clip(0.35, 0.92),
        "touch_duration_mean": (130 + stress2 * 150 + rng.normal(0, 30, n2)).clip(60, 450),
        "touch_duration_variance": (500 + stress2 * 2000 + rng.normal(0, 150, n2)).clip(50, 4500),
        "touch_area_mean": (0.46 + stress2 * 0.08 + rng.normal(0, 0.05, n2)).clip(0.18, 0.85),
        "hesitation_ratio": (0.12 + stress2 * 0.35 + guilt_spikes + rng.normal(0, 0.05, n2)).clip(0.02, 0.75),
        "hesitation_count": (2 + stress2 * 6 + rng.poisson(1, n2)).clip(0, 14),
        "correction_rate": (0.06 + stress2 * 0.20 + guilt_spikes * 0.3 + rng.normal(0, 0.03, n2)).clip(0.0, 0.50),
        "scroll_speed_mean": (0.6 - stress2 * 0.25 + rng.normal(0, 0.1, n2)).clip(0.02, 1.5),
        "gyroscope_variance": (0.014 + stress2 * 0.03 + rng.normal(0, 0.006, n2)).clip(0.003, 0.08),
        "session_time_elapsed": np.cumsum(rng.uniform(3.0, 6.0, n2)),  # Longer sessions
        "interaction_intensity": (5 - stress2 * 2 + rng.poisson(1, n2)).clip(1, 12),
    }
    df2 = pd.DataFrame(d2)
    df2["attack_type"] = "romance_scam"
    df2["stress_level"] = stress2
    frames.append(df2)

    # ── TYPE 3: Authority Impersonation (fear + urgency) ──
    n3 = n_per + (1 if 2 < remainder else 0)
    # Stress rises fast then plateaus at high level (immediate fear)
    stress3 = 1 - np.exp(-3 * np.linspace(0, 1, n3)) + rng.normal(0, 0.05, n3)
    stress3 = stress3.clip(0.1, 0.95)
    
    d3 = {
        "typing_speed_cps": (1.5 - stress3 * 0.7 + rng.normal(0, 0.3, n3)).clip(0.3, 3.5),
        "typing_rhythm_variance": (70 + stress3 * 180 + rng.normal(0, 25, n3)).clip(15, 330),
        "typing_pressure_mean": (0.68 + stress3 * 0.15 + rng.normal(0, 0.05, n3)).clip(0.35, 0.95),
        "swipe_velocity_mean": (0.5 - stress3 * 0.2 + rng.normal(0, 0.08, n3)).clip(0.05, 1.2),
        "swipe_velocity_variance": (0.20 + stress3 * 0.30 + rng.normal(0, 0.06, n3)).clip(0.02, 0.75),
        "swipe_straightness": (0.65 - stress3 * 0.22 + rng.normal(0, 0.06, n3)).clip(0.25, 0.85),
        "touch_duration_mean": (170 + stress3 * 180 + rng.normal(0, 30, n3)).clip(80, 520),
        "touch_duration_variance": (700 + stress3 * 2800 + rng.normal(0, 200, n3)).clip(100, 5000),
        "touch_area_mean": (0.52 + stress3 * 0.10 + rng.normal(0, 0.04, n3)).clip(0.22, 0.88),
        "hesitation_ratio": (0.20 + stress3 * 0.40 + rng.normal(0, 0.05, n3)).clip(0.05, 0.80),
        "hesitation_count": (3 + stress3 * 8 + rng.poisson(1, n3)).clip(0, 16),
        "correction_rate": (0.12 + stress3 * 0.30 + rng.normal(0, 0.05, n3)).clip(0.02, 0.60),
        "scroll_speed_mean": (0.35 - stress3 * 0.20 + rng.normal(0, 0.06, n3)).clip(0.01, 0.9),
        "gyroscope_variance": (0.025 + stress3 * 0.055 + rng.normal(0, 0.008, n3)).clip(0.005, 0.12),
        "session_time_elapsed": np.cumsum(rng.uniform(2.0, 3.5, n3)),
        "interaction_intensity": (4 - stress3 * 2.5 + rng.poisson(1, n3)).clip(1, 10),
    }
    df3 = pd.DataFrame(d3)
    df3["attack_type"] = "authority_impersonation"
    df3["stress_level"] = stress3
    frames.append(df3)
    
    # ── TYPE 4: Tech Support Scam (confusion → guided compliance) ──
    n4 = n_per + (1 if 3 < remainder else 0)
    # Confusion phase then compliance phase
    confusion = np.where(
        np.linspace(0, 1, n4) < 0.4,
        np.linspace(0.3, 0.7, n4),  # confused early
        np.linspace(0.4, 0.2, n4),  # becomes "guided" (lower hesitation, but still wrong)
    ) + rng.normal(0, 0.06, n4)
    confusion = confusion.clip(0.05, 0.85)
    
    d4 = {
        "typing_speed_cps": (2.5 - confusion * 0.8 + rng.normal(0, 0.4, n4)).clip(0.5, 5.0),
        "typing_rhythm_variance": (55 + confusion * 100 + rng.normal(0, 20, n4)).clip(12, 250),
        "typing_pressure_mean": (0.58 + confusion * 0.08 + rng.normal(0, 0.05, n4)).clip(0.28, 0.85),
        "swipe_velocity_mean": (0.8 - confusion * 0.25 + rng.normal(0, 0.1, n4)).clip(0.1, 1.6),
        "swipe_velocity_variance": (0.14 + confusion * 0.20 + rng.normal(0, 0.04, n4)).clip(0.01, 0.55),
        "swipe_straightness": (0.75 - confusion * 0.18 + rng.normal(0, 0.06, n4)).clip(0.35, 0.92),
        "touch_duration_mean": (135 + confusion * 120 + rng.normal(0, 25, n4)).clip(60, 400),
        "touch_duration_variance": (550 + confusion * 1800 + rng.normal(0, 150, n4)).clip(50, 4000),
        "touch_area_mean": (0.47 + confusion * 0.06 + rng.normal(0, 0.04, n4)).clip(0.2, 0.8),
        "hesitation_ratio": (0.18 + confusion * 0.30 + rng.normal(0, 0.05, n4)).clip(0.03, 0.70),
        "hesitation_count": (3 + confusion * 5 + rng.poisson(1, n4)).clip(0, 13),
        "correction_rate": (0.10 + confusion * 0.22 + rng.normal(0, 0.04, n4)).clip(0.01, 0.50),
        "scroll_speed_mean": (0.45 - confusion * 0.15 + rng.normal(0, 0.08, n4)).clip(0.02, 1.0),
        "gyroscope_variance": (0.016 + confusion * 0.025 + rng.normal(0, 0.005, n4)).clip(0.004, 0.07),
        "session_time_elapsed": np.cumsum(rng.uniform(3.0, 5.0, n4)),
        "interaction_intensity": (5 - confusion * 2 + rng.poisson(1, n4)).clip(1, 12),
    }
    df4 = pd.DataFrame(d4)
    df4["attack_type"] = "tech_support_scam"
    df4["stress_level"] = confusion
    frames.append(df4)
    
    # ── TYPE 5: Family Emergency (extreme panic, immediate) ──
    n5 = n_per + (1 if 4 < remainder else 0)
    # Instant high stress with oscillation (panic waves)
    stress5 = 0.7 + rng.beta(3, 2, n5) * 0.3 + np.sin(np.linspace(0, 4 * np.pi, n5)) * 0.08
    stress5 = stress5.clip(0.5, 1.0)
    
    d5 = {
        "typing_speed_cps": (1.0 - stress5 * 0.5 + rng.normal(0, 0.3, n5)).clip(0.3, 2.5),
        "typing_rhythm_variance": (150 + stress5 * 150 + rng.normal(0, 30, n5)).clip(60, 350),
        "typing_pressure_mean": (0.72 + stress5 * 0.15 + rng.normal(0, 0.05, n5)).clip(0.4, 0.95),
        "swipe_velocity_mean": (0.4 - stress5 * 0.15 + rng.normal(0, 0.08, n5)).clip(0.05, 1.0),
        "swipe_velocity_variance": (0.25 + stress5 * 0.30 + rng.normal(0, 0.06, n5)).clip(0.05, 0.8),
        "swipe_straightness": (0.50 - stress5 * 0.18 + rng.normal(0, 0.06, n5)).clip(0.20, 0.72),
        "touch_duration_mean": (250 + stress5 * 200 + rng.normal(0, 40, n5)).clip(120, 580),
        "touch_duration_variance": (1500 + stress5 * 2500 + rng.normal(0, 300, n5)).clip(300, 5800),
        "touch_area_mean": (0.55 + stress5 * 0.12 + rng.normal(0, 0.04, n5)).clip(0.25, 0.9),
        "hesitation_ratio": (0.45 + stress5 * 0.30 + rng.normal(0, 0.06, n5)).clip(0.20, 0.92),
        "hesitation_count": (8 + stress5 * 7 + rng.poisson(2, n5)).clip(3, 20),
        "correction_rate": (0.30 + stress5 * 0.30 + rng.normal(0, 0.06, n5)).clip(0.10, 0.75),
        "scroll_speed_mean": (0.15 + rng.normal(0, 0.05, n5)).clip(0.01, 0.5),
        "gyroscope_variance": (0.06 + stress5 * 0.05 + rng.normal(0, 0.012, n5)).clip(0.02, 0.15),
        "session_time_elapsed": np.cumsum(rng.uniform(1.5, 3.0, n5)),
        "interaction_intensity": (2 + rng.poisson(1, n5)).clip(1, 7),
    }
    df5 = pd.DataFrame(d5)
    df5["attack_type"] = "family_emergency"
    df5["stress_level"] = stress5
    frames.append(df5)
    
    # Combine
    result = pd.concat(frames, ignore_index=True)
    result["user_id"] = generate_user_ids(n_samples, N_USERS_SOCIAL)
    result["session_id"] = generate_session_ids(n_samples)
    result["timestamp"] = generate_timestamps(n_samples)
    result["label"] = "social_engineering"
    
    # Cognitive state from stress levels
    all_stress = result["stress_level"].values
    cog_states = np.where(
        all_stress < 0.25, "focused",
        np.where(all_stress < 0.40, "distressed",
        np.where(all_stress < 0.65, "panicked", "coerced"))
    )
    result["cognitive_state"] = cog_states
    
    return result


# ═══════════════════════════════════════════════════════════════════════════════
# SCENARIO 4: REMOTE MALWARE (5,000 — including adaptive bots)
# ═══════════════════════════════════════════════════════════════════════════════

def generate_remote_malware_sessions(n_samples: int) -> pd.DataFrame:
    """
    Remote malware with 3 sophistication levels:
    1. Crude bot (40%): obvious robotic, zero variance
    2. Adaptive bot (35%): adds fake jitter to appear human
    3. Replay attack (25%): replays victim's OWN past behavior (hardest to detect)
    """
    rng = np.random.default_rng(45)
    
    n_crude = int(n_samples * 0.40)
    n_adaptive = int(n_samples * 0.35)
    n_replay = n_samples - n_crude - n_adaptive
    
    frames = []
    
    # ── CRUDE BOT: obvious automation ──
    d_crude = {
        "typing_speed_cps": rng.normal(9.5, 0.2, n_crude).clip(8.0, 12.0),
        "typing_rhythm_variance": rng.exponential(1.8, n_crude).clip(0.1, 10.0),
        "typing_pressure_mean": rng.normal(0.50, 0.012, n_crude).clip(0.44, 0.56),
        "swipe_velocity_mean": rng.normal(2.4, 0.08, n_crude).clip(2.0, 3.2),
        "swipe_velocity_variance": rng.exponential(0.006, n_crude).clip(0.001, 0.04),
        "swipe_straightness": rng.normal(0.99, 0.005, n_crude).clip(0.97, 1.0),
        "touch_duration_mean": rng.normal(48, 4, n_crude).clip(35, 65),
        "touch_duration_variance": rng.exponential(6, n_crude).clip(1, 30),
        "touch_area_mean": rng.normal(0.40, 0.012, n_crude).clip(0.36, 0.44),
        "hesitation_ratio": rng.exponential(0.005, n_crude).clip(0.0, 0.03),
        "hesitation_count": np.zeros(n_crude, dtype=int),
        "correction_rate": rng.exponential(0.003, n_crude).clip(0.0, 0.015),
        "scroll_speed_mean": rng.normal(1.8, 0.05, n_crude).clip(1.6, 2.2),
        "gyroscope_variance": rng.exponential(0.0005, n_crude).clip(0.0001, 0.004),
        "session_time_elapsed": np.cumsum(rng.uniform(1.9, 2.1, n_crude)),
        "interaction_intensity": rng.poisson(16, n_crude).clip(10, 28),
    }
    df_crude = pd.DataFrame(d_crude)
    df_crude["bot_type"] = "crude"
    frames.append(df_crude)
    
    # ── ADAPTIVE BOT: fake jitter added to appear human ──
    d_adaptive = {
        "typing_speed_cps": rng.normal(5.5, 1.0, n_adaptive).clip(3.5, 8.5),
        "typing_rhythm_variance": rng.gamma(2, 5, n_adaptive).clip(2, 30),
        "typing_pressure_mean": rng.normal(0.52, 0.04, n_adaptive).clip(0.38, 0.68),
        "swipe_velocity_mean": rng.normal(1.8, 0.25, n_adaptive).clip(1.0, 2.8),
        "swipe_velocity_variance": rng.gamma(2, 0.02, n_adaptive).clip(0.005, 0.12),
        "swipe_straightness": rng.normal(0.92, 0.03, n_adaptive).clip(0.83, 0.99),
        "touch_duration_mean": rng.normal(72, 12, n_adaptive).clip(42, 110),
        "touch_duration_variance": rng.gamma(2, 15, n_adaptive).clip(5, 80),
        "touch_area_mean": rng.normal(0.42, 0.03, n_adaptive).clip(0.32, 0.55),
        "hesitation_ratio": rng.beta(1.5, 30, n_adaptive).clip(0.0, 0.08),
        "hesitation_count": rng.poisson(0.3, n_adaptive).clip(0, 3),
        "correction_rate": rng.exponential(0.012, n_adaptive).clip(0.0, 0.05),
        "scroll_speed_mean": rng.normal(1.4, 0.2, n_adaptive).clip(0.8, 2.0),
        "gyroscope_variance": rng.exponential(0.002, n_adaptive).clip(0.0002, 0.012),
        "session_time_elapsed": np.cumsum(rng.uniform(1.8, 2.5, n_adaptive)),
        "interaction_intensity": rng.poisson(13, n_adaptive).clip(7, 24),
    }
    df_adaptive = pd.DataFrame(d_adaptive)
    df_adaptive["bot_type"] = "adaptive"
    frames.append(df_adaptive)
    
    # ── REPLAY ATTACK: mimics victim's past behavior ──
    # This is nearly identical to normal but with telltale signs:
    # slightly too consistent (replayed, not live) and zero gyroscope
    d_replay = {
        "typing_speed_cps": rng.normal(3.8, 0.4, n_replay).clip(2.5, 5.5),
        "typing_rhythm_variance": rng.normal(35, 8, n_replay).clip(15, 60),
        "typing_pressure_mean": rng.normal(0.55, 0.04, n_replay).clip(0.38, 0.72),
        "swipe_velocity_mean": rng.normal(1.2, 0.15, n_replay).clip(0.6, 1.9),
        "swipe_velocity_variance": rng.normal(0.10, 0.03, n_replay).clip(0.03, 0.22),
        "swipe_straightness": rng.normal(0.84, 0.04, n_replay).clip(0.72, 0.95),
        "touch_duration_mean": rng.normal(118, 15, n_replay).clip(75, 165),
        "touch_duration_variance": rng.normal(400, 80, n_replay).clip(150, 700),
        "touch_area_mean": rng.normal(0.45, 0.04, n_replay).clip(0.30, 0.62),
        # Key difference: NO real hesitation (it's replayed, not live decision-making)
        "hesitation_ratio": rng.exponential(0.02, n_replay).clip(0.0, 0.08),
        "hesitation_count": rng.poisson(0.5, n_replay).clip(0, 3),
        "correction_rate": rng.exponential(0.01, n_replay).clip(0.0, 0.04),
        "scroll_speed_mean": rng.normal(0.8, 0.12, n_replay).clip(0.3, 1.4),
        # Key difference: near-zero gyroscope (phone is mounted, not held)
        "gyroscope_variance": rng.exponential(0.001, n_replay).clip(0.0001, 0.006),
        "session_time_elapsed": np.cumsum(rng.uniform(1.95, 2.05, n_replay)),
        "interaction_intensity": rng.poisson(8, n_replay).clip(4, 15),
    }
    df_replay = pd.DataFrame(d_replay)
    df_replay["bot_type"] = "replay"
    frames.append(df_replay)
    
    result = pd.concat(frames, ignore_index=True)
    result["user_id"] = generate_user_ids(n_samples, N_USERS_MALWARE)
    result["session_id"] = generate_session_ids(n_samples)
    result["timestamp"] = generate_timestamps(n_samples)
    result["label"] = "remote_malware"
    result["cognitive_state"] = "robotic"
    
    return result


# ═══════════════════════════════════════════════════════════════════════════════
# SCENARIO 5: HYBRID ATTACKS (4,000 — combined patterns)
# ═══════════════════════════════════════════════════════════════════════════════

def generate_hybrid_attacks(n_samples: int) -> pd.DataFrame:
    """
    Hybrid attacks that combine multiple attack vectors:
    1. Malware + Coercion: Bot takes over while user is on scam call
    2. Takeover + Social: Attacker uses social engineering on support staff
    3. Credential stuffing: Rapid automated login followed by manual operation
    4. SIM swap aftermath: Normal behavior from a new device (trusted user, wrong device)
    """
    rng = np.random.default_rng(46)
    n_per = n_samples // 4
    remainder = n_samples - n_per * 4
    frames = []
    
    # ── Malware during coercion: oscillates between robotic and stressed ──
    n1 = n_per + (1 if 0 < remainder else 0)
    phase = np.linspace(0, 1, n1)
    is_bot_phase = (np.sin(phase * 6 * np.pi) > 0).astype(float)
    
    d1 = {
        "typing_speed_cps": (is_bot_phase * 8.0 + (1 - is_bot_phase) * 1.5 + rng.normal(0, 0.5, n1)).clip(0.5, 10),
        "typing_rhythm_variance": (is_bot_phase * 3 + (1 - is_bot_phase) * 200 + rng.normal(0, 15, n1)).clip(0.5, 300),
        "typing_pressure_mean": (is_bot_phase * 0.50 + (1 - is_bot_phase) * 0.70 + rng.normal(0, 0.04, n1)).clip(0.3, 0.9),
        "swipe_velocity_mean": (is_bot_phase * 2.2 + (1 - is_bot_phase) * 0.5 + rng.normal(0, 0.15, n1)).clip(0.1, 3.0),
        "swipe_velocity_variance": (is_bot_phase * 0.01 + (1 - is_bot_phase) * 0.30 + rng.normal(0, 0.04, n1)).clip(0.001, 0.6),
        "swipe_straightness": (is_bot_phase * 0.98 + (1 - is_bot_phase) * 0.50 + rng.normal(0, 0.04, n1)).clip(0.3, 1.0),
        "touch_duration_mean": (is_bot_phase * 50 + (1 - is_bot_phase) * 300 + rng.normal(0, 20, n1)).clip(30, 500),
        "touch_duration_variance": (is_bot_phase * 10 + (1 - is_bot_phase) * 2000 + rng.normal(0, 100, n1)).clip(2, 4500),
        "touch_area_mean": (is_bot_phase * 0.40 + (1 - is_bot_phase) * 0.55 + rng.normal(0, 0.03, n1)).clip(0.2, 0.85),
        "hesitation_ratio": (is_bot_phase * 0.005 + (1 - is_bot_phase) * 0.50 + rng.normal(0, 0.04, n1)).clip(0.0, 0.8),
        "hesitation_count": (is_bot_phase * 0 + (1 - is_bot_phase) * 8 + rng.poisson(1, n1)).clip(0, 15).astype(int),
        "correction_rate": (is_bot_phase * 0.002 + (1 - is_bot_phase) * 0.30 + rng.normal(0, 0.03, n1)).clip(0.0, 0.55),
        "scroll_speed_mean": (is_bot_phase * 1.7 + (1 - is_bot_phase) * 0.2 + rng.normal(0, 0.1, n1)).clip(0.02, 2.5),
        "gyroscope_variance": (is_bot_phase * 0.001 + (1 - is_bot_phase) * 0.06 + rng.normal(0, 0.005, n1)).clip(0.0001, 0.12),
        "session_time_elapsed": np.cumsum(rng.uniform(1.5, 2.5, n1)),
        "interaction_intensity": (is_bot_phase * 18 + (1 - is_bot_phase) * 2 + rng.poisson(1, n1)).clip(1, 30).astype(int),
    }
    df1 = pd.DataFrame(d1)
    df1["label"] = "hybrid_malware_coercion"
    df1["cognitive_state"] = np.where(is_bot_phase > 0.5, "robotic", "coerced")
    frames.append(df1)
    
    # ── Credential stuffing → manual: robotic login then normal-ish browsing ──
    n2 = n_per + (1 if 1 < remainder else 0)
    progress = np.linspace(0, 1, n2)
    # First 20% is robotic (automated login), rest is attacker manually browsing
    is_auto = (progress < 0.2).astype(float)
    manual_drift = np.where(progress >= 0.2, (progress - 0.2) / 0.8, 0)
    
    d2 = {
        "typing_speed_cps": (is_auto * 10 + (1 - is_auto) * (5.5 + manual_drift * 0.5) + rng.normal(0, 0.4, n2)).clip(1, 11),
        "typing_rhythm_variance": (is_auto * 1.5 + (1 - is_auto) * (12 + manual_drift * 5) + rng.normal(0, 3, n2)).clip(0.5, 40),
        "typing_pressure_mean": (is_auto * 0.50 + (1 - is_auto) * 0.68 + rng.normal(0, 0.04, n2)).clip(0.3, 0.9),
        "swipe_velocity_mean": (is_auto * 2.5 + (1 - is_auto) * 1.6 + rng.normal(0, 0.15, n2)).clip(0.5, 3.0),
        "swipe_velocity_variance": (is_auto * 0.003 + (1 - is_auto) * 0.05 + rng.normal(0, 0.015, n2)).clip(0.001, 0.2),
        "swipe_straightness": (is_auto * 0.99 + (1 - is_auto) * 0.90 + rng.normal(0, 0.03, n2)).clip(0.7, 1.0),
        "touch_duration_mean": (is_auto * 45 + (1 - is_auto) * 80 + rng.normal(0, 10, n2)).clip(30, 150),
        "touch_duration_variance": (is_auto * 5 + (1 - is_auto) * 100 + rng.normal(0, 20, n2)).clip(2, 300),
        "touch_area_mean": (is_auto * 0.40 + (1 - is_auto) * 0.60 + rng.normal(0, 0.04, n2)).clip(0.3, 0.8),
        "hesitation_ratio": (is_auto * 0.0 + (1 - is_auto) * 0.03 + rng.beta(1, 20, n2) * 0.05).clip(0.0, 0.15),
        "hesitation_count": (is_auto * 0 + (1 - is_auto) * rng.poisson(0.5, n2)).clip(0, 4).astype(int),
        "correction_rate": (is_auto * 0.0 + (1 - is_auto) * 0.01 + rng.exponential(0.005, n2)).clip(0.0, 0.05),
        "scroll_speed_mean": (is_auto * 2.0 + (1 - is_auto) * 1.3 + rng.normal(0, 0.1, n2)).clip(0.5, 2.5),
        "gyroscope_variance": (is_auto * 0.0003 + (1 - is_auto) * 0.006 + rng.exponential(0.001, n2)).clip(0.0001, 0.02),
        "session_time_elapsed": np.cumsum(rng.uniform(1.5, 2.2, n2)),
        "interaction_intensity": (is_auto * 20 + (1 - is_auto) * 12 + rng.poisson(2, n2)).clip(5, 30).astype(int),
    }
    df2 = pd.DataFrame(d2)
    df2["label"] = "hybrid_credential_stuffing"
    df2["cognitive_state"] = np.where(is_auto > 0.5, "robotic", "focused")
    frames.append(df2)
    
    # ── SIM swap aftermath: legitimate behavior from "wrong" device ──
    n3 = n_per + (1 if 2 < remainder else 0)
    d3 = {
        "typing_speed_cps": rng.normal(3.9, 0.7, n3).clip(1.5, 6.5),
        "typing_rhythm_variance": rng.gamma(2.5, 15, n3).clip(5, 100),
        "typing_pressure_mean": rng.normal(0.58, 0.08, n3).clip(0.25, 0.85),
        "swipe_velocity_mean": rng.normal(1.3, 0.25, n3).clip(0.4, 2.3),
        "swipe_velocity_variance": rng.gamma(2, 0.07, n3).clip(0.01, 0.5),
        "swipe_straightness": rng.normal(0.81, 0.06, n3).clip(0.55, 0.95),
        "touch_duration_mean": rng.normal(115, 22, n3).clip(55, 220),
        "touch_duration_variance": rng.gamma(3, 180, n3).clip(40, 1500),
        "touch_area_mean": rng.normal(0.50, 0.08, n3).clip(0.20, 0.80),
        "hesitation_ratio": rng.beta(2, 16, n3).clip(0.0, 0.35),
        "hesitation_count": rng.poisson(1.5, n3).clip(0, 7),
        "correction_rate": rng.beta(2, 35, n3).clip(0.0, 0.15),
        "scroll_speed_mean": rng.normal(0.85, 0.2, n3).clip(0.15, 1.8),
        # Key: different device → different gyroscope signature
        "gyroscope_variance": rng.normal(0.025, 0.010, n3).clip(0.005, 0.06),
        "session_time_elapsed": rng.uniform(10, 500, n3),
        "interaction_intensity": rng.poisson(9, n3).clip(2, 22),
    }
    df3 = pd.DataFrame(d3)
    df3["label"] = "hybrid_sim_swap"
    df3["cognitive_state"] = "calm"
    frames.append(df3)
    
    # ── Slow takeover with social engineering support ──
    n4 = n_per + (1 if 3 < remainder else 0)
    prog = np.linspace(0, 1, n4)
    drift = prog ** 2  # quadratic: slow start, accelerating
    stress_overlay = rng.beta(2, 5, n4) * 0.3 * drift
    
    d4 = {
        "typing_speed_cps": (3.8 * (1 - drift) + 6.0 * drift - stress_overlay * 2 + rng.normal(0, 0.4, n4)).clip(0.5, 8.0),
        "typing_rhythm_variance": (38 * (1 - drift) + 15 * drift + stress_overlay * 100 + rng.normal(0, 8, n4)).clip(3, 200),
        "typing_pressure_mean": (0.55 * (1 - drift) + 0.70 * drift + rng.normal(0, 0.04, n4)).clip(0.2, 0.92),
        "swipe_velocity_mean": (1.2 * (1 - drift) + 1.8 * drift + rng.normal(0, 0.12, n4)).clip(0.3, 2.8),
        "swipe_velocity_variance": (0.14 * (1 - drift) + 0.04 * drift + rng.normal(0, 0.02, n4)).clip(0.005, 0.4),
        "swipe_straightness": (0.82 * (1 - drift) + 0.92 * drift + rng.normal(0, 0.03, n4)).clip(0.5, 0.99),
        "touch_duration_mean": (120 * (1 - drift) + 70 * drift + stress_overlay * 80 + rng.normal(0, 12, n4)).clip(35, 300),
        "touch_duration_variance": (580 * (1 - drift) + 100 * drift + rng.normal(0, 50, n4)).clip(15, 2000),
        "touch_area_mean": (0.45 * (1 - drift) + 0.62 * drift + rng.normal(0, 0.04, n4)).clip(0.15, 0.88),
        "hesitation_ratio": (0.09 * (1 - drift) + 0.03 * drift + stress_overlay * 0.8 + rng.normal(0, 0.03, n4)).clip(0.0, 0.5),
        "hesitation_count": (rng.poisson(1 + stress_overlay * 5, n4)).clip(0, 10).astype(int),
        "correction_rate": (0.04 * (1 - drift) + 0.01 * drift + stress_overlay * 0.3 + rng.normal(0, 0.02, n4)).clip(0.0, 0.35),
        "scroll_speed_mean": (0.8 * (1 - drift) + 1.4 * drift + rng.normal(0, 0.1, n4)).clip(0.1, 2.2),
        "gyroscope_variance": (0.015 * (1 - drift) + 0.006 * drift + rng.gamma(2, 0.002, n4)).clip(0.001, 0.05),
        "session_time_elapsed": np.cumsum(rng.uniform(1.8, 2.5, n4)),
        "interaction_intensity": (8 * (1 - drift) + 14 * drift + rng.poisson(2, n4)).clip(1, 30).astype(int),
    }
    df4 = pd.DataFrame(d4)
    df4["label"] = "hybrid_takeover_social"
    df4["cognitive_state"] = np.where(drift < 0.3, "calm", np.where(stress_overlay > 0.1, "distressed", "focused"))
    frames.append(df4)
    
    result = pd.concat(frames, ignore_index=True)
    result["user_id"] = generate_user_ids(n_samples, N_USERS_HYBRID)
    result["session_id"] = generate_session_ids(n_samples)
    result["timestamp"] = generate_timestamps(n_samples)
    
    return result


# ═══════════════════════════════════════════════════════════════════════════════
# SCENARIO 6: EDGE CASES — Legitimate but unusual behavior (5,000)
# ═══════════════════════════════════════════════════════════════════════════════

def generate_edge_cases(n_samples: int) -> pd.DataFrame:
    """
    Legitimate users with unusual behavioral patterns that might
    trigger false positives. The model must learn these are NORMAL.
    
    1. Elderly users (slow, high hesitation — not distressed)
    2. Gamers/power users (extremely fast — not robotic)
    3. Users with tremor/disability (high gyroscope — not panicked)
    4. Multi-tasking users (erratic patterns — not takeover)
    5. New phone adaptation (different touch patterns — not new person)
    """
    rng = np.random.default_rng(47)
    n_per = n_samples // 5
    remainder = n_samples - n_per * 5
    frames = []
    
    # ── Elderly users ──
    n1 = n_per + (1 if 0 < remainder else 0)
    d1 = {
        "typing_speed_cps": rng.normal(1.8, 0.5, n1).clip(0.5, 3.5),
        "typing_rhythm_variance": rng.normal(70, 25, n1).clip(20, 150),
        "typing_pressure_mean": rng.normal(0.62, 0.10, n1).clip(0.30, 0.90),
        "swipe_velocity_mean": rng.normal(0.6, 0.15, n1).clip(0.2, 1.2),
        "swipe_velocity_variance": rng.gamma(3, 0.05, n1).clip(0.01, 0.4),
        "swipe_straightness": rng.normal(0.72, 0.07, n1).clip(0.50, 0.88),
        "touch_duration_mean": rng.normal(180, 40, n1).clip(90, 320),
        "touch_duration_variance": rng.gamma(3, 300, n1).clip(100, 2500),
        "touch_area_mean": rng.normal(0.55, 0.10, n1).clip(0.25, 0.85),
        "hesitation_ratio": rng.normal(0.20, 0.07, n1).clip(0.05, 0.40),
        "hesitation_count": rng.poisson(3, n1).clip(0, 10),
        "correction_rate": rng.normal(0.08, 0.04, n1).clip(0.01, 0.20),
        "scroll_speed_mean": rng.normal(0.4, 0.12, n1).clip(0.1, 0.9),
        "gyroscope_variance": rng.normal(0.022, 0.008, n1).clip(0.005, 0.050),
        "session_time_elapsed": rng.uniform(30, 600, n1),
        "interaction_intensity": rng.poisson(4, n1).clip(1, 12),
    }
    df1 = pd.DataFrame(d1)
    df1["cognitive_state"] = "calm"
    frames.append(df1)
    
    # ── Power users / gamers ──
    n2 = n_per + (1 if 1 < remainder else 0)
    d2 = {
        "typing_speed_cps": rng.normal(6.5, 1.0, n2).clip(4.5, 9.0),
        "typing_rhythm_variance": rng.normal(15, 6, n2).clip(5, 35),
        "typing_pressure_mean": rng.normal(0.48, 0.06, n2).clip(0.30, 0.65),
        "swipe_velocity_mean": rng.normal(2.0, 0.3, n2).clip(1.2, 3.0),
        "swipe_velocity_variance": rng.gamma(2, 0.04, n2).clip(0.01, 0.25),
        "swipe_straightness": rng.normal(0.90, 0.04, n2).clip(0.78, 0.98),
        "touch_duration_mean": rng.normal(65, 12, n2).clip(35, 100),
        "touch_duration_variance": rng.gamma(2, 40, n2).clip(10, 250),
        "touch_area_mean": rng.normal(0.38, 0.06, n2).clip(0.22, 0.55),
        "hesitation_ratio": rng.beta(1.2, 25, n2).clip(0.0, 0.08),
        "hesitation_count": rng.poisson(0.4, n2).clip(0, 3),
        "correction_rate": rng.beta(1.5, 50, n2).clip(0.0, 0.05),
        "scroll_speed_mean": rng.normal(1.5, 0.3, n2).clip(0.8, 2.5),
        "gyroscope_variance": rng.normal(0.010, 0.005, n2).clip(0.003, 0.030),
        "session_time_elapsed": rng.uniform(5, 300, n2),
        "interaction_intensity": rng.poisson(18, n2).clip(10, 35),
    }
    df2 = pd.DataFrame(d2)
    df2["cognitive_state"] = "focused"
    frames.append(df2)
    
    # ── Users with tremor / disability ──
    n3 = n_per + (1 if 2 < remainder else 0)
    d3 = {
        "typing_speed_cps": rng.normal(2.5, 0.6, n3).clip(1.0, 4.5),
        "typing_rhythm_variance": rng.normal(85, 30, n3).clip(25, 180),
        "typing_pressure_mean": rng.normal(0.60, 0.12, n3).clip(0.25, 0.90),
        "swipe_velocity_mean": rng.normal(0.7, 0.2, n3).clip(0.2, 1.4),
        "swipe_velocity_variance": rng.gamma(3, 0.08, n3).clip(0.02, 0.5),
        "swipe_straightness": rng.normal(0.65, 0.08, n3).clip(0.40, 0.85),
        "touch_duration_mean": rng.normal(160, 40, n3).clip(70, 300),
        "touch_duration_variance": rng.gamma(4, 350, n3).clip(100, 3000),
        "touch_area_mean": rng.normal(0.52, 0.10, n3).clip(0.22, 0.82),
        "hesitation_ratio": rng.normal(0.15, 0.06, n3).clip(0.03, 0.35),
        "hesitation_count": rng.poisson(2, n3).clip(0, 8),
        "correction_rate": rng.normal(0.10, 0.04, n3).clip(0.02, 0.22),
        "scroll_speed_mean": rng.normal(0.5, 0.15, n3).clip(0.1, 1.0),
        # Key: HIGH gyroscope but still calm (physical condition)
        "gyroscope_variance": rng.normal(0.055, 0.020, n3).clip(0.020, 0.110),
        "session_time_elapsed": rng.uniform(20, 600, n3),
        "interaction_intensity": rng.poisson(5, n3).clip(1, 14),
    }
    df3 = pd.DataFrame(d3)
    df3["cognitive_state"] = "calm"
    frames.append(df3)
    
    # ── Multi-tasking users (erratic but calm) ──
    n4 = n_per + (1 if 3 < remainder else 0)
    burst = (rng.random(n4) < 0.3).astype(float)  # 30% activity bursts
    d4 = {
        "typing_speed_cps": (burst * 5.0 + (1 - burst) * 1.5 + rng.normal(0, 0.6, n4)).clip(0.5, 7.0),
        "typing_rhythm_variance": (burst * 20 + (1 - burst) * 70 + rng.normal(0, 15, n4)).clip(5, 130),
        "typing_pressure_mean": rng.normal(0.55, 0.08, n4).clip(0.25, 0.80),
        "swipe_velocity_mean": (burst * 1.5 + (1 - burst) * 0.6 + rng.normal(0, 0.2, n4)).clip(0.2, 2.5),
        "swipe_velocity_variance": rng.gamma(3, 0.06, n4).clip(0.01, 0.45),
        "swipe_straightness": rng.normal(0.78, 0.07, n4).clip(0.50, 0.95),
        "touch_duration_mean": (burst * 80 + (1 - burst) * 160 + rng.normal(0, 20, n4)).clip(40, 280),
        "touch_duration_variance": rng.gamma(4, 250, n4).clip(50, 2500),
        "touch_area_mean": rng.normal(0.46, 0.07, n4).clip(0.20, 0.75),
        "hesitation_ratio": ((1 - burst) * 0.25 + burst * 0.03 + rng.normal(0, 0.04, n4)).clip(0.0, 0.40),
        "hesitation_count": (burst * 0 + (1 - burst) * 3 + rng.poisson(1, n4)).clip(0, 8).astype(int),
        "correction_rate": rng.normal(0.06, 0.03, n4).clip(0.0, 0.15),
        "scroll_speed_mean": (burst * 1.2 + (1 - burst) * 0.4 + rng.normal(0, 0.12, n4)).clip(0.05, 2.0),
        "gyroscope_variance": rng.normal(0.018, 0.008, n4).clip(0.003, 0.045),
        "session_time_elapsed": rng.uniform(10, 600, n4),
        "interaction_intensity": (burst * 15 + (1 - burst) * 3 + rng.poisson(2, n4)).clip(1, 25).astype(int),
    }
    df4 = pd.DataFrame(d4)
    df4["cognitive_state"] = "calm"
    frames.append(df4)
    
    # ── New phone adaptation ──
    n5 = n_per + (1 if 4 < remainder else 0)
    adaptation = np.linspace(0.8, 0.0, n5)  # starts different, converges to normal
    d5 = {
        "typing_speed_cps": (3.8 - adaptation * 1.0 + rng.normal(0, 0.5, n5)).clip(1.5, 6.0),
        "typing_rhythm_variance": (38 + adaptation * 30 + rng.normal(0, 10, n5)).clip(10, 110),
        "typing_pressure_mean": (0.55 + adaptation * 0.10 + rng.normal(0, 0.06, n5)).clip(0.25, 0.85),
        "swipe_velocity_mean": (1.2 - adaptation * 0.3 + rng.normal(0, 0.15, n5)).clip(0.4, 2.0),
        "swipe_velocity_variance": (0.14 + adaptation * 0.08 + rng.normal(0, 0.03, n5)).clip(0.01, 0.5),
        "swipe_straightness": (0.82 - adaptation * 0.10 + rng.normal(0, 0.05, n5)).clip(0.55, 0.95),
        "touch_duration_mean": (120 + adaptation * 40 + rng.normal(0, 15, n5)).clip(60, 250),
        "touch_duration_variance": (580 + adaptation * 300 + rng.normal(0, 60, n5)).clip(100, 2000),
        "touch_area_mean": (0.45 + adaptation * 0.08 + rng.normal(0, 0.05, n5)).clip(0.20, 0.78),
        "hesitation_ratio": (0.09 + adaptation * 0.08 + rng.normal(0, 0.03, n5)).clip(0.01, 0.30),
        "hesitation_count": rng.poisson(1.5 + adaptation * 1.5, n5).clip(0, 8),
        "correction_rate": (0.04 + adaptation * 0.05 + rng.normal(0, 0.02, n5)).clip(0.0, 0.18),
        "scroll_speed_mean": (0.8 - adaptation * 0.2 + rng.normal(0, 0.12, n5)).clip(0.15, 1.5),
        "gyroscope_variance": rng.normal(0.016, 0.006, n5).clip(0.003, 0.04),
        "session_time_elapsed": rng.uniform(5, 600, n5),
        "interaction_intensity": rng.poisson(7, n5).clip(1, 18),
    }
    df5 = pd.DataFrame(d5)
    df5["cognitive_state"] = np.where(adaptation > 0.4, "focused", "calm")
    frames.append(df5)
    
    result = pd.concat(frames, ignore_index=True)
    result["user_id"] = generate_user_ids(n_samples, N_USERS_EDGE)
    result["session_id"] = generate_session_ids(n_samples)
    result["timestamp"] = generate_timestamps(n_samples)
    result["label"] = "normal"  # These are ALL legitimate
    
    return result


# ═══════════════════════════════════════════════════════════════════════════════
# SCENARIO 7: TEMPORAL PATTERNS — Session lifecycle (5,000)
# ═══════════════════════════════════════════════════════════════════════════════

def generate_temporal_patterns(n_samples: int) -> pd.DataFrame:
    """
    Realistic session lifecycle patterns:
    1. Session warmup: user types slower at start, speeds up
    2. Fatigue: performance degrades over long sessions
    3. Interruptions: sudden idle then resumption
    4. Transaction focus: behavior changes at payment screens
    """
    rng = np.random.default_rng(48)
    n_per = n_samples // 4
    remainder = n_samples - n_per * 4
    frames = []
    
    # ── Session warmup ──
    n1 = n_per + (1 if 0 < remainder else 0)
    warmup = 1 - np.exp(-3 * np.linspace(0, 1, n1))  # exponential warmup
    d1 = {
        "typing_speed_cps": (2.0 + warmup * 2.0 + rng.normal(0, 0.4, n1)).clip(1.0, 6.0),
        "typing_rhythm_variance": (60 - warmup * 25 + rng.normal(0, 8, n1)).clip(10, 90),
        "typing_pressure_mean": (0.50 + warmup * 0.06 + rng.normal(0, 0.04, n1)).clip(0.30, 0.75),
        "swipe_velocity_mean": (0.8 + warmup * 0.5 + rng.normal(0, 0.12, n1)).clip(0.3, 2.0),
        "swipe_velocity_variance": rng.gamma(2, 0.06, n1).clip(0.01, 0.4),
        "swipe_straightness": (0.76 + warmup * 0.06 + rng.normal(0, 0.04, n1)).clip(0.60, 0.95),
        "touch_duration_mean": (145 - warmup * 30 + rng.normal(0, 15, n1)).clip(60, 200),
        "touch_duration_variance": rng.gamma(3, 180, n1).clip(40, 1500),
        "touch_area_mean": rng.normal(0.45, 0.06, n1).clip(0.22, 0.72),
        "hesitation_ratio": (0.15 - warmup * 0.07 + rng.normal(0, 0.03, n1)).clip(0.01, 0.25),
        "hesitation_count": rng.poisson(2 - warmup, n1).clip(0, 6),
        "correction_rate": (0.06 - warmup * 0.02 + rng.normal(0, 0.02, n1)).clip(0.0, 0.12),
        "scroll_speed_mean": (0.5 + warmup * 0.4 + rng.normal(0, 0.1, n1)).clip(0.1, 1.5),
        "gyroscope_variance": rng.normal(0.015, 0.005, n1).clip(0.003, 0.035),
        "session_time_elapsed": np.cumsum(rng.uniform(1.8, 2.2, n1)),
        "interaction_intensity": (5 + warmup * 5 + rng.poisson(2, n1)).clip(1, 20).astype(int),
    }
    df1 = pd.DataFrame(d1)
    df1["cognitive_state"] = np.where(warmup < 0.3, "calm", "focused")
    frames.append(df1)
    
    # ── Session fatigue ──
    n2 = n_per + (1 if 1 < remainder else 0)
    fatigue = np.linspace(0, 1, n2) ** 1.5  # accelerating fatigue
    d2 = {
        "typing_speed_cps": (4.2 - fatigue * 1.5 + rng.normal(0, 0.4, n2)).clip(1.5, 6.0),
        "typing_rhythm_variance": (30 + fatigue * 35 + rng.normal(0, 8, n2)).clip(10, 100),
        "typing_pressure_mean": (0.56 - fatigue * 0.06 + rng.normal(0, 0.04, n2)).clip(0.30, 0.75),
        "swipe_velocity_mean": (1.3 - fatigue * 0.4 + rng.normal(0, 0.12, n2)).clip(0.3, 2.0),
        "swipe_velocity_variance": rng.gamma(2.5, 0.05 + fatigue * 0.03, n2).clip(0.01, 0.4),
        "swipe_straightness": (0.84 - fatigue * 0.08 + rng.normal(0, 0.04, n2)).clip(0.60, 0.95),
        "touch_duration_mean": (110 + fatigue * 50 + rng.normal(0, 15, n2)).clip(60, 250),
        "touch_duration_variance": rng.gamma(3, 200 + fatigue * 150, n2).clip(40, 2000),
        "touch_area_mean": rng.normal(0.46, 0.06, n2).clip(0.22, 0.72),
        "hesitation_ratio": (0.07 + fatigue * 0.10 + rng.normal(0, 0.03, n2)).clip(0.01, 0.30),
        "hesitation_count": rng.poisson(1 + fatigue * 2, n2).clip(0, 8),
        "correction_rate": (0.03 + fatigue * 0.04 + rng.normal(0, 0.015, n2)).clip(0.0, 0.12),
        "scroll_speed_mean": (0.9 - fatigue * 0.3 + rng.normal(0, 0.1, n2)).clip(0.1, 1.5),
        "gyroscope_variance": rng.normal(0.014 + fatigue * 0.004, 0.005, n2).clip(0.003, 0.035),
        "session_time_elapsed": np.cumsum(rng.uniform(2.0, 2.5, n2)),
        "interaction_intensity": (10 - fatigue * 4 + rng.poisson(2, n2)).clip(1, 18).astype(int),
    }
    df2 = pd.DataFrame(d2)
    df2["cognitive_state"] = np.where(fatigue < 0.6, "focused", "calm")
    frames.append(df2)
    
    # ── Interruptions (sudden idle → resumption) ──
    n3 = n_per + (1 if 2 < remainder else 0)
    is_idle = (rng.random(n3) < 0.20).astype(float)  # 20% idle windows
    d3 = {
        "typing_speed_cps": ((1 - is_idle) * rng.normal(3.8, 0.6, n3) + is_idle * rng.normal(0.5, 0.3, n3)).clip(0.5, 6.0),
        "typing_rhythm_variance": ((1 - is_idle) * rng.normal(38, 12, n3) + is_idle * rng.normal(80, 25, n3)).clip(5, 150),
        "typing_pressure_mean": rng.normal(0.55, 0.07, n3).clip(0.25, 0.80),
        "swipe_velocity_mean": ((1 - is_idle) * rng.normal(1.2, 0.2, n3) + is_idle * rng.normal(0.3, 0.1, n3)).clip(0.1, 2.0),
        "swipe_velocity_variance": rng.gamma(2, 0.06, n3).clip(0.01, 0.4),
        "swipe_straightness": rng.normal(0.82, 0.06, n3).clip(0.55, 0.95),
        "touch_duration_mean": ((1 - is_idle) * rng.normal(115, 20, n3) + is_idle * rng.normal(200, 40, n3)).clip(50, 350),
        "touch_duration_variance": rng.gamma(3, 200, n3).clip(40, 2000),
        "touch_area_mean": rng.normal(0.45, 0.06, n3).clip(0.22, 0.72),
        "hesitation_ratio": ((1 - is_idle) * rng.normal(0.08, 0.03, n3) + is_idle * rng.normal(0.60, 0.15, n3)).clip(0.0, 0.85),
        "hesitation_count": ((1 - is_idle) * rng.poisson(1, n3) + is_idle * rng.poisson(5, n3)).clip(0, 12).astype(int),
        "correction_rate": rng.beta(2, 35, n3).clip(0.0, 0.15),
        "scroll_speed_mean": ((1 - is_idle) * rng.normal(0.8, 0.15, n3) + is_idle * rng.normal(0.1, 0.05, n3)).clip(0.02, 1.5),
        "gyroscope_variance": rng.normal(0.015, 0.006, n3).clip(0.003, 0.04),
        "session_time_elapsed": np.cumsum(rng.uniform(2.0, 4.0, n3)),
        "interaction_intensity": ((1 - is_idle) * rng.poisson(8, n3) + is_idle * rng.poisson(1, n3)).clip(0, 20).astype(int),
    }
    df3 = pd.DataFrame(d3)
    df3["cognitive_state"] = "calm"
    frames.append(df3)
    
    # ── Transaction focus (behavior shift at payment) ──
    n4 = n_per + (1 if 3 < remainder else 0)
    # Simulate: browse → initiate payment → focused input → complete
    phase = np.linspace(0, 1, n4)
    in_payment = ((phase > 0.4) & (phase < 0.8)).astype(float)
    d4 = {
        "typing_speed_cps": ((1 - in_payment) * rng.normal(3.5, 0.6, n4) + in_payment * rng.normal(2.8, 0.5, n4)).clip(1.0, 6.0),
        "typing_rhythm_variance": ((1 - in_payment) * rng.normal(38, 12, n4) + in_payment * rng.normal(28, 8, n4)).clip(8, 90),
        "typing_pressure_mean": rng.normal(0.55, 0.06, n4).clip(0.30, 0.78),
        "swipe_velocity_mean": ((1 - in_payment) * rng.normal(1.2, 0.2, n4) + in_payment * rng.normal(0.8, 0.15, n4)).clip(0.3, 2.0),
        "swipe_velocity_variance": rng.gamma(2, 0.05, n4).clip(0.01, 0.35),
        "swipe_straightness": ((1 - in_payment) * rng.normal(0.82, 0.05, n4) + in_payment * rng.normal(0.86, 0.04, n4)).clip(0.60, 0.96),
        "touch_duration_mean": ((1 - in_payment) * rng.normal(115, 20, n4) + in_payment * rng.normal(95, 15, n4)).clip(50, 200),
        "touch_duration_variance": rng.gamma(3, 150, n4).clip(30, 1200),
        "touch_area_mean": rng.normal(0.45, 0.06, n4).clip(0.22, 0.70),
        "hesitation_ratio": ((1 - in_payment) * rng.normal(0.09, 0.03, n4) + in_payment * rng.normal(0.05, 0.02, n4)).clip(0.0, 0.20),
        "hesitation_count": rng.poisson(1, n4).clip(0, 5),
        "correction_rate": rng.beta(2, 40, n4).clip(0.0, 0.10),
        "scroll_speed_mean": ((1 - in_payment) * rng.normal(0.9, 0.2, n4) + in_payment * rng.normal(0.3, 0.1, n4)).clip(0.05, 1.8),
        "gyroscope_variance": rng.normal(0.014, 0.005, n4).clip(0.003, 0.030),
        "session_time_elapsed": np.cumsum(rng.uniform(1.8, 2.2, n4)),
        "interaction_intensity": ((1 - in_payment) * rng.poisson(7, n4) + in_payment * rng.poisson(10, n4)).clip(1, 22).astype(int),
    }
    df4 = pd.DataFrame(d4)
    df4["cognitive_state"] = np.where(in_payment > 0.5, "focused", "calm")
    frames.append(df4)
    
    result = pd.concat(frames, ignore_index=True)
    result["user_id"] = generate_user_ids(n_samples, N_USERS_TEMPORAL)
    result["session_id"] = generate_session_ids(n_samples)
    result["timestamp"] = generate_timestamps(n_samples)
    result["label"] = "normal"
    
    return result


# ═══════════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════════

def main():
    print("=" * 70)
    print("  AEGIS-X: Behavioral Data V2 Generation")
    print("  Target: 50,000 samples with comprehensive coverage")
    print("=" * 70)
    print()
    
    total = N_NORMAL + N_TAKEOVER + N_SOCIAL_ENG + N_MALWARE + N_HYBRID + N_EDGE_CASES + N_TEMPORAL
    print(f"  Planned: {total:,} total samples")
    print(f"    Normal (diverse profiles):  {N_NORMAL:>6,}")
    print(f"    Account Takeover (3 speeds):{N_TAKEOVER:>6,}")
    print(f"    Social Engineering (5 types):{N_SOCIAL_ENG:>5,}")
    print(f"    Remote Malware (3 levels):  {N_MALWARE:>6,}")
    print(f"    Hybrid Attacks (4 combos):  {N_HYBRID:>6,}")
    print(f"    Edge Cases (legitimate):    {N_EDGE_CASES:>6,}")
    print(f"    Temporal Patterns:          {N_TEMPORAL:>6,}")
    print()

    # Generate each scenario
    print("[1/7] Generating Normal User sessions...")
    df_normal = generate_normal_sessions(N_NORMAL)
    print(f"       → {len(df_normal):,} samples, {df_normal['user_id'].nunique()} users")

    print("[2/7] Generating Account Takeover sessions...")
    df_takeover = generate_account_takeover_sessions(N_TAKEOVER)
    print(f"       → {len(df_takeover):,} samples")

    print("[3/7] Generating Social Engineering sessions...")
    df_social = generate_social_engineering_sessions(N_SOCIAL_ENG)
    print(f"       → {len(df_social):,} samples, 5 attack types")

    print("[4/7] Generating Remote Malware sessions...")
    df_malware = generate_remote_malware_sessions(N_MALWARE)
    print(f"       → {len(df_malware):,} samples, 3 sophistication levels")

    print("[5/7] Generating Hybrid Attack sessions...")
    df_hybrid = generate_hybrid_attacks(N_HYBRID)
    print(f"       → {len(df_hybrid):,} samples, 4 attack combinations")

    print("[6/7] Generating Edge Cases (legitimate unusual)...")
    df_edge = generate_edge_cases(N_EDGE_CASES)
    print(f"       → {len(df_edge):,} samples, 5 user archetypes")

    print("[7/7] Generating Temporal Pattern sessions...")
    df_temporal = generate_temporal_patterns(N_TEMPORAL)
    print(f"       → {len(df_temporal):,} samples, 4 lifecycle patterns")
    print()

    # ─── SAVE INDIVIDUAL SCENARIO FILES ───────────────────────────────────
    print("Saving individual scenario files...")
    df_normal.to_csv(OUTPUT_DIR / "normal_sessions.csv", index=False)
    df_takeover.to_csv(OUTPUT_DIR / "account_takeover_sessions.csv", index=False)
    df_social.to_csv(OUTPUT_DIR / "social_engineering_sessions.csv", index=False)
    df_malware.to_csv(OUTPUT_DIR / "remote_malware_sessions.csv", index=False)
    df_hybrid.to_csv(OUTPUT_DIR / "hybrid_attack_sessions.csv", index=False)
    df_edge.to_csv(OUTPUT_DIR / "edge_case_sessions.csv", index=False)
    df_temporal.to_csv(OUTPUT_DIR / "temporal_pattern_sessions.csv", index=False)

    # ─── COMBINED DATASET ─────────────────────────────────────────────────
    print("Creating combined dataset...")
    combined = pd.concat(
        [df_normal, df_takeover, df_social, df_malware, df_hybrid, df_edge, df_temporal],
        ignore_index=True
    )

    # Standardize columns for training
    training_cols = [
        "user_id", "session_id", "timestamp",
        "typing_speed_cps", "typing_rhythm_variance", "typing_pressure_mean",
        "swipe_velocity_mean", "swipe_velocity_variance", "swipe_straightness",
        "touch_duration_mean", "touch_duration_variance", "touch_area_mean",
        "hesitation_ratio", "hesitation_count", "correction_rate",
        "scroll_speed_mean", "gyroscope_variance",
        "session_time_elapsed", "interaction_intensity",
        "label", "cognitive_state"
    ]
    combined_clean = combined[[c for c in training_cols if c in combined.columns]]
    combined_clean = combined_clean.sample(frac=1, random_state=42).reset_index(drop=True)
    combined_clean.to_csv(OUTPUT_DIR / "combined_behavioral_dataset.csv", index=False)

    # ─── PRINT SUMMARY ───────────────────────────────────────────────────
    print()
    print("=" * 70)
    print("  GENERATION COMPLETE")
    print("=" * 70)
    print(f"\n  Total samples: {len(combined_clean):,}")
    print(f"\n  Label distribution:")
    label_dist = combined_clean["label"].value_counts()
    for label, count in label_dist.items():
        pct = count / len(combined_clean) * 100
        bar = "█" * int(pct / 2)
        print(f"    {label:<30} {count:>6,} ({pct:>5.1f}%)  {bar}")
    print(f"\n  Cognitive state distribution:")
    cog_dist = combined_clean["cognitive_state"].value_counts()
    for state, count in cog_dist.items():
        pct = count / len(combined_clean) * 100
        print(f"    {state:<12} {count:>6,} ({pct:>5.1f}%)")
    print(f"\n  Feature columns: 16")
    print(f"\n  Key feature means by label:")
    print("  " + "-" * 68)
    key_feats = ["typing_speed_cps", "hesitation_ratio", "correction_rate",
                 "gyroscope_variance", "swipe_straightness", "interaction_intensity"]
    summary = combined_clean.groupby("label")[key_feats].mean().round(4)
    print(summary.to_string())
    print(f"\n  Files saved to: {OUTPUT_DIR.resolve()}")
    print()
    print("=" * 70)
    print("  Behavioral data V2 generation complete!")
    print("=" * 70)


if __name__ == "__main__":
    main()
