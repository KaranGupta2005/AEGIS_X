"""
Provider Registry — Dependency Injection container for verification providers.

The registry is the SINGLE place where concrete providers are instantiated.
The verification engine requests providers by interface type.
Providers are hot-swappable at runtime.

Usage:
    registry = ProviderRegistry()
    registry.register_voice_verifier(MyVoiceProvider())
    provider = registry.get_voice_verifier()
"""

from typing import Optional
from backend.services.providers.interfaces import (
    IVoiceVerificationProvider,
    IFaceVerificationProvider,
    ILivenessProvider,
    IVoiceEnrollmentProvider,
    IFaceEnrollmentProvider,
    IDelegateVerificationProvider,
)


class ProviderRegistry:
    """
    Singleton registry for biometric verification providers.

    Supports:
    - Registering providers at startup
    - Swapping providers at runtime (A/B testing, fallback)
    - Listing available providers
    - Provider health checks
    """

    _instance: Optional["ProviderRegistry"] = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self._initialized = True

        self._voice_verifier: Optional[IVoiceVerificationProvider] = None
        self._face_verifier: Optional[IFaceVerificationProvider] = None
        self._liveness: Optional[ILivenessProvider] = None
        self._voice_enrollment: Optional[IVoiceEnrollmentProvider] = None
        self._face_enrollment: Optional[IFaceEnrollmentProvider] = None
        self._delegate_verifier: Optional[IDelegateVerificationProvider] = None

    # ── Registration ──────────────────────────────────────────────────────

    def register_voice_verifier(self, provider: IVoiceVerificationProvider):
        self._voice_verifier = provider

    def register_face_verifier(self, provider: IFaceVerificationProvider):
        self._face_verifier = provider

    def register_liveness(self, provider: ILivenessProvider):
        self._liveness = provider

    def register_voice_enrollment(self, provider: IVoiceEnrollmentProvider):
        self._voice_enrollment = provider

    def register_face_enrollment(self, provider: IFaceEnrollmentProvider):
        self._face_enrollment = provider

    def register_delegate_verifier(self, provider: IDelegateVerificationProvider):
        self._delegate_verifier = provider

    # ── Retrieval ─────────────────────────────────────────────────────────

    def get_voice_verifier(self) -> Optional[IVoiceVerificationProvider]:
        return self._voice_verifier

    def get_face_verifier(self) -> Optional[IFaceVerificationProvider]:
        return self._face_verifier

    def get_liveness(self) -> Optional[ILivenessProvider]:
        return self._liveness

    def get_voice_enrollment(self) -> Optional[IVoiceEnrollmentProvider]:
        return self._voice_enrollment

    def get_face_enrollment(self) -> Optional[IFaceEnrollmentProvider]:
        return self._face_enrollment

    def get_delegate_verifier(self) -> Optional[IDelegateVerificationProvider]:
        return self._delegate_verifier

    # ── Status ────────────────────────────────────────────────────────────

    def get_status(self) -> dict:
        return {
            "voice_verifier": self._voice_verifier.provider_name if self._voice_verifier else None,
            "face_verifier": self._face_verifier.provider_name if self._face_verifier else None,
            "liveness": self._liveness.provider_name if self._liveness else None,
            "voice_enrollment": self._voice_enrollment.provider_name if self._voice_enrollment else None,
            "face_enrollment": self._face_enrollment.provider_name if self._face_enrollment else None,
            "delegate_verifier": self._delegate_verifier.provider_name if self._delegate_verifier else None,
        }

    def is_fully_configured(self) -> bool:
        return all([
            self._voice_verifier,
            self._face_verifier,
            self._liveness,
            self._voice_enrollment,
            self._face_enrollment,
            self._delegate_verifier,
        ])
