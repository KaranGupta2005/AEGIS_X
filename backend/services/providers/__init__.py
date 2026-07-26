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
    "IVoiceVerificationProvider",
    "IFaceVerificationProvider",
    "ILivenessProvider",
    "IVoiceEnrollmentProvider",
    "IFaceEnrollmentProvider",
    "IDelegateVerificationProvider",
    "VerificationResult",
    "EnrollmentResult",
    "LivenessResult",
    "ProviderRegistry",
    "MockVoiceVerificationProvider",
    "MockFaceVerificationProvider",
    "MockLivenessProvider",
    "MockVoiceEnrollmentProvider",
    "MockFaceEnrollmentProvider",
    "MockDelegateVerificationProvider",
]
