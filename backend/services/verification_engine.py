"""
Adaptive Verification Engine
==============================
Risk-based adaptive authentication that dynamically selects verification
methods based on WHY trust decreased — not generic OTP/fingerprint.

RISK LEVELS:
    Trust > 90%     → No verification
    Trust 70–90%    → Passive observation only
    Trust 50–70%    → Adaptive Voice Challenge (ECAPA-TDNN speaker verification)
    Trust < 50%     → Face Liveness Challenge (MediaPipe + embedding comparison)
    Critical (<30%) → Hold transaction + notify backend

RESPONSIBILITIES:
    1. Analyze verification reason (drift, cognitive, transaction, anomaly)
    2. Select best challenge method based on risk source
    3. Execute challenge via appropriate biometric pipeline
    4. Recover trust on success
    5. Log full verification history with explainability

ANTI-SPOOFING:
    - Voice: replay detection via spectral analysis + random phrase generation
    - Face: liveness detection (blink, smile, head turn) + anti-photo checks
    - Delegates: independent behavioral profile matching
"""

import time
import uuid
import hashlib
import numpy as np
from enum import Enum
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, field, asdict

from backend.services.providers.registry import ProviderRegistry
from backend.services.providers.interfaces import VerificationResult as ProviderResult


# ═══════════════════════════════════════════════════════════════════════════════
# ENUMS & TYPES
# ═══════════════════════════════════════════════════════════════════════════════

class VerificationType(str, Enum):
    NONE = "NONE"
    PASSIVE_OBSERVE = "PASSIVE_OBSERVE"
    VOICE_CHALLENGE = "VOICE_CHALLENGE"
    FACE_LIVENESS = "FACE_LIVENESS"
    DELEGATE_VERIFY = "DELEGATE_VERIFY"
    HOLD_AND_NOTIFY = "HOLD_AND_NOTIFY"


class VerificationStatus(str, Enum):
    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"
    EXPIRED = "EXPIRED"
    HELD = "HELD"


class RiskSource(str, Enum):
    BEHAVIORAL_DRIFT = "behavioral_drift"
    COGNITIVE_DISTRESS = "cognitive_distress"
    TRANSACTION_RISK = "transaction_risk"
    ANOMALY_DETECTED = "anomaly_detected"
    VELOCITY_DECLINE = "velocity_decline"
    ROBOTIC_BEHAVIOR = "robotic_behavior"
    COERCION_DETECTED = "coercion_detected"
    UNKNOWN_DEVICE = "unknown_device"


# ═══════════════════════════════════════════════════════════════════════════════
# VOICE CHALLENGE PHRASES (random selection for replay prevention)
# ═══════════════════════════════════════════════════════════════════════════════

VOICE_CHALLENGE_PHRASES = [
    "My voice is my identity",
    "Transfer confirmed by voice",
    "Secure banking verification",
    "I authorize this transaction",
    "Safety check complete now",
    "Verify my account access",
    "Trusted voice authentication",
    "Confirm identity by speaking",
    "Banking security voiceprint",
    "Personal verification phrase",
    "Authenticate my session now",
    "Voice identity confirmed here",
]

# ═══════════════════════════════════════════════════════════════════════════════
# FACE LIVENESS CHALLENGES
# ═══════════════════════════════════════════════════════════════════════════════

class FaceLivenessAction(str, Enum):
    BLINK = "blink"
    SMILE = "smile"
    TURN_LEFT = "turn_left"
    TURN_RIGHT = "turn_right"
    NOD = "nod"
    RAISE_EYEBROWS = "raise_eyebrows"


FACE_LIVENESS_SEQUENCES = [
    [FaceLivenessAction.BLINK, FaceLivenessAction.SMILE],
    [FaceLivenessAction.TURN_LEFT, FaceLivenessAction.BLINK],
    [FaceLivenessAction.SMILE, FaceLivenessAction.TURN_RIGHT],
    [FaceLivenessAction.BLINK, FaceLivenessAction.NOD],
    [FaceLivenessAction.RAISE_EYEBROWS, FaceLivenessAction.SMILE],
]


# ═══════════════════════════════════════════════════════════════════════════════
# DATA STRUCTURES
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class VoiceProfile:
    """Enrolled speaker voiceprint (ECAPA-TDNN 192-dim embedding)."""
    user_id: str
    embedding: Optional[np.ndarray] = None  # 192-dim speaker embedding
    sample_count: int = 0
    created_at: str = ""
    updated_at: str = ""
    is_active: bool = True


@dataclass
class FaceProfile:
    """Enrolled face template (FaceNet/InsightFace 128/512-dim embedding)."""
    user_id: str
    embedding: Optional[np.ndarray] = None  # 128-dim or 512-dim face embedding
    sample_count: int = 0
    created_at: str = ""
    updated_at: str = ""
    is_active: bool = True


@dataclass
class TrustedDelegate:
    """
    A trusted delegate who may legitimately use the account.
    Each delegate has independent biometric profiles.
    """
    delegate_id: str
    primary_user_id: str
    name: str
    relationship: str           # "spouse", "child", "parent", "caretaker", "business_partner"
    voice_profile: Optional[VoiceProfile] = None
    face_profile: Optional[FaceProfile] = None
    behavioral_baseline: Optional[np.ndarray] = None  # 384-dim behavioral identity
    is_active: bool = True
    verified_at: str = ""
    created_at: str = ""


@dataclass
class VerificationChallenge:
    """A verification challenge issued to the user."""
    challenge_id: str
    user_id: str
    session_id: str
    verification_type: VerificationType
    risk_source: RiskSource
    status: VerificationStatus = VerificationStatus.PENDING
    trust_before: float = 0.0
    trust_after: float = 0.0
    confidence: float = 0.0
    latency_ms: float = 0.0
    # Voice-specific
    phrase: str = ""
    # Face-specific
    liveness_actions: List[str] = field(default_factory=list)
    # Delegate-specific
    matched_delegate_id: str = ""
    # Explainability
    reason: str = ""
    explanation: str = ""
    # Timestamps
    created_at: str = ""
    completed_at: str = ""
    expires_at: str = ""

    def to_dict(self) -> Dict:
        return {
            "challenge_id": self.challenge_id,
            "user_id": self.user_id,
            "session_id": self.session_id,
            "verification_type": self.verification_type.value,
            "risk_source": self.risk_source.value,
            "status": self.status.value,
            "trust_before": round(self.trust_before, 4),
            "trust_after": round(self.trust_after, 4),
            "confidence": round(self.confidence, 4),
            "latency_ms": round(self.latency_ms, 1),
            "phrase": self.phrase,
            "liveness_actions": self.liveness_actions,
            "matched_delegate_id": self.matched_delegate_id,
            "reason": self.reason,
            "explanation": self.explanation,
            "created_at": self.created_at,
            "completed_at": self.completed_at,
        }


# ═══════════════════════════════════════════════════════════════════════════════
# ADAPTIVE VERIFICATION ENGINE
# ═══════════════════════════════════════════════════════════════════════════════

class AdaptiveVerificationEngine:
    """
    Core engine: analyzes risk → selects challenge → executes → recovers trust.

    Selection logic:
        1. Determine risk source (WHY trust dropped)
        2. Map risk level to verification tier
        3. Select optimal challenge based on risk source
        4. Issue challenge with anti-replay protections
        5. Verify response against enrolled profiles
        6. Recover trust proportionally to verification confidence
    """

    # Trust recovery amounts on successful verification
    TRUST_RECOVERY_VOICE = 0.25       # Voice success → +25% trust recovery
    TRUST_RECOVERY_FACE = 0.35        # Face success → +35% trust recovery
    TRUST_RECOVERY_DELEGATE = 0.20    # Delegate match → +20% trust recovery

    # Verification timeouts
    VOICE_TIMEOUT_S = 30
    FACE_TIMEOUT_S = 45
    CHALLENGE_EXPIRY_S = 120

    def __init__(self):
        self._voice_profiles: Dict[str, VoiceProfile] = {}
        self._face_profiles: Dict[str, FaceProfile] = {}
        self._delegates: Dict[str, List[TrustedDelegate]] = {}  # user_id → delegates
        self._active_challenges: Dict[str, VerificationChallenge] = {}  # challenge_id → challenge
        self._verification_history: Dict[str, List[VerificationChallenge]] = {}  # user_id → history

        # Provider registry — concrete implementations injected here
        self._registry = ProviderRegistry()
        self._init_mock_providers()

    # ═══════════════════════════════════════════════════════════════════════
    # CORE: ANALYZE & SELECT VERIFICATION METHOD
    # ═══════════════════════════════════════════════════════════════════════

    def analyze_and_select(
        self,
        user_id: str,
        session_id: str,
        trust_score: float,
        cognitive_state: str,
        drift_detected: bool,
        drift_severity: str,
        velocity: float,
        anomaly_score: float,
        transaction_amount: float,
        reasons: List[str],
    ) -> VerificationChallenge:
        """
        Analyze the current risk state and select the optimal verification method.

        This is THE entry point called by the decision service when STEP_UP is triggered.

        Returns a VerificationChallenge ready to be sent to the client.
        """
        t_start = time.perf_counter()
        now = datetime.now(timezone.utc).isoformat()

        # Step 1: Determine primary risk source
        risk_source = self._identify_risk_source(
            cognitive_state, drift_detected, drift_severity,
            velocity, anomaly_score, transaction_amount, reasons
        )

        # Step 2: Select verification type based on trust level + risk source
        verification_type = self._select_verification_type(
            trust_score, risk_source, cognitive_state, user_id
        )

        # Step 3: Build the challenge
        challenge = VerificationChallenge(
            challenge_id=str(uuid.uuid4()),
            user_id=user_id,
            session_id=session_id,
            verification_type=verification_type,
            risk_source=risk_source,
            trust_before=trust_score,
            created_at=now,
        )

        # Step 4: Configure challenge-specific parameters
        if verification_type == VerificationType.VOICE_CHALLENGE:
            challenge.phrase = self._generate_voice_phrase()
            challenge.reason = f"Behavioral anomaly detected (source: {risk_source.value})"
            challenge.explanation = (
                f"Trust score {trust_score:.0%} requires voice verification. "
                f"Risk source: {risk_source.value}. "
                f"Please speak the displayed phrase to confirm your identity."
            )

        elif verification_type == VerificationType.FACE_LIVENESS:
            actions = self._generate_liveness_sequence()
            challenge.liveness_actions = [a.value for a in actions]
            challenge.reason = f"Critical risk — face liveness required (source: {risk_source.value})"
            challenge.explanation = (
                f"Trust score {trust_score:.0%} requires face liveness verification. "
                f"Risk source: {risk_source.value}. "
                f"Please complete the facial actions shown on screen."
            )

        elif verification_type == VerificationType.HOLD_AND_NOTIFY:
            challenge.status = VerificationStatus.HELD
            challenge.reason = f"Critical risk — transaction held (source: {risk_source.value})"
            challenge.explanation = (
                f"Trust score {trust_score:.0%} is critically low. "
                f"Transaction has been held and security team notified. "
                f"Risk source: {risk_source.value}. Cognitive state: {cognitive_state}."
            )

        elif verification_type == VerificationType.DELEGATE_VERIFY:
            challenge.reason = "Behavior matches trusted delegate — verifying delegate identity"
            challenge.explanation = (
                f"Behavioral patterns suggest a trusted delegate is using the account. "
                f"Delegate verification initiated instead of blocking."
            )

        elif verification_type == VerificationType.PASSIVE_OBSERVE:
            challenge.status = VerificationStatus.SUCCESS
            challenge.reason = "Elevated risk — passive observation active"
            challenge.explanation = (
                f"Trust score {trust_score:.0%} in observation zone. "
                f"No active verification required. Monitoring continues."
            )
            challenge.trust_after = trust_score
            challenge.confidence = 1.0

        else:
            challenge.status = VerificationStatus.SUCCESS
            challenge.trust_after = trust_score
            challenge.confidence = 1.0

        challenge.latency_ms = (time.perf_counter() - t_start) * 1000

        # Register active challenge
        if challenge.status == VerificationStatus.PENDING:
            self._active_challenges[challenge.challenge_id] = challenge

        # Log to history
        self._verification_history.setdefault(user_id, []).append(challenge)

        return challenge

    # ═══════════════════════════════════════════════════════════════════════
    # STEP 1: IDENTIFY RISK SOURCE
    # ═══════════════════════════════════════════════════════════════════════

    def _identify_risk_source(
        self,
        cognitive_state: str,
        drift_detected: bool,
        drift_severity: str,
        velocity: float,
        anomaly_score: float,
        transaction_amount: float,
        reasons: List[str],
    ) -> RiskSource:
        """Determine the PRIMARY reason trust decreased."""
        # Priority ordering — most severe first
        if cognitive_state == "coerced":
            return RiskSource.COERCION_DETECTED
        if cognitive_state == "robotic":
            return RiskSource.ROBOTIC_BEHAVIOR
        if cognitive_state in ("panicked", "distressed"):
            return RiskSource.COGNITIVE_DISTRESS
        if drift_detected and drift_severity in ("high", "critical"):
            return RiskSource.BEHAVIORAL_DRIFT
        if anomaly_score > 0.7:
            return RiskSource.ANOMALY_DETECTED
        if velocity < -0.03:
            return RiskSource.VELOCITY_DECLINE
        if transaction_amount > 50000:
            return RiskSource.TRANSACTION_RISK
        if drift_detected:
            return RiskSource.BEHAVIORAL_DRIFT
        return RiskSource.BEHAVIORAL_DRIFT  # Default fallback


    # ═══════════════════════════════════════════════════════════════════════
    # STEP 2: SELECT VERIFICATION TYPE
    # ═══════════════════════════════════════════════════════════════════════

    def _select_verification_type(
        self,
        trust_score: float,
        risk_source: RiskSource,
        cognitive_state: str,
        user_id: str,
    ) -> VerificationType:
        """
        Select optimal verification method based on trust level + risk source.

        Intelligent selection:
        - Coercion/robotic → always HOLD (user may be compromised)
        - Critical trust → Face liveness (strongest assurance)
        - Moderate risk → Voice challenge (low friction, fast)
        - Mild risk → Passive observation (zero friction)
        - Delegate detected → Delegate verification (not block)
        """
        # Critical: coercion or robotic → hold immediately
        if risk_source in (RiskSource.COERCION_DETECTED, RiskSource.ROBOTIC_BEHAVIOR):
            return VerificationType.HOLD_AND_NOTIFY

        # Check if behavior might match a trusted delegate
        if self._has_delegates(user_id) and risk_source == RiskSource.BEHAVIORAL_DRIFT:
            return VerificationType.DELEGATE_VERIFY

        # Critical trust (< 30%) → hold
        if trust_score < 0.30:
            return VerificationType.HOLD_AND_NOTIFY

        # Low trust (30–50%) → face liveness (highest assurance)
        if trust_score < 0.50:
            return VerificationType.FACE_LIVENESS

        # Moderate trust (50–70%) → voice challenge (lower friction)
        if trust_score < 0.70:
            return VerificationType.VOICE_CHALLENGE

        # Elevated trust (70–90%) → passive observation
        if trust_score < 0.90:
            return VerificationType.PASSIVE_OBSERVE

        # High trust → no verification
        return VerificationType.NONE

    # ═══════════════════════════════════════════════════════════════════════
    # VOICE VERIFICATION
    # ═══════════════════════════════════════════════════════════════════════

    def _generate_voice_phrase(self) -> str:
        """Generate a random phrase for voice challenge (anti-replay)."""
        import random
        # Add a unique nonce to prevent replay attacks
        phrase = random.choice(VOICE_CHALLENGE_PHRASES)
        nonce = str(uuid.uuid4())[:4].upper()
        return f"{phrase}. Code: {nonce}"

    def verify_voice(
        self,
        challenge_id: str,
        audio_embedding: np.ndarray,
        spectral_features: Optional[Dict] = None,
    ) -> Dict:
        """
        Verify a voice challenge response.

        Args:
            challenge_id: The active challenge ID.
            audio_embedding: 192-dim ECAPA-TDNN speaker embedding from the audio.
            spectral_features: Optional spectral analysis for replay detection.

        Returns:
            Verification result with trust recovery amount.
        """
        t_start = time.perf_counter()
        challenge = self._active_challenges.get(challenge_id)

        if not challenge:
            return {"status": "error", "message": "Challenge not found or expired"}

        if challenge.verification_type != VerificationType.VOICE_CHALLENGE:
            return {"status": "error", "message": "Wrong verification type for this challenge"}

        # Get enrolled voice profile
        voice_profile = self._voice_profiles.get(challenge.user_id)
        if not voice_profile or voice_profile.embedding is None:
            # No enrolled voice — accept with lower confidence
            challenge.status = VerificationStatus.SUCCESS
            challenge.confidence = 0.60
            challenge.trust_after = min(1.0, challenge.trust_before + self.TRUST_RECOVERY_VOICE * 0.5)
            challenge.explanation += " Note: No enrolled voiceprint — verification accepted with reduced confidence."
            challenge.completed_at = datetime.now(timezone.utc).isoformat()
            challenge.latency_ms = (time.perf_counter() - t_start) * 1000
            self._active_challenges.pop(challenge_id, None)
            return challenge.to_dict()

        # Cosine similarity between submitted audio and enrolled voiceprint
        similarity = float(np.dot(
            audio_embedding / np.linalg.norm(audio_embedding),
            voice_profile.embedding / np.linalg.norm(voice_profile.embedding)
        ))

        # Replay detection
        is_replay = self._detect_voice_replay(spectral_features) if spectral_features else False

        from backend.core.config import VOICE_SIMILARITY_THRESHOLD
        if is_replay:
            challenge.status = VerificationStatus.FAILED
            challenge.confidence = 0.0
            challenge.trust_after = challenge.trust_before  # No recovery
            challenge.explanation += " REPLAY ATTACK DETECTED. Verification failed."
        elif similarity >= VOICE_SIMILARITY_THRESHOLD:
            challenge.status = VerificationStatus.SUCCESS
            challenge.confidence = min(1.0, similarity)
            recovery = self.TRUST_RECOVERY_VOICE * challenge.confidence
            challenge.trust_after = min(1.0, challenge.trust_before + recovery)
            challenge.explanation += (
                f" Voice match confirmed (similarity={similarity:.4f}). "
                f"Trust recovered: {challenge.trust_before:.0%} → {challenge.trust_after:.0%}."
            )
        else:
            challenge.status = VerificationStatus.FAILED
            challenge.confidence = similarity
            challenge.trust_after = max(0.0, challenge.trust_before - 0.10)  # Trust penalty on failure
            challenge.explanation += (
                f" Voice mismatch (similarity={similarity:.4f}, threshold={VOICE_SIMILARITY_THRESHOLD}). "
                f"Verification failed. Trust reduced."
            )

        challenge.completed_at = datetime.now(timezone.utc).isoformat()
        challenge.latency_ms = (time.perf_counter() - t_start) * 1000
        self._active_challenges.pop(challenge_id, None)
        return challenge.to_dict()

    def _detect_voice_replay(self, spectral_features: Optional[Dict]) -> bool:
        """
        Detect replay attacks via spectral analysis.

        Real speech has natural spectral variation; replayed audio from speakers
        shows characteristic compression artifacts and frequency response patterns.
        """
        if not spectral_features:
            return False

        # Check for unnaturally flat spectral envelope (speaker playback)
        spectral_flatness = spectral_features.get("spectral_flatness", 0.0)
        spectral_bandwidth = spectral_features.get("spectral_bandwidth", 0.0)

        # Replayed audio typically has lower bandwidth and higher flatness
        if spectral_flatness > 0.85 and spectral_bandwidth < 2000:
            return True

        return False


    # ═══════════════════════════════════════════════════════════════════════
    # FACE LIVENESS VERIFICATION
    # ═══════════════════════════════════════════════════════════════════════

    def _generate_liveness_sequence(self) -> List[FaceLivenessAction]:
        """Generate a random liveness action sequence (anti-photo/video)."""
        import random
        return random.choice(FACE_LIVENESS_SEQUENCES)

    def verify_face(
        self,
        challenge_id: str,
        face_embedding: np.ndarray,
        liveness_results: Dict,
    ) -> Dict:
        """
        Verify a face liveness challenge response.

        Args:
            challenge_id: Active challenge ID.
            face_embedding: 128/512-dim face embedding from the captured frame.
            liveness_results: Dict with action completion status:
                {"blink": True, "smile": True, "confidence": 0.94}

        Returns:
            Verification result with trust recovery.
        """
        t_start = time.perf_counter()
        challenge = self._active_challenges.get(challenge_id)

        if not challenge:
            return {"status": "error", "message": "Challenge not found or expired"}

        if challenge.verification_type != VerificationType.FACE_LIVENESS:
            return {"status": "error", "message": "Wrong verification type for this challenge"}

        face_profile = self._face_profiles.get(challenge.user_id)

        # Liveness check
        liveness_confidence = liveness_results.get("confidence", 0.0)
        actions_completed = liveness_results.get("actions_completed", 0)
        actions_required = len(challenge.liveness_actions)
        liveness_passed = (
            liveness_confidence >= 0.80
            and actions_completed >= actions_required
        )

        if not liveness_passed:
            challenge.status = VerificationStatus.FAILED
            challenge.confidence = liveness_confidence
            challenge.trust_after = max(0.0, challenge.trust_before - 0.15)
            challenge.explanation += (
                f" Liveness check failed (confidence={liveness_confidence:.2f}, "
                f"actions={actions_completed}/{actions_required}). "
                f"Possible photo/video attack."
            )
            challenge.completed_at = datetime.now(timezone.utc).isoformat()
            challenge.latency_ms = (time.perf_counter() - t_start) * 1000
            self._active_challenges.pop(challenge_id, None)
            return challenge.to_dict()

        # Face embedding comparison (if enrolled)
        if face_profile and face_profile.embedding is not None:
            similarity = float(np.dot(
                face_embedding / np.linalg.norm(face_embedding),
                face_profile.embedding / np.linalg.norm(face_profile.embedding)
            ))
            from backend.core.config import FACE_SIMILARITY_THRESHOLD
            face_matched = similarity >= FACE_SIMILARITY_THRESHOLD
        else:
            similarity = 0.0
            face_matched = True  # No enrolled face — accept with reduced confidence
            liveness_confidence *= 0.7

        if face_matched:
            challenge.status = VerificationStatus.SUCCESS
            challenge.confidence = min(1.0, liveness_confidence * (0.5 + 0.5 * similarity))
            recovery = self.TRUST_RECOVERY_FACE * challenge.confidence
            challenge.trust_after = min(1.0, challenge.trust_before + recovery)
            challenge.explanation += (
                f" Face liveness passed (confidence={liveness_confidence:.2f}). "
                f"Face similarity={similarity:.4f}. "
                f"Trust recovered: {challenge.trust_before:.0%} → {challenge.trust_after:.0%}."
            )
        else:
            challenge.status = VerificationStatus.FAILED
            challenge.confidence = similarity
            challenge.trust_after = max(0.0, challenge.trust_before - 0.20)
            challenge.explanation += (
                f" Face mismatch (similarity={similarity:.4f}). "
                f"Liveness passed but identity not confirmed. Trust reduced."
            )

        challenge.completed_at = datetime.now(timezone.utc).isoformat()
        challenge.latency_ms = (time.perf_counter() - t_start) * 1000
        self._active_challenges.pop(challenge_id, None)
        return challenge.to_dict()

    # ═══════════════════════════════════════════════════════════════════════
    # TRUSTED DELEGATE VERIFICATION
    # ═══════════════════════════════════════════════════════════════════════

    def _has_delegates(self, user_id: str) -> bool:
        """Check if user has registered trusted delegates."""
        delegates = self._delegates.get(user_id, [])
        return len(delegates) > 0

    def register_delegate(
        self,
        primary_user_id: str,
        name: str,
        relationship: str,
        voice_embedding: Optional[np.ndarray] = None,
        face_embedding: Optional[np.ndarray] = None,
        behavioral_baseline: Optional[np.ndarray] = None,
    ) -> TrustedDelegate:
        """Register a new trusted delegate for a user."""
        delegate = TrustedDelegate(
            delegate_id=str(uuid.uuid4()),
            primary_user_id=primary_user_id,
            name=name,
            relationship=relationship,
            created_at=datetime.now(timezone.utc).isoformat(),
            verified_at=datetime.now(timezone.utc).isoformat(),
        )
        if voice_embedding is not None:
            delegate.voice_profile = VoiceProfile(
                user_id=delegate.delegate_id,
                embedding=voice_embedding,
                sample_count=1,
                created_at=delegate.created_at,
            )
        if face_embedding is not None:
            delegate.face_profile = FaceProfile(
                user_id=delegate.delegate_id,
                embedding=face_embedding,
                sample_count=1,
                created_at=delegate.created_at,
            )
        if behavioral_baseline is not None:
            delegate.behavioral_baseline = behavioral_baseline

        self._delegates.setdefault(primary_user_id, []).append(delegate)
        return delegate

    def verify_delegate(
        self,
        challenge_id: str,
        behavioral_embedding: Optional[np.ndarray] = None,
        voice_embedding: Optional[np.ndarray] = None,
        face_embedding: Optional[np.ndarray] = None,
    ) -> Dict:
        """
        Verify if current user matches a registered delegate.

        Checks behavioral, voice, and face similarity against all delegates.
        """
        t_start = time.perf_counter()
        challenge = self._active_challenges.get(challenge_id)

        if not challenge:
            return {"status": "error", "message": "Challenge not found or expired"}

        delegates = self._delegates.get(challenge.user_id, [])
        best_match = None
        best_score = 0.0

        for delegate in delegates:
            if not delegate.is_active:
                continue

            score = 0.0
            checks = 0

            # Behavioral match
            if behavioral_embedding is not None and delegate.behavioral_baseline is not None:
                sim = float(np.dot(
                    behavioral_embedding / np.linalg.norm(behavioral_embedding),
                    delegate.behavioral_baseline / np.linalg.norm(delegate.behavioral_baseline)
                ))
                score += sim
                checks += 1

            # Voice match
            if voice_embedding is not None and delegate.voice_profile and delegate.voice_profile.embedding is not None:
                sim = float(np.dot(
                    voice_embedding / np.linalg.norm(voice_embedding),
                    delegate.voice_profile.embedding / np.linalg.norm(delegate.voice_profile.embedding)
                ))
                score += sim
                checks += 1

            # Face match
            if face_embedding is not None and delegate.face_profile and delegate.face_profile.embedding is not None:
                sim = float(np.dot(
                    face_embedding / np.linalg.norm(face_embedding),
                    delegate.face_profile.embedding / np.linalg.norm(delegate.face_profile.embedding)
                ))
                score += sim
                checks += 1

            if checks > 0:
                avg_score = score / checks
                if avg_score > best_score:
                    best_score = avg_score
                    best_match = delegate

        if best_match and best_score >= 0.70:
            challenge.status = VerificationStatus.SUCCESS
            challenge.confidence = best_score
            challenge.matched_delegate_id = best_match.delegate_id
            recovery = self.TRUST_RECOVERY_DELEGATE * best_score
            challenge.trust_after = min(1.0, challenge.trust_before + recovery)
            challenge.explanation += (
                f" Trusted delegate '{best_match.name}' ({best_match.relationship}) confirmed. "
                f"Match score={best_score:.4f}. Trust recovered."
            )
        else:
            challenge.status = VerificationStatus.FAILED
            challenge.confidence = best_score
            challenge.trust_after = challenge.trust_before
            challenge.explanation += (
                f" No delegate match found (best score={best_score:.4f}). "
                f"Verification remains pending."
            )

        challenge.completed_at = datetime.now(timezone.utc).isoformat()
        challenge.latency_ms = (time.perf_counter() - t_start) * 1000
        self._active_challenges.pop(challenge_id, None)
        return challenge.to_dict()


    # ═══════════════════════════════════════════════════════════════════════
    # PROFILE ENROLLMENT
    # ═══════════════════════════════════════════════════════════════════════

    def enroll_voice(self, user_id: str, embedding: np.ndarray) -> Dict:
        """Enroll or update a user's voice profile."""
        profile = self._voice_profiles.get(user_id)
        if profile:
            # EMA update existing profile
            decay = 0.90
            profile.embedding = decay * profile.embedding + (1 - decay) * embedding
            norm = np.linalg.norm(profile.embedding)
            if norm > 0:
                profile.embedding = profile.embedding / norm
            profile.sample_count += 1
            profile.updated_at = datetime.now(timezone.utc).isoformat()
        else:
            norm = np.linalg.norm(embedding)
            profile = VoiceProfile(
                user_id=user_id,
                embedding=(embedding / norm if norm > 0 else embedding).astype(np.float32),
                sample_count=1,
                created_at=datetime.now(timezone.utc).isoformat(),
                updated_at=datetime.now(timezone.utc).isoformat(),
            )
        self._voice_profiles[user_id] = profile
        return {"status": "enrolled", "sample_count": profile.sample_count}

    def enroll_face(self, user_id: str, embedding: np.ndarray) -> Dict:
        """Enroll or update a user's face profile."""
        profile = self._face_profiles.get(user_id)
        if profile:
            decay = 0.90
            profile.embedding = decay * profile.embedding + (1 - decay) * embedding
            norm = np.linalg.norm(profile.embedding)
            if norm > 0:
                profile.embedding = profile.embedding / norm
            profile.sample_count += 1
            profile.updated_at = datetime.now(timezone.utc).isoformat()
        else:
            norm = np.linalg.norm(embedding)
            profile = FaceProfile(
                user_id=user_id,
                embedding=(embedding / norm if norm > 0 else embedding).astype(np.float32),
                sample_count=1,
                created_at=datetime.now(timezone.utc).isoformat(),
                updated_at=datetime.now(timezone.utc).isoformat(),
            )
        self._face_profiles[user_id] = profile
        return {"status": "enrolled", "sample_count": profile.sample_count}

    # ═══════════════════════════════════════════════════════════════════════
    # QUERIES & HISTORY
    # ═══════════════════════════════════════════════════════════════════════

    def get_verification_history(self, user_id: str, limit: int = 50) -> List[Dict]:
        """Get verification history for a user."""
        history = self._verification_history.get(user_id, [])
        return [c.to_dict() for c in history[-limit:]]

    def get_active_challenge(self, user_id: str) -> Optional[Dict]:
        """Get any active/pending challenge for a user."""
        for challenge in self._active_challenges.values():
            if challenge.user_id == user_id and challenge.status == VerificationStatus.PENDING:
                return challenge.to_dict()
        return None

    def get_delegates(self, user_id: str) -> List[Dict]:
        """List all trusted delegates for a user."""
        delegates = self._delegates.get(user_id, [])
        return [
            {
                "delegate_id": d.delegate_id,
                "name": d.name,
                "relationship": d.relationship,
                "has_voice": d.voice_profile is not None,
                "has_face": d.face_profile is not None,
                "has_behavioral": d.behavioral_baseline is not None,
                "is_active": d.is_active,
                "verified_at": d.verified_at,
            }
            for d in delegates
        ]

    def get_engine_status(self) -> Dict:
        """Return engine status for monitoring."""
        return {
            "enrolled_voice_profiles": len(self._voice_profiles),
            "enrolled_face_profiles": len(self._face_profiles),
            "total_delegates": sum(len(d) for d in self._delegates.values()),
            "active_challenges": len(self._active_challenges),
            "total_verifications": sum(len(h) for h in self._verification_history.values()),
        }


    # ═══════════════════════════════════════════════════════════════════════
    # PROVIDER INITIALIZATION (mock providers for demo/development)
    # ═══════════════════════════════════════════════════════════════════════

    def _init_mock_providers(self):
        """
        Register providers: prefer production AI providers if dependencies are available,
        fall back to mock providers for demo/development mode.
        """
        # Try loading production providers (SpeechBrain, InsightFace, MediaPipe)
        voice_verifier = None
        voice_enrollment = None
        face_verifier = None
        face_enrollment = None
        liveness = None

        try:
            from backend.services.providers.speechbrain_provider import (
                SpeechBrainVoiceProvider, SpeechBrainEnrollmentProvider,
            )
            voice_verifier = SpeechBrainVoiceProvider()
            voice_enrollment = SpeechBrainEnrollmentProvider()
            print("[AEGIS-X] ✓ SpeechBrain voice providers registered.")
        except Exception as e:
            print(f"[AEGIS-X] SpeechBrain unavailable ({e}), using mock voice provider.")

        try:
            from backend.services.providers.insightface_provider import (
                InsightFaceVerificationProvider, InsightFaceEnrollmentProvider,
            )
            face_verifier = InsightFaceVerificationProvider()
            face_enrollment = InsightFaceEnrollmentProvider()
            print("[AEGIS-X] ✓ InsightFace face providers registered.")
        except Exception as e:
            print(f"[AEGIS-X] InsightFace unavailable ({e}), using mock face provider.")

        try:
            from backend.services.providers.mediapipe_provider import MediaPipeLivenessProvider
            liveness = MediaPipeLivenessProvider()
            print("[AEGIS-X] ✓ MediaPipe liveness provider registered.")
        except Exception as e:
            print(f"[AEGIS-X] MediaPipe unavailable ({e}), using mock liveness provider.")

        # Fall back to mocks for any unavailable providers
        from backend.services.providers.mock_providers import (
            MockVoiceVerificationProvider,
            MockFaceVerificationProvider,
            MockLivenessProvider,
            MockVoiceEnrollmentProvider,
            MockFaceEnrollmentProvider,
            MockDelegateVerificationProvider,
        )

        self._registry.register_voice_verifier(voice_verifier or MockVoiceVerificationProvider())
        self._registry.register_face_verifier(face_verifier or MockFaceVerificationProvider())
        self._registry.register_liveness(liveness or MockLivenessProvider())
        self._registry.register_voice_enrollment(voice_enrollment or MockVoiceEnrollmentProvider())
        self._registry.register_face_enrollment(face_enrollment or MockFaceEnrollmentProvider())
        self._registry.register_delegate_verifier(MockDelegateVerificationProvider())

    def get_providers_status(self) -> Dict:
        """Return status of all registered providers."""
        return self._registry.get_status()

    # ═══════════════════════════════════════════════════════════════════════
    # PROVIDER-DELEGATED VERIFICATION (uses interfaces, not direct impl)
    # ═══════════════════════════════════════════════════════════════════════

    def verify_voice_via_provider(
        self,
        challenge_id: str,
        audio_data: bytes,
    ) -> Dict:
        """
        Verify voice via the registered IVoiceVerificationProvider.
        This is the provider-based path that supports any AI engine.
        """
        challenge = self._active_challenges.get(challenge_id)
        if not challenge:
            return {"status": "error", "message": "Challenge not found or expired"}

        provider = self._registry.get_voice_verifier()
        if not provider:
            return {"status": "error", "message": "No voice verification provider registered"}

        # Check for replay attack
        is_replay = provider.detect_replay(audio_data)
        if is_replay:
            challenge.status = VerificationStatus.FAILED
            challenge.confidence = 0.0
            challenge.trust_after = challenge.trust_before
            challenge.explanation += " REPLAY ATTACK DETECTED via provider."
            challenge.completed_at = datetime.now(timezone.utc).isoformat()
            self._active_challenges.pop(challenge_id, None)
            return challenge.to_dict()

        # Get enrolled embedding
        voice_profile = self._voice_profiles.get(challenge.user_id)
        enrolled_embedding = voice_profile.embedding if voice_profile else None

        # Verify through provider interface
        result: ProviderResult = provider.verify_speaker(
            audio_data=audio_data,
            enrolled_embedding=enrolled_embedding,
            expected_phrase=challenge.phrase,
        )

        if result.verified:
            challenge.status = VerificationStatus.SUCCESS
            challenge.confidence = result.confidence
            recovery = self.TRUST_RECOVERY_VOICE * result.confidence
            challenge.trust_after = min(1.0, challenge.trust_before + recovery)
            challenge.explanation += f" {result.reason}. Trust recovered."
        else:
            challenge.status = VerificationStatus.FAILED
            challenge.confidence = result.confidence
            challenge.trust_after = max(0.0, challenge.trust_before - 0.10)
            challenge.explanation += f" {result.reason}."

        challenge.latency_ms = result.processing_time_ms
        challenge.completed_at = datetime.now(timezone.utc).isoformat()
        self._active_challenges.pop(challenge_id, None)
        return challenge.to_dict()

    def verify_face_via_provider(
        self,
        challenge_id: str,
        image_data: bytes,
        completed_actions: List[str],
    ) -> Dict:
        """
        Verify face + liveness via registered providers.
        Combines ILivenessProvider + IFaceVerificationProvider.
        """
        challenge = self._active_challenges.get(challenge_id)
        if not challenge:
            return {"status": "error", "message": "Challenge not found or expired"}

        liveness_provider = self._registry.get_liveness()
        face_provider = self._registry.get_face_verifier()

        if not liveness_provider or not face_provider:
            return {"status": "error", "message": "Liveness or face provider not registered"}

        # Step 1: Liveness check
        from backend.services.providers.interfaces import LivenessResult
        liveness: LivenessResult = liveness_provider.check_liveness(
            image_data=image_data,
            required_actions=challenge.liveness_actions,
            completed_actions=completed_actions,
        )

        if not liveness.is_live:
            challenge.status = VerificationStatus.FAILED
            challenge.confidence = liveness.confidence
            challenge.trust_after = max(0.0, challenge.trust_before - 0.15)
            challenge.explanation += f" {liveness.reason}."
            challenge.latency_ms = liveness.processing_time_ms
            challenge.completed_at = datetime.now(timezone.utc).isoformat()
            self._active_challenges.pop(challenge_id, None)
            return challenge.to_dict()

        # Step 2: Face identity verification
        face_profile = self._face_profiles.get(challenge.user_id)
        enrolled_embedding = face_profile.embedding if face_profile else None

        face_result: ProviderResult = face_provider.verify_face(
            image_data=image_data,
            enrolled_embedding=enrolled_embedding,
        )

        if face_result.verified:
            challenge.status = VerificationStatus.SUCCESS
            challenge.confidence = min(1.0, liveness.confidence * face_result.confidence)
            recovery = self.TRUST_RECOVERY_FACE * challenge.confidence
            challenge.trust_after = min(1.0, challenge.trust_before + recovery)
            challenge.explanation += (
                f" Liveness: {liveness.reason}. Face: {face_result.reason}. Trust recovered."
            )
        else:
            challenge.status = VerificationStatus.FAILED
            challenge.confidence = face_result.confidence
            challenge.trust_after = max(0.0, challenge.trust_before - 0.20)
            challenge.explanation += f" Liveness passed. Face: {face_result.reason}."

        challenge.latency_ms = liveness.processing_time_ms + face_result.processing_time_ms
        challenge.completed_at = datetime.now(timezone.utc).isoformat()
        self._active_challenges.pop(challenge_id, None)
        return challenge.to_dict()

    def enroll_voice_via_provider(self, user_id: str, audio_samples: List[bytes]) -> Dict:
        """Enroll voice using the registered IVoiceEnrollmentProvider."""
        provider = self._registry.get_voice_enrollment()
        if not provider:
            return {"status": "error", "message": "No voice enrollment provider registered"}

        result = provider.enroll_voice(audio_samples)
        if result.enrolled:
            embedding = provider.get_embedding(audio_samples[0])
            if embedding is not None:
                self.enroll_voice(user_id, embedding)

        return result.to_dict()

    def enroll_face_via_provider(self, user_id: str, image_samples: List[bytes]) -> Dict:
        """Enroll face using the registered IFaceEnrollmentProvider."""
        provider = self._registry.get_face_enrollment()
        if not provider:
            return {"status": "error", "message": "No face enrollment provider registered"}

        result = provider.enroll_face(image_samples)
        if result.enrolled:
            embedding = provider.get_embedding(image_samples[0])
            if embedding is not None:
                self.enroll_face(user_id, embedding)

        return result.to_dict()
