"""
Provider Interfaces — Abstract contracts for all biometric verification.

These are the ONLY types the verification engine depends on.
Concrete providers implement these interfaces.
Business logic NEVER imports AI libraries directly.

Design:
- Each interface has a single responsibility
- All methods return standardized result DTOs
- Providers are stateless — state lives in the service layer
- All operations are synchronous (providers wrap async AI internally)
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional
from enum import Enum


# ═══════════════════════════════════════════════════════════════════════════════
# RESULT DTOs (Data Transfer Objects)
# ═══════════════════════════════════════════════════════════════════════════════

class ResultStatus(str, Enum):
    SUCCESS = "success"
    FAILURE = "failure"
    ERROR = "error"
    TIMEOUT = "timeout"
    INCONCLUSIVE = "inconclusive"


@dataclass
class VerificationResult:
    """Standard result DTO from any verification provider."""
    verified: bool
    confidence: float                  # 0.0 – 1.0
    latency_ms: float                  # Processing time
    quality: float                     # Input quality score 0.0 – 1.0
    processing_time_ms: float          # Total provider time
    reason: str                        # Human-readable explanation
    status: ResultStatus = ResultStatus.SUCCESS
    timestamp: str = ""
    provider_name: str = ""
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict:
        return {
            "verified": self.verified,
            "confidence": round(self.confidence, 4),
            "latency_ms": round(self.latency_ms, 1),
            "quality": round(self.quality, 4),
            "processing_time_ms": round(self.processing_time_ms, 1),
            "reason": self.reason,
            "status": self.status.value,
            "timestamp": self.timestamp,
            "provider_name": self.provider_name,
            "metadata": self.metadata,
        }


@dataclass
class EnrollmentResult:
    """Standard result DTO from any enrollment provider."""
    enrolled: bool
    confidence: float
    quality: float
    processing_time_ms: float
    reason: str
    embedding_dimension: int = 0
    sample_count: int = 0
    status: ResultStatus = ResultStatus.SUCCESS
    timestamp: str = ""
    provider_name: str = ""
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict:
        return {
            "enrolled": self.enrolled,
            "confidence": round(self.confidence, 4),
            "quality": round(self.quality, 4),
            "processing_time_ms": round(self.processing_time_ms, 1),
            "reason": self.reason,
            "embedding_dimension": self.embedding_dimension,
            "sample_count": self.sample_count,
            "status": self.status.value,
            "timestamp": self.timestamp,
            "provider_name": self.provider_name,
        }


@dataclass
class LivenessResult:
    """Standard result DTO from liveness detection provider."""
    is_live: bool
    confidence: float
    actions_completed: int
    actions_required: int
    processing_time_ms: float
    reason: str
    status: ResultStatus = ResultStatus.SUCCESS
    anti_spoof_score: float = 0.0      # Photo/video attack resistance
    timestamp: str = ""
    provider_name: str = ""
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict:
        return {
            "is_live": self.is_live,
            "confidence": round(self.confidence, 4),
            "actions_completed": self.actions_completed,
            "actions_required": self.actions_required,
            "processing_time_ms": round(self.processing_time_ms, 1),
            "reason": self.reason,
            "status": self.status.value,
            "anti_spoof_score": round(self.anti_spoof_score, 4),
            "timestamp": self.timestamp,
            "provider_name": self.provider_name,
        }


# ═══════════════════════════════════════════════════════════════════════════════
# PROVIDER INTERFACES
# ═══════════════════════════════════════════════════════════════════════════════

class IVoiceVerificationProvider(ABC):
    """Interface for speaker verification (voice biometric matching)."""

    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Unique identifier for this provider."""
        ...

    @abstractmethod
    def verify_speaker(
        self,
        audio_data: bytes,
        enrolled_embedding: Any,
        expected_phrase: Optional[str] = None,
    ) -> VerificationResult:
        """
        Verify that the audio matches the enrolled speaker.

        Args:
            audio_data: Raw audio bytes (WAV/PCM).
            enrolled_embedding: Previously enrolled voice embedding.
            expected_phrase: Expected phrase for content verification.

        Returns:
            VerificationResult with confidence and verified flag.
        """
        ...

    @abstractmethod
    def detect_replay(self, audio_data: bytes) -> bool:
        """Detect if audio is a replay attack (from speaker/recording)."""
        ...


class IFaceVerificationProvider(ABC):
    """Interface for face identity verification (face matching)."""

    @property
    @abstractmethod
    def provider_name(self) -> str: ...

    @abstractmethod
    def verify_face(
        self,
        image_data: bytes,
        enrolled_embedding: Any,
    ) -> VerificationResult:
        """
        Verify that the face in the image matches the enrolled face.

        Args:
            image_data: Raw image bytes (JPEG/PNG).
            enrolled_embedding: Previously enrolled face embedding.

        Returns:
            VerificationResult with confidence and verified flag.
        """
        ...


class ILivenessProvider(ABC):
    """Interface for face liveness detection (anti-spoofing)."""

    @property
    @abstractmethod
    def provider_name(self) -> str: ...

    @abstractmethod
    def check_liveness(
        self,
        image_data: bytes,
        required_actions: List[str],
        completed_actions: List[str],
    ) -> LivenessResult:
        """
        Check if the face is live (not photo/video/mask).

        Args:
            image_data: Raw image bytes.
            required_actions: List of actions requested (blink, smile, turn).
            completed_actions: List of actions the user completed.

        Returns:
            LivenessResult with liveness confidence.
        """
        ...


class IVoiceEnrollmentProvider(ABC):
    """Interface for voice enrollment (voiceprint creation)."""

    @property
    @abstractmethod
    def provider_name(self) -> str: ...

    @abstractmethod
    def enroll_voice(
        self,
        audio_samples: List[bytes],
    ) -> EnrollmentResult:
        """
        Create a voiceprint from enrollment audio samples.

        Args:
            audio_samples: List of raw audio recordings.

        Returns:
            EnrollmentResult with enrollment status.
        """
        ...

    @abstractmethod
    def get_embedding(self, audio_data: bytes) -> Optional[Any]:
        """Extract speaker embedding from audio."""
        ...


class IFaceEnrollmentProvider(ABC):
    """Interface for face enrollment (face template creation)."""

    @property
    @abstractmethod
    def provider_name(self) -> str: ...

    @abstractmethod
    def enroll_face(
        self,
        image_samples: List[bytes],
    ) -> EnrollmentResult:
        """
        Create a face template from enrollment images.

        Args:
            image_samples: List of face images.

        Returns:
            EnrollmentResult with enrollment status.
        """
        ...

    @abstractmethod
    def get_embedding(self, image_data: bytes) -> Optional[Any]:
        """Extract face embedding from image."""
        ...


class IDelegateVerificationProvider(ABC):
    """Interface for verifying trusted delegates."""

    @property
    @abstractmethod
    def provider_name(self) -> str: ...

    @abstractmethod
    def verify_delegate(
        self,
        behavioral_similarity: float,
        voice_result: Optional[VerificationResult] = None,
        face_result: Optional[VerificationResult] = None,
    ) -> VerificationResult:
        """
        Determine if the current user matches a registered delegate.

        Combines behavioral, voice, and face signals for delegate verification.
        """
        ...
