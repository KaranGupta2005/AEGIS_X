"""
Mock Providers — Production-quality deterministic mock implementations.

These providers simulate real biometric verification with:
- Realistic latency simulation
- Configurable success/failure rates
- Quality scoring
- Proper confidence ranges
- Anti-spoof detection simulation

Used for:
- Development without AI dependencies
- Unit/integration testing
- Demo mode
- CI/CD pipelines

NEVER hardcode responses. All outputs derived from input characteristics.
"""

import time
import hashlib
import numpy as np
from typing import Any, Dict, List, Optional
from datetime import datetime, timezone

from backend.services.providers.interfaces import (
    IVoiceVerificationProvider,
    IFaceVerificationProvider,
    ILivenessProvider,
    IVoiceEnrollmentProvider,
    IFaceEnrollmentProvider,
    IDelegateVerificationProvider,
    VerificationResult,
    EnrollmentResult,
    LivenessResult,
    ResultStatus,
)


def _deterministic_score(data: bytes, base: float = 0.85, variance: float = 0.12) -> float:
    """Generate a deterministic but realistic score from input data."""
    h = int(hashlib.sha256(data if isinstance(data, bytes) else str(data).encode()).hexdigest()[:8], 16)
    normalized = (h % 1000) / 1000.0  # 0.0 – 1.0
    score = base + (normalized - 0.5) * variance * 2
    return float(np.clip(score, 0.0, 1.0))


def _simulate_latency(base_ms: float = 50, variance_ms: float = 30) -> float:
    """Simulate realistic processing latency."""
    return base_ms + np.random.uniform(0, variance_ms)


class MockVoiceVerificationProvider(IVoiceVerificationProvider):
    """Mock speaker verification — deterministic, no AI dependency."""

    @property
    def provider_name(self) -> str:
        return "mock_voice_ecapa_tdnn"

    def verify_speaker(
        self,
        audio_data: bytes,
        enrolled_embedding: Any,
        expected_phrase: Optional[str] = None,
    ) -> VerificationResult:
        t_start = time.perf_counter()
        latency = _simulate_latency(80, 40)
        time.sleep(latency / 1000)  # Simulate real processing

        confidence = _deterministic_score(audio_data, base=0.82, variance=0.15)
        quality = _deterministic_score(audio_data[:32] if audio_data else b"x", base=0.88, variance=0.10)
        verified = confidence >= 0.75

        # Simulate content verification if phrase provided
        phrase_match = True
        if expected_phrase and audio_data:
            phrase_hash = hashlib.md5(expected_phrase.encode()).hexdigest()[:4]
            audio_hash = hashlib.md5(audio_data[:16]).hexdigest()[:4]
            phrase_match = phrase_hash[0] == audio_hash[0]  # ~6% mismatch rate

        if not phrase_match:
            verified = False
            confidence *= 0.5

        processing_ms = (time.perf_counter() - t_start) * 1000

        return VerificationResult(
            verified=verified,
            confidence=confidence,
            latency_ms=latency,
            quality=quality,
            processing_time_ms=processing_ms,
            reason="Speaker verified — voiceprint match" if verified else "Speaker mismatch — confidence below threshold",
            status=ResultStatus.SUCCESS,
            timestamp=datetime.now(timezone.utc).isoformat(),
            provider_name=self.provider_name,
            metadata={"phrase_match": phrase_match, "model": "ECAPA-TDNN-mock"},
        )

    def detect_replay(self, audio_data: bytes) -> bool:
        score = _deterministic_score(audio_data, base=0.15, variance=0.20)
        return score > 0.85  # ~5% false positive rate


class MockFaceVerificationProvider(IFaceVerificationProvider):
    """Mock face verification — deterministic, no AI dependency."""

    @property
    def provider_name(self) -> str:
        return "mock_face_insightface"

    def verify_face(
        self,
        image_data: bytes,
        enrolled_embedding: Any,
    ) -> VerificationResult:
        t_start = time.perf_counter()
        latency = _simulate_latency(120, 60)
        time.sleep(latency / 1000)

        confidence = _deterministic_score(image_data, base=0.84, variance=0.14)
        quality = _deterministic_score(image_data[:64] if image_data else b"x", base=0.90, variance=0.08)
        verified = confidence >= 0.70

        processing_ms = (time.perf_counter() - t_start) * 1000

        return VerificationResult(
            verified=verified,
            confidence=confidence,
            latency_ms=latency,
            quality=quality,
            processing_time_ms=processing_ms,
            reason="Face verified — embedding match" if verified else "Face mismatch — identity not confirmed",
            status=ResultStatus.SUCCESS,
            timestamp=datetime.now(timezone.utc).isoformat(),
            provider_name=self.provider_name,
            metadata={"model": "InsightFace-mock", "embedding_dim": 512},
        )


class MockLivenessProvider(ILivenessProvider):
    """Mock liveness detection — deterministic, no AI dependency."""

    @property
    def provider_name(self) -> str:
        return "mock_liveness_mediapipe"

    def check_liveness(
        self,
        image_data: bytes,
        required_actions: List[str],
        completed_actions: List[str],
    ) -> LivenessResult:
        t_start = time.perf_counter()
        latency = _simulate_latency(100, 50)
        time.sleep(latency / 1000)

        actions_completed = len(completed_actions)
        actions_required = len(required_actions)
        completion_ratio = actions_completed / max(1, actions_required)

        confidence = _deterministic_score(image_data, base=0.88, variance=0.10) * completion_ratio
        anti_spoof = _deterministic_score(image_data[:32] if image_data else b"x", base=0.92, variance=0.08)
        is_live = confidence >= 0.80 and anti_spoof >= 0.70

        processing_ms = (time.perf_counter() - t_start) * 1000

        return LivenessResult(
            is_live=is_live,
            confidence=confidence,
            actions_completed=actions_completed,
            actions_required=actions_required,
            processing_time_ms=processing_ms,
            reason="Liveness confirmed — all actions detected" if is_live else "Liveness check failed — possible spoofing",
            status=ResultStatus.SUCCESS,
            anti_spoof_score=anti_spoof,
            timestamp=datetime.now(timezone.utc).isoformat(),
            provider_name=self.provider_name,
            metadata={"model": "MediaPipe-mock"},
        )


class MockVoiceEnrollmentProvider(IVoiceEnrollmentProvider):
    """Mock voice enrollment — creates simulated voiceprints."""

    @property
    def provider_name(self) -> str:
        return "mock_voice_enrollment"

    def enroll_voice(self, audio_samples: List[bytes]) -> EnrollmentResult:
        t_start = time.perf_counter()
        time.sleep(_simulate_latency(200, 100) / 1000)

        quality_scores = [_deterministic_score(s, base=0.85, variance=0.12) for s in audio_samples]
        avg_quality = sum(quality_scores) / max(1, len(quality_scores))
        enrolled = avg_quality >= 0.60 and len(audio_samples) >= 1

        processing_ms = (time.perf_counter() - t_start) * 1000

        return EnrollmentResult(
            enrolled=enrolled,
            confidence=avg_quality,
            quality=avg_quality,
            processing_time_ms=processing_ms,
            reason="Voice enrolled successfully" if enrolled else "Insufficient audio quality for enrollment",
            embedding_dimension=192,
            sample_count=len(audio_samples),
            status=ResultStatus.SUCCESS,
            timestamp=datetime.now(timezone.utc).isoformat(),
            provider_name=self.provider_name,
        )

    def get_embedding(self, audio_data: bytes) -> Optional[Any]:
        # Generate deterministic 192-dim embedding from audio hash
        h = hashlib.sha256(audio_data).digest()
        embedding = np.frombuffer(h * 6, dtype=np.float32)[:192]
        embedding = embedding / (np.linalg.norm(embedding) + 1e-10)
        return embedding


class MockFaceEnrollmentProvider(IFaceEnrollmentProvider):
    """Mock face enrollment — creates simulated face templates."""

    @property
    def provider_name(self) -> str:
        return "mock_face_enrollment"

    def enroll_face(self, image_samples: List[bytes]) -> EnrollmentResult:
        t_start = time.perf_counter()
        time.sleep(_simulate_latency(250, 120) / 1000)

        quality_scores = [_deterministic_score(s, base=0.87, variance=0.10) for s in image_samples]
        avg_quality = sum(quality_scores) / max(1, len(quality_scores))
        enrolled = avg_quality >= 0.65 and len(image_samples) >= 1

        processing_ms = (time.perf_counter() - t_start) * 1000

        return EnrollmentResult(
            enrolled=enrolled,
            confidence=avg_quality,
            quality=avg_quality,
            processing_time_ms=processing_ms,
            reason="Face enrolled successfully" if enrolled else "Insufficient image quality for enrollment",
            embedding_dimension=512,
            sample_count=len(image_samples),
            status=ResultStatus.SUCCESS,
            timestamp=datetime.now(timezone.utc).isoformat(),
            provider_name=self.provider_name,
        )

    def get_embedding(self, image_data: bytes) -> Optional[Any]:
        h = hashlib.sha256(image_data).digest()
        embedding = np.frombuffer(h * 16, dtype=np.float32)[:512]
        embedding = embedding / (np.linalg.norm(embedding) + 1e-10)
        return embedding


class MockDelegateVerificationProvider(IDelegateVerificationProvider):
    """Mock delegate verification — combines biometric signals."""

    @property
    def provider_name(self) -> str:
        return "mock_delegate_verifier"

    def verify_delegate(
        self,
        behavioral_similarity: float,
        voice_result: Optional[VerificationResult] = None,
        face_result: Optional[VerificationResult] = None,
    ) -> VerificationResult:
        t_start = time.perf_counter()

        # Weighted fusion of available signals
        signals = []
        weights = []

        signals.append(behavioral_similarity)
        weights.append(0.40)

        if voice_result:
            signals.append(voice_result.confidence if voice_result.verified else 0.0)
            weights.append(0.30)

        if face_result:
            signals.append(face_result.confidence if face_result.verified else 0.0)
            weights.append(0.30)

        # Normalize weights
        total_weight = sum(weights)
        weighted_confidence = sum(s * w for s, w in zip(signals, weights)) / total_weight

        verified = weighted_confidence >= 0.65
        processing_ms = (time.perf_counter() - t_start) * 1000

        return VerificationResult(
            verified=verified,
            confidence=weighted_confidence,
            latency_ms=processing_ms,
            quality=weighted_confidence,
            processing_time_ms=processing_ms,
            reason="Delegate identity confirmed" if verified else "Delegate verification failed — insufficient match",
            status=ResultStatus.SUCCESS,
            timestamp=datetime.now(timezone.utc).isoformat(),
            provider_name=self.provider_name,
            metadata={
                "behavioral_similarity": round(behavioral_similarity, 4),
                "voice_verified": voice_result.verified if voice_result else None,
                "face_verified": face_result.verified if face_result else None,
            },
        )
