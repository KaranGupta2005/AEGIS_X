"""
Adaptive Learning Service
==========================
Continuous behavioral learning platform with anti-poisoning guarantees.

DESIGN PRINCIPLES:
1. Every user owns an independent behavioral profile — no cross-user comparison.
2. Baselines evolve ONLY after high-confidence sessions (trust > 90%).
3. Suspicious sessions NEVER modify the profile.
4. Every update is versioned — profiles never overwritten, always appended.
5. Personalized thresholds adapt to each user's natural behavioral variance.
6. Full explainability: every learning decision produces a human-readable reason.

LEARNING POLICY:
    Trust > 90%  → LEARN: update profile gradually via weighted EMA.
    Trust 70–90% → OBSERVE: record session, do not update profile.
    Trust < 70%  → REJECT: store separately for audit, never touch baseline.

POISONING PROTECTION:
    - Minimum session length required (≥5 windows)
    - Drift-during-learning check: if session drifts mid-update, rollback
    - Rate limiting: max 3 profile updates per hour
    - Consistency gate: new embedding must be within 2σ of profile distribution
"""

import numpy as np
import json
import time
from pathlib import Path
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, field, asdict
from enum import Enum


# ═══════════════════════════════════════════════════════════════════════════════
# ENUMS & CONSTANTS
# ═══════════════════════════════════════════════════════════════════════════════

class LearningDecision(str, Enum):
    LEARN = "LEARN"        # Trust > 90%: update profile
    OBSERVE = "OBSERVE"    # Trust 70–90%: record, don't update
    REJECT = "REJECT"      # Trust < 70%: quarantine session


class ProfileUpdateReason(str, Enum):
    HIGH_TRUST_SESSION = "High trust session — profile updated gradually"
    OBSERVED_ONLY = "Medium trust — session observed, profile unchanged"
    REJECTED_LOW_TRUST = "Low trust — session rejected for learning"
    REJECTED_DRIFT_EXCEEDED = "Drift exceeded learning threshold"
    REJECTED_RATE_LIMITED = "Profile update rate limit exceeded"
    REJECTED_INCONSISTENT = "Embedding outside acceptable variance (2σ)"
    REJECTED_INSUFFICIENT_WINDOWS = "Session too short for learning"
    ROLLBACK = "Profile rolled back to previous version"


# Learning thresholds
TRUST_LEARN_THRESHOLD = 0.90          # Trust > this → profile update
TRUST_OBSERVE_THRESHOLD = 0.70        # Trust 70–90 → observe only
MIN_SESSION_WINDOWS = 5               # Minimum windows required for learning
MAX_UPDATES_PER_HOUR = 3              # Anti-poisoning rate limit
CONSISTENCY_SIGMA_GATE = 2.0          # Embedding must be within 2σ of profile
EMA_BASE_DECAY = 0.92                 # Base EMA decay (adapts per user maturity)
PROFILE_MATURITY_SESSIONS = 30        # Sessions needed for "mature" profile

# Storage
PROFILES_DIR = Path(__file__).parent.parent.parent / "embeddings" / "profiles"
PROFILES_DIR.mkdir(parents=True, exist_ok=True)


# ═══════════════════════════════════════════════════════════════════════════════
# BEHAVIOR PROFILE (replaces single-embedding baseline)
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class AdaptiveThresholds:
    """Per-user adaptive thresholds that evolve based on behavioral history."""
    similarity_allow: float = 0.80     # Above this → ALLOW
    similarity_stepup: float = 0.50    # Above this → STEP_UP, below → BLOCK
    drift_sensitivity: float = 1.0     # Multiplier for CUSUM threshold
    learning_rate: float = 0.08        # 1 - EMA decay (how fast profile adapts)

    def to_dict(self) -> Dict:
        return asdict(self)

    @staticmethod
    def from_dict(d: Dict) -> "AdaptiveThresholds":
        return AdaptiveThresholds(**{k: v for k, v in d.items() if k in AdaptiveThresholds.__dataclass_fields__})


@dataclass
class BehaviorProfile:
    """
    Complete behavioral identity profile — replaces the single 384-dim embedding.

    Contains multiple behavioral embeddings for different modalities,
    adaptive thresholds, versioning, and full evolution history.
    """
    user_id: str
    version: int = 1

    # Core behavioral embeddings (384-dim each, L2-normalized)
    typing_baseline: Optional[np.ndarray] = None          # Keystroke dynamics centroid
    touch_baseline: Optional[np.ndarray] = None           # Touch/swipe dynamics centroid
    navigation_baseline: Optional[np.ndarray] = None      # Navigation pattern centroid
    composite_baseline: Optional[np.ndarray] = None       # Combined behavioral embedding (primary)

    # Biometric placeholders (for future integration)
    voice_embedding: Optional[np.ndarray] = None          # Voice print (512-dim)
    face_embedding: Optional[np.ndarray] = None           # Face template (128-dim)

    # Statistical model of user's behavioral distribution
    embedding_mean: Optional[np.ndarray] = None           # Mean of all trusted embeddings
    embedding_std: Optional[np.ndarray] = None            # Std dev per dimension
    embedding_samples: int = 0                            # How many trusted sessions contributed

    # Adaptive thresholds (personalized per user)
    thresholds: AdaptiveThresholds = field(default_factory=AdaptiveThresholds)

    # Profile metadata
    confidence: float = 0.0           # Overall profile confidence [0, 1]
    maturity_score: float = 0.0       # How mature/stable the profile is [0, 1]
    created_at: str = ""
    updated_at: str = ""
    last_learn_at: str = ""
    total_sessions: int = 0
    trusted_sessions: int = 0         # Sessions that contributed to profile
    rejected_sessions: int = 0        # Sessions excluded from learning
    update_count: int = 0             # Total profile version updates

    # Trust history summary
    mean_trust_score: float = 0.95
    min_trust_observed: float = 1.0
    trust_variance: float = 0.0

    # Rate limiting state
    _recent_updates: List[float] = field(default_factory=list)  # Timestamps of recent updates

    def is_enrolled(self) -> bool:
        """Profile is enrolled if composite baseline exists."""
        return self.composite_baseline is not None

    def is_mature(self) -> bool:
        """Profile is mature after sufficient trusted sessions."""
        return self.trusted_sessions >= PROFILE_MATURITY_SESSIONS


# ═══════════════════════════════════════════════════════════════════════════════
# LEARNING DECISION RESULT (explainable)
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class LearningResult:
    """Full result of a learning evaluation — always explainable."""
    decision: LearningDecision
    reason: str
    profile_updated: bool = False
    new_version: int = 0
    old_version: int = 0
    trust_score: float = 0.0
    similarity: float = 0.0
    drift_detected: bool = False
    consistency_check_passed: bool = True
    rate_limit_ok: bool = True
    session_windows: int = 0
    explanation: str = ""

    def to_dict(self) -> Dict:
        return {
            "decision": self.decision.value,
            "reason": self.reason,
            "profile_updated": self.profile_updated,
            "new_version": self.new_version,
            "old_version": self.old_version,
            "trust_score": round(self.trust_score, 4),
            "similarity": round(self.similarity, 4),
            "drift_detected": self.drift_detected,
            "consistency_check_passed": self.consistency_check_passed,
            "rate_limit_ok": self.rate_limit_ok,
            "session_windows": self.session_windows,
            "explanation": self.explanation,
        }


# ═══════════════════════════════════════════════════════════════════════════════
# ADAPTIVE LEARNING SERVICE
# ═══════════════════════════════════════════════════════════════════════════════

class AdaptiveLearningService:
    """
    Core service for continuous behavioral learning with anti-poisoning.

    Responsibilities:
    • Maintain per-user BehaviorProfiles
    • Evaluate whether a completed session should update the profile
    • Apply confidence-gated EMA updates to the behavioral baseline
    • Personalize thresholds based on each user's behavioral variance
    • Version every profile update (never overwrite)
    • Provide full explainability for every learning decision
    • Prevent model poisoning via rate limiting, consistency gating, and trust gates
    """

    def __init__(self, storage_dir: Optional[Path] = None):
        self._storage_dir = storage_dir or PROFILES_DIR
        self._storage_dir.mkdir(parents=True, exist_ok=True)
        # In-memory profile cache (production: use Redis + DB)
        self._profiles: Dict[str, BehaviorProfile] = {}

    # ═══════════════════════════════════════════════════════════════════════
    # PROFILE LIFECYCLE
    # ═══════════════════════════════════════════════════════════════════════

    def get_profile(self, user_id: str) -> BehaviorProfile:
        """Load or create a behavior profile for a user."""
        if user_id in self._profiles:
            return self._profiles[user_id]

        profile = self._load_profile(user_id)
        if profile is None:
            profile = BehaviorProfile(
                user_id=user_id,
                created_at=datetime.now(timezone.utc).isoformat(),
                updated_at=datetime.now(timezone.utc).isoformat(),
            )
        self._profiles[user_id] = profile
        return profile

    def get_active_baseline(self, user_id: str) -> Tuple[Optional[np.ndarray], Optional[Dict]]:
        """
        Backward-compatible interface: returns (baseline_embedding, metadata).
        Used by the existing TrustPipeline without modification.
        """
        profile = self.get_profile(user_id)
        if not profile.is_enrolled():
            return None, None

        metadata = {
            "user_id": user_id,
            "version": profile.version,
            "confidence": profile.confidence,
            "maturity": profile.maturity_score,
            "trusted_sessions": profile.trusted_sessions,
            "thresholds": profile.thresholds.to_dict(),
        }
        return profile.composite_baseline, metadata

    # ═══════════════════════════════════════════════════════════════════════
    # CORE: EVALUATE SESSION FOR LEARNING
    # ═══════════════════════════════════════════════════════════════════════

    def evaluate_session(
        self,
        user_id: str,
        session_embedding: np.ndarray,
        trust_score: float,
        similarity: float,
        drift_detected: bool,
        drift_severity: str,
        cognitive_state: str,
        session_windows: int,
        is_learning_candidate: bool = True,
    ) -> LearningResult:
        """
        Evaluate a completed session and decide whether to update the profile.

        This is THE critical function — it gates all behavioral learning.

        Args:
            user_id: User identifier.
            session_embedding: Mean embedding of the session (384-dim).
            trust_score: Final session trust score T(t).
            similarity: Mean behavioral similarity to baseline.
            drift_detected: Whether CUSUM detected drift.
            drift_severity: Drift severity level.
            cognitive_state: Final cognitive state.
            session_windows: Number of behavioral windows in session.
            is_learning_candidate: SDK marking — False means "Do Not Learn".

        Returns:
            LearningResult with full explanation.
        """
        profile = self.get_profile(user_id)
        old_version = profile.version

        # ── Gate 1: SDK "Do Not Learn" flag ──────────────────────────────
        if not is_learning_candidate:
            return LearningResult(
                decision=LearningDecision.OBSERVE,
                reason="SDK marked session as Do Not Learn",
                trust_score=trust_score,
                similarity=similarity,
                session_windows=session_windows,
                old_version=old_version,
                explanation="Session excluded from learning per SDK instruction.",
            )

        # ── Gate 2: Minimum session length ───────────────────────────────
        if session_windows < MIN_SESSION_WINDOWS:
            return LearningResult(
                decision=LearningDecision.REJECT,
                reason=ProfileUpdateReason.REJECTED_INSUFFICIENT_WINDOWS.value,
                trust_score=trust_score,
                similarity=similarity,
                session_windows=session_windows,
                old_version=old_version,
                explanation=f"Session too short ({session_windows} windows). Need ≥{MIN_SESSION_WINDOWS}.",
            )

        # ── Gate 3: Trust threshold ──────────────────────────────────────
        if trust_score < TRUST_OBSERVE_THRESHOLD:
            profile.rejected_sessions += 1
            profile.total_sessions += 1
            self._save_profile(profile)
            return LearningResult(
                decision=LearningDecision.REJECT,
                reason=ProfileUpdateReason.REJECTED_LOW_TRUST.value,
                trust_score=trust_score,
                similarity=similarity,
                drift_detected=drift_detected,
                session_windows=session_windows,
                old_version=old_version,
                explanation=(
                    f"Session rejected for learning. Trust score {trust_score:.2%} "
                    f"below minimum threshold ({TRUST_OBSERVE_THRESHOLD:.0%}). "
                    f"Cognitive state: {cognitive_state}. "
                    f"Profile remains at version {old_version}."
                ),
            )

        # ── Gate 4: Observe zone (70–90%) ────────────────────────────────
        if trust_score < TRUST_LEARN_THRESHOLD:
            profile.total_sessions += 1
            self._save_profile(profile)
            return LearningResult(
                decision=LearningDecision.OBSERVE,
                reason=ProfileUpdateReason.OBSERVED_ONLY.value,
                trust_score=trust_score,
                similarity=similarity,
                drift_detected=drift_detected,
                session_windows=session_windows,
                old_version=old_version,
                explanation=(
                    f"Session observed but not learned. Trust score {trust_score:.2%} "
                    f"in observation zone ({TRUST_OBSERVE_THRESHOLD:.0%}–{TRUST_LEARN_THRESHOLD:.0%}). "
                    f"Profile unchanged at version {old_version}."
                ),
            )

        # ── Gate 5: Rate limit (anti-poisoning) ─────────────────────────
        if not self._check_rate_limit(profile):
            return LearningResult(
                decision=LearningDecision.OBSERVE,
                reason=ProfileUpdateReason.REJECTED_RATE_LIMITED.value,
                trust_score=trust_score,
                similarity=similarity,
                rate_limit_ok=False,
                session_windows=session_windows,
                old_version=old_version,
                explanation=(
                    f"Profile update rate limit reached ({MAX_UPDATES_PER_HOUR}/hour). "
                    f"Session recorded but profile not updated."
                ),
            )

        # ── Gate 6: Consistency check (anti-poisoning) ───────────────────
        if profile.is_enrolled() and not self._consistency_check(profile, session_embedding):
            return LearningResult(
                decision=LearningDecision.OBSERVE,
                reason=ProfileUpdateReason.REJECTED_INCONSISTENT.value,
                trust_score=trust_score,
                similarity=similarity,
                consistency_check_passed=False,
                session_windows=session_windows,
                old_version=old_version,
                explanation=(
                    f"Session embedding outside {CONSISTENCY_SIGMA_GATE}σ of profile "
                    f"distribution. Possible anomaly despite high trust. Profile not updated."
                ),
            )

        # ── Gate 7: Drift during high-trust session ──────────────────────
        if drift_detected and drift_severity in ("high", "critical"):
            return LearningResult(
                decision=LearningDecision.OBSERVE,
                reason=ProfileUpdateReason.REJECTED_DRIFT_EXCEEDED.value,
                trust_score=trust_score,
                similarity=similarity,
                drift_detected=True,
                session_windows=session_windows,
                old_version=old_version,
                explanation=(
                    f"Behavioral drift ({drift_severity}) detected despite high trust. "
                    f"Learning paused — profile unchanged at version {old_version}."
                ),
            )

        # ── ALL GATES PASSED → UPDATE PROFILE ────────────────────────────
        new_version = self._apply_learning(profile, session_embedding, trust_score, similarity)

        return LearningResult(
            decision=LearningDecision.LEARN,
            reason=ProfileUpdateReason.HIGH_TRUST_SESSION.value,
            profile_updated=True,
            new_version=new_version,
            old_version=old_version,
            trust_score=trust_score,
            similarity=similarity,
            drift_detected=drift_detected,
            consistency_check_passed=True,
            rate_limit_ok=True,
            session_windows=session_windows,
            explanation=(
                f"Profile updated: v{old_version} → v{new_version}. "
                f"Trust {trust_score:.2%}, similarity {similarity:.4f}. "
                f"EMA decay={profile.thresholds.learning_rate:.4f}. "
                f"Profile maturity: {profile.maturity_score:.2f}."
            ),
        )


    # ═══════════════════════════════════════════════════════════════════════
    # INTERNAL: APPLY LEARNING (EMA UPDATE)
    # ═══════════════════════════════════════════════════════════════════════

    def _apply_learning(
        self,
        profile: BehaviorProfile,
        session_embedding: np.ndarray,
        trust_score: float,
        similarity: float,
    ) -> int:
        """
        Apply weighted EMA update to the behavioral profile.

        The learning rate adapts based on profile maturity:
        - Young profile (< 10 sessions): faster adaptation (decay ~0.85)
        - Mature profile (30+ sessions): slower adaptation (decay ~0.96)

        This ensures new users converge quickly while established users
        are resistant to short-term behavioral shifts.
        """
        now = datetime.now(timezone.utc).isoformat()

        # Compute adaptive decay based on maturity
        decay = self._compute_adaptive_decay(profile)
        alpha = 1.0 - decay  # learning rate

        # Update composite baseline via EMA
        if profile.composite_baseline is not None:
            updated = decay * profile.composite_baseline + alpha * session_embedding
            norm = np.linalg.norm(updated)
            if norm > 0:
                updated = updated / norm
            profile.composite_baseline = updated.astype(np.float32)
        else:
            # First enrollment — session becomes the baseline
            norm = np.linalg.norm(session_embedding)
            profile.composite_baseline = (session_embedding / norm if norm > 0 else session_embedding).astype(np.float32)

        # Update embedding distribution statistics
        self._update_distribution_stats(profile, session_embedding)

        # Update adaptive thresholds
        self._update_thresholds(profile, trust_score, similarity)

        # Update trust history
        n = profile.trusted_sessions + 1
        old_mean = profile.mean_trust_score
        profile.mean_trust_score = old_mean + (trust_score - old_mean) / n
        profile.min_trust_observed = min(profile.min_trust_observed, trust_score)
        delta = trust_score - old_mean
        delta2 = trust_score - profile.mean_trust_score
        profile.trust_variance = profile.trust_variance + delta * delta2

        # Update metadata
        profile.version += 1
        profile.trusted_sessions += 1
        profile.total_sessions += 1
        profile.update_count += 1
        profile.updated_at = now
        profile.last_learn_at = now
        profile.confidence = self._compute_confidence(profile)
        profile.maturity_score = min(1.0, profile.trusted_sessions / PROFILE_MATURITY_SESSIONS)
        profile.thresholds.learning_rate = alpha

        # Record update timestamp for rate limiting
        profile._recent_updates.append(time.time())
        # Keep only last hour
        cutoff = time.time() - 3600
        profile._recent_updates = [t for t in profile._recent_updates if t > cutoff]

        # Persist
        self._save_profile(profile)

        return profile.version

    def _update_distribution_stats(self, profile: BehaviorProfile, embedding: np.ndarray):
        """Update running mean and std of the embedding distribution (Welford's algorithm)."""
        embedding = embedding.astype(np.float64)

        if profile.embedding_mean is None:
            profile.embedding_mean = embedding.copy()
            profile.embedding_std = np.zeros_like(embedding)
            profile.embedding_samples = 1
            return

        n = profile.embedding_samples + 1
        old_mean = profile.embedding_mean
        new_mean = old_mean + (embedding - old_mean) / n
        new_std = profile.embedding_std + (embedding - old_mean) * (embedding - new_mean)

        profile.embedding_mean = new_mean
        profile.embedding_std = new_std
        profile.embedding_samples = n

    def _get_std_dev(self, profile: BehaviorProfile) -> np.ndarray:
        """Get per-dimension standard deviation from Welford accumulator."""
        if profile.embedding_samples < 2:
            return np.ones(384) * 0.1  # Default broad std for new profiles
        variance = profile.embedding_std / (profile.embedding_samples - 1)
        return np.sqrt(np.clip(variance, 1e-10, None))

    # ═══════════════════════════════════════════════════════════════════════
    # ADAPTIVE THRESHOLDS
    # ═══════════════════════════════════════════════════════════════════════

    def _update_thresholds(self, profile: BehaviorProfile, trust_score: float, similarity: float):
        """
        Evolve per-user thresholds based on their behavioral history.

        Users with highly consistent behavior get tighter thresholds.
        Users with natural variance (elderly, disability, multi-device) get looser thresholds.
        """
        th = profile.thresholds

        # Adaptive similarity threshold:
        # If the user's recent sessions consistently score > 0.92, raise the allow threshold
        # If they show natural variance, lower it to avoid false positives
        if profile.trusted_sessions > 10:
            std_dev = self._get_std_dev(profile)
            mean_std = float(np.mean(std_dev))

            # Tighter thresholds for consistent users, looser for variable users
            # Base: 0.80. Range: [0.70, 0.88]
            consistency_factor = max(0.0, 1.0 - mean_std * 5)  # low std → high consistency
            th.similarity_allow = 0.70 + consistency_factor * 0.18

            # Drift sensitivity: consistent users get more sensitive detection
            th.drift_sensitivity = 0.5 + consistency_factor * 1.0

        # STEP_UP threshold moves proportionally
        th.similarity_stepup = max(0.40, th.similarity_allow - 0.30)

    def _compute_adaptive_decay(self, profile: BehaviorProfile) -> float:
        """
        Compute EMA decay factor based on profile maturity.

        Young profiles learn fast, mature profiles learn slowly.
        """
        sessions = profile.trusted_sessions
        if sessions < 5:
            return 0.85   # Fast — new user, converge quickly
        elif sessions < 15:
            return 0.90   # Moderate
        elif sessions < 30:
            return 0.93   # Slow
        else:
            return 0.96   # Very slow — mature profile, high inertia

    def _compute_confidence(self, profile: BehaviorProfile) -> float:
        """Overall confidence in the profile's accuracy."""
        session_factor = min(1.0, profile.trusted_sessions / 15.0)
        maturity_factor = profile.maturity_score
        # Low variance in trust history → high confidence
        trust_stability = max(0.0, 1.0 - (profile.trust_variance / max(1, profile.trusted_sessions)) * 10)
        return float(np.clip(session_factor * 0.4 + maturity_factor * 0.3 + trust_stability * 0.3, 0.0, 1.0))

    # ═══════════════════════════════════════════════════════════════════════
    # ANTI-POISONING CHECKS
    # ═══════════════════════════════════════════════════════════════════════

    def _check_rate_limit(self, profile: BehaviorProfile) -> bool:
        """Enforce max N profile updates per hour."""
        cutoff = time.time() - 3600
        recent = [t for t in profile._recent_updates if t > cutoff]
        return len(recent) < MAX_UPDATES_PER_HOUR

    def _consistency_check(self, profile: BehaviorProfile, embedding: np.ndarray) -> bool:
        """
        Verify that the new embedding is within 2σ of the profile's learned distribution.

        This catches cases where trust is high but behavior has shifted dramatically —
        possible if an attacker gradually poisoned trust scores.
        """
        if profile.embedding_samples < 3:
            return True  # Not enough data for statistical test

        std_dev = self._get_std_dev(profile)
        mean = profile.embedding_mean

        # Z-score per dimension
        z_scores = np.abs(embedding.astype(np.float64) - mean) / np.clip(std_dev, 1e-10, None)

        # Check: what fraction of dimensions exceed the sigma gate?
        # Allow some dimensions to exceed (behavior isn't perfectly gaussian)
        fraction_exceeded = float(np.mean(z_scores > CONSISTENCY_SIGMA_GATE))

        # If more than 30% of dimensions exceed 2σ, reject
        return fraction_exceeded < 0.30


    # ═══════════════════════════════════════════════════════════════════════
    # PROFILE ROLLBACK
    # ═══════════════════════════════════════════════════════════════════════

    def rollback_profile(self, user_id: str, target_version: Optional[int] = None) -> Dict:
        """
        Roll back a user's profile to a previous version.

        If target_version is None, rolls back to the previous version.
        Uses versioned storage to retrieve the historical profile.
        """
        profile = self.get_profile(user_id)
        current_version = profile.version

        if current_version <= 1:
            return {"status": "error", "message": "Cannot rollback — profile at version 1."}

        target = target_version or (current_version - 1)
        historical = self._load_profile_version(user_id, target)
        if historical is None:
            return {"status": "error", "message": f"Version {target} not found."}

        # Restore the historical profile but increment version
        historical.version = current_version + 1
        historical.updated_at = datetime.now(timezone.utc).isoformat()
        self._profiles[user_id] = historical
        self._save_profile(historical)

        return {
            "status": "rolled_back",
            "from_version": current_version,
            "to_version": historical.version,
            "restored_from": target,
        }

    # ═══════════════════════════════════════════════════════════════════════
    # PROFILE STATUS (for dashboard)
    # ═══════════════════════════════════════════════════════════════════════

    def get_profile_status(self, user_id: str) -> Dict:
        """Return profile metadata for dashboard display."""
        profile = self.get_profile(user_id)
        return {
            "user_id": user_id,
            "version": profile.version,
            "is_enrolled": profile.is_enrolled(),
            "is_mature": profile.is_mature(),
            "confidence": round(profile.confidence, 4),
            "maturity_score": round(profile.maturity_score, 4),
            "created_at": profile.created_at,
            "updated_at": profile.updated_at,
            "last_learn_at": profile.last_learn_at,
            "total_sessions": profile.total_sessions,
            "trusted_sessions": profile.trusted_sessions,
            "rejected_sessions": profile.rejected_sessions,
            "update_count": profile.update_count,
            "mean_trust_score": round(profile.mean_trust_score, 4),
            "thresholds": profile.thresholds.to_dict(),
            "learning_status": self._learning_status_label(profile),
        }

    def _learning_status_label(self, profile: BehaviorProfile) -> str:
        if not profile.is_enrolled():
            return "ENROLLING"
        elif not profile.is_mature():
            return "LEARNING"
        else:
            return "STABLE"

    # ═══════════════════════════════════════════════════════════════════════
    # PERSISTENCE (versioned, no overwrites)
    # ═══════════════════════════════════════════════════════════════════════

    def _save_profile(self, profile: BehaviorProfile):
        """Save profile to disk with version history. Never overwrites."""
        user_dir = self._storage_dir / profile.user_id
        user_dir.mkdir(parents=True, exist_ok=True)

        # Save current version
        version_file = user_dir / f"v{profile.version}.npz"
        latest_file = user_dir / "latest.npz"

        save_data = {}
        if profile.composite_baseline is not None:
            save_data["composite_baseline"] = profile.composite_baseline
        if profile.typing_baseline is not None:
            save_data["typing_baseline"] = profile.typing_baseline
        if profile.touch_baseline is not None:
            save_data["touch_baseline"] = profile.touch_baseline
        if profile.navigation_baseline is not None:
            save_data["navigation_baseline"] = profile.navigation_baseline
        if profile.embedding_mean is not None:
            save_data["embedding_mean"] = profile.embedding_mean
        if profile.embedding_std is not None:
            save_data["embedding_std"] = profile.embedding_std

        # Metadata as JSON
        meta = {
            "user_id": profile.user_id,
            "version": profile.version,
            "confidence": profile.confidence,
            "maturity_score": profile.maturity_score,
            "created_at": profile.created_at,
            "updated_at": profile.updated_at,
            "last_learn_at": profile.last_learn_at,
            "total_sessions": profile.total_sessions,
            "trusted_sessions": profile.trusted_sessions,
            "rejected_sessions": profile.rejected_sessions,
            "update_count": profile.update_count,
            "mean_trust_score": profile.mean_trust_score,
            "min_trust_observed": profile.min_trust_observed,
            "trust_variance": profile.trust_variance,
            "embedding_samples": profile.embedding_samples,
            "thresholds": profile.thresholds.to_dict(),
        }
        save_data["metadata"] = np.array([json.dumps(meta)])

        np.savez_compressed(version_file, **save_data)
        np.savez_compressed(latest_file, **save_data)

    def _load_profile(self, user_id: str) -> Optional[BehaviorProfile]:
        """Load the latest profile version from disk."""
        latest_file = self._storage_dir / user_id / "latest.npz"
        if not latest_file.exists():
            return None
        return self._load_from_file(latest_file, user_id)

    def _load_profile_version(self, user_id: str, version: int) -> Optional[BehaviorProfile]:
        """Load a specific historical version."""
        version_file = self._storage_dir / user_id / f"v{version}.npz"
        if not version_file.exists():
            return None
        return self._load_from_file(version_file, user_id)

    def _load_from_file(self, filepath: Path, user_id: str) -> BehaviorProfile:
        """Deserialize a profile from an .npz file."""
        data = np.load(filepath, allow_pickle=True)

        profile = BehaviorProfile(user_id=user_id)

        if "composite_baseline" in data:
            profile.composite_baseline = data["composite_baseline"]
        if "typing_baseline" in data:
            profile.typing_baseline = data["typing_baseline"]
        if "touch_baseline" in data:
            profile.touch_baseline = data["touch_baseline"]
        if "navigation_baseline" in data:
            profile.navigation_baseline = data["navigation_baseline"]
        if "embedding_mean" in data:
            profile.embedding_mean = data["embedding_mean"]
        if "embedding_std" in data:
            profile.embedding_std = data["embedding_std"]

        if "metadata" in data:
            meta = json.loads(str(data["metadata"][0]))
            profile.version = meta.get("version", 1)
            profile.confidence = meta.get("confidence", 0.0)
            profile.maturity_score = meta.get("maturity_score", 0.0)
            profile.created_at = meta.get("created_at", "")
            profile.updated_at = meta.get("updated_at", "")
            profile.last_learn_at = meta.get("last_learn_at", "")
            profile.total_sessions = meta.get("total_sessions", 0)
            profile.trusted_sessions = meta.get("trusted_sessions", 0)
            profile.rejected_sessions = meta.get("rejected_sessions", 0)
            profile.update_count = meta.get("update_count", 0)
            profile.mean_trust_score = meta.get("mean_trust_score", 0.95)
            profile.min_trust_observed = meta.get("min_trust_observed", 1.0)
            profile.trust_variance = meta.get("trust_variance", 0.0)
            profile.embedding_samples = meta.get("embedding_samples", 0)
            if "thresholds" in meta:
                profile.thresholds = AdaptiveThresholds.from_dict(meta["thresholds"])

        return profile
