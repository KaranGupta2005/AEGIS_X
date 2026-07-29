"""
Provider Architecture — Clean interface layer for biometric verification.

All verification logic communicates ONLY through these interfaces.
Concrete implementations (SpeechBrain, InsightFace, MediaPipe, etc.)
are injected at runtime via the ProviderRegistry.

This ensures:
- Business logic never imports AI libraries directly
- Providers are hot-swappable without code changes
- Testing uses mock providers with deterministic behavior
- Multiple providers can coexist (A/B testing, fallback chains)

Available Providers:
  PRODUCTION (require pip install -r requirements-biometric.txt):
    - SpeechBrainVoiceProvider       (ECAPA-TDNN, 192-dim speaker embeddings)
    - SpeechBrainEnrollmentProvider  (Voice enrollment via ECAPA-TDNN)
    - InsightFaceVerificationProvider (ArcFace buffalo_l, 512-dim face embeddings)
    - InsightFaceEnrollmentProvider  (Face enrollment via InsightFace)
    - MediaPipeLivenessProvider      (Face Mesh 468-landmark liveness detection)

  MOCK (zero dependencies, always available):
    - MockVoiceVerificationProvider
    - MockFaceVerificationProvider
    - MockLivenessProvider
    - MockVoiceEnrollmentProvider
    - MockFaceEnrollmentProvider
    - MockDelegateVerificationProvider
"""

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
)
from backend.services.providers.registry import ProviderRegistry
from backend.services.providers.mock_providers import (
    MockVoiceVerificationProvider,
    MockFaceVerificationProvider,
    MockLivenessProvider,
    MockVoiceEnrollmentProvider,
    MockFaceEnrollmentProvider,
    MockDelegateVerificationProvider,
)

__all__ = [
    # Interfaces
    "IVoiceVerificationProvider",
    "IFaceVerificationProvider",
    "ILivenessProvider",
    "IVoiceEnrollmentProvider",
    "IFaceEnrollmentProvider",
    "IDelegateVerificationProvider",
    # DTOs
    "VerificationResult",
    "EnrollmentResult",
    "LivenessResult",
    # Registry
    "ProviderRegistry",
    # Mock providers (always available)
    "MockVoiceVerificationProvider",
    "MockFaceVerificationProvider",
    "MockLivenessProvider",
    "MockVoiceEnrollmentProvider",
    "MockFaceEnrollmentProvider",
    "MockDelegateVerificationProvider",
]
