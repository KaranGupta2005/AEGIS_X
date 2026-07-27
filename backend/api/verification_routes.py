"""
Verification Routes — Adaptive Verification Engine API
========================================================
Endpoints for voice challenges, face liveness, delegate management,
and verification history.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List, Dict
import numpy as np

router = APIRouter(prefix="/api/v1/verify", tags=["Verification"])


# ─── Singleton engine instance ────────────────────────────────────────────────

_engine_instance = None


def get_engine():
    global _engine_instance
    if _engine_instance is None:
        from backend.services.verification_engine import AdaptiveVerificationEngine
        _engine_instance = AdaptiveVerificationEngine()
    return _engine_instance


# ─── Request/Response Models ──────────────────────────────────────────────────

class InitiateVerificationRequest(BaseModel):
    user_id: str = Field(..., min_length=1)
    session_id: str = Field(..., min_length=1)
    trust_score: float = Field(..., ge=0, le=1)
    cognitive_state: str = Field(default="calm")
    drift_detected: bool = Field(default=False)
    drift_severity: str = Field(default="none")
    velocity: float = Field(default=0.0)
    anomaly_score: float = Field(default=0.0)
    transaction_amount: float = Field(default=0.0)
    reasons: List[str] = Field(default_factory=list)


class VoiceVerifyRequest(BaseModel):
    challenge_id: str = Field(..., min_length=1)
    audio_embedding: List[float] = Field(..., min_length=32)
    spectral_features: Optional[Dict] = None


class FaceVerifyRequest(BaseModel):
    challenge_id: str = Field(..., min_length=1)
    face_embedding: List[float] = Field(..., min_length=32)
    liveness_results: Dict = Field(...)


class DelegateVerifyRequest(BaseModel):
    challenge_id: str = Field(..., min_length=1)
    behavioral_embedding: Optional[List[float]] = None
    voice_embedding: Optional[List[float]] = None
    face_embedding: Optional[List[float]] = None


class EnrollVoiceRequest(BaseModel):
    user_id: str = Field(..., min_length=1)
    embedding: List[float] = Field(..., min_length=32)


class EnrollFaceRequest(BaseModel):
    user_id: str = Field(..., min_length=1)
    embedding: List[float] = Field(..., min_length=32)


class RegisterDelegateRequest(BaseModel):
    primary_user_id: str = Field(..., min_length=1)
    name: str = Field(..., min_length=1)
    relationship: str = Field(..., min_length=1)
    voice_embedding: Optional[List[float]] = None
    face_embedding: Optional[List[float]] = None
    behavioral_baseline: Optional[List[float]] = None


# ─── ENDPOINTS ────────────────────────────────────────────────────────────────

@router.post("/initiate")
def initiate_verification(request: InitiateVerificationRequest):
    """
    Analyze risk and select the optimal verification method.

    Called by the decision service when STEP_UP is triggered.
    Returns a challenge object with instructions for the client.
    """
    engine = get_engine()
    challenge = engine.analyze_and_select(
        user_id=request.user_id,
        session_id=request.session_id,
        trust_score=request.trust_score,
        cognitive_state=request.cognitive_state,
        drift_detected=request.drift_detected,
        drift_severity=request.drift_severity,
        velocity=request.velocity,
        anomaly_score=request.anomaly_score,
        transaction_amount=request.transaction_amount,
        reasons=request.reasons,
    )
    return challenge.to_dict()


@router.post("/voice")
def verify_voice(request: VoiceVerifyRequest):
    """Submit voice recording for speaker verification."""
    engine = get_engine()
    embedding = np.array(request.audio_embedding, dtype=np.float32)
    result = engine.verify_voice(
        challenge_id=request.challenge_id,
        audio_embedding=embedding,
        spectral_features=request.spectral_features,
    )
    if result.get("status") == "error":
        raise HTTPException(status_code=400, detail=result["message"])
    return result


@router.post("/face")
def verify_face(request: FaceVerifyRequest):
    """Submit face capture for liveness + identity verification."""
    engine = get_engine()
    embedding = np.array(request.face_embedding, dtype=np.float32)
    result = engine.verify_face(
        challenge_id=request.challenge_id,
        face_embedding=embedding,
        liveness_results=request.liveness_results,
    )
    if result.get("status") == "error":
        raise HTTPException(status_code=400, detail=result["message"])
    return result


@router.post("/delegate")
def verify_delegate(request: DelegateVerifyRequest):
    """Verify if current user matches a trusted delegate."""
    engine = get_engine()
    result = engine.verify_delegate(
        challenge_id=request.challenge_id,
        behavioral_embedding=np.array(request.behavioral_embedding, dtype=np.float32) if request.behavioral_embedding else None,
        voice_embedding=np.array(request.voice_embedding, dtype=np.float32) if request.voice_embedding else None,
        face_embedding=np.array(request.face_embedding, dtype=np.float32) if request.face_embedding else None,
    )
    if result.get("status") == "error":
        raise HTTPException(status_code=400, detail=result["message"])
    return result


# ─── ENROLLMENT ───────────────────────────────────────────────────────────────

@router.post("/enroll/voice")
def enroll_voice(request: EnrollVoiceRequest):
    """Enroll or update a user's voice profile."""
    engine = get_engine()
    embedding = np.array(request.embedding, dtype=np.float32)
    return engine.enroll_voice(request.user_id, embedding)


@router.post("/enroll/face")
def enroll_face(request: EnrollFaceRequest):
    """Enroll or update a user's face profile."""
    engine = get_engine()
    embedding = np.array(request.embedding, dtype=np.float32)
    return engine.enroll_face(request.user_id, embedding)


@router.post("/delegate/register")
def register_delegate(request: RegisterDelegateRequest):
    """Register a trusted delegate for a user."""
    engine = get_engine()
    delegate = engine.register_delegate(
        primary_user_id=request.primary_user_id,
        name=request.name,
        relationship=request.relationship,
        voice_embedding=np.array(request.voice_embedding, dtype=np.float32) if request.voice_embedding else None,
        face_embedding=np.array(request.face_embedding, dtype=np.float32) if request.face_embedding else None,
        behavioral_baseline=np.array(request.behavioral_baseline, dtype=np.float32) if request.behavioral_baseline else None,
    )
    return {
        "delegate_id": delegate.delegate_id,
        "name": delegate.name,
        "relationship": delegate.relationship,
        "status": "registered",
    }


# ─── QUERIES ──────────────────────────────────────────────────────────────────

@router.get("/history/{user_id}")
def get_verification_history(user_id: str, limit: int = 50):
    """Get verification history for a user."""
    engine = get_engine()
    return {"user_id": user_id, "history": engine.get_verification_history(user_id, limit)}


@router.get("/active/{user_id}")
def get_active_challenge(user_id: str):
    """Get any pending verification challenge for a user."""
    engine = get_engine()
    challenge = engine.get_active_challenge(user_id)
    if not challenge:
        return {"status": "no_active_challenge"}
    return challenge


@router.get("/delegates/{user_id}")
def get_delegates(user_id: str):
    """List all trusted delegates for a user."""
    engine = get_engine()
    return {"user_id": user_id, "delegates": engine.get_delegates(user_id)}


@router.get("/status")
def get_engine_status():
    """Verification engine health and stats."""
    engine = get_engine()
    return engine.get_engine_status()


# ─── PROVIDER-BASED ENDPOINTS ─────────────────────────────────────────────────

class ProviderVoiceVerifyRequest(BaseModel):
    challenge_id: str = Field(..., min_length=1)
    audio_base64: str = Field(..., min_length=1)


class ProviderFaceVerifyRequest(BaseModel):
    challenge_id: str = Field(..., min_length=1)
    image_base64: str = Field(..., min_length=1)
    completed_actions: List[str] = Field(default_factory=list)


class ProviderVoiceEnrollRequest(BaseModel):
    user_id: str = Field(..., min_length=1)
    audio_samples_base64: List[str] = Field(..., min_length=1)


class ProviderFaceEnrollRequest(BaseModel):
    user_id: str = Field(..., min_length=1)
    image_samples_base64: List[str] = Field(..., min_length=1)


@router.post("/provider/voice")
def provider_verify_voice(request: ProviderVoiceVerifyRequest):
    """Verify voice through the registered provider (supports any AI engine)."""
    import base64
    engine = get_engine()
    audio_data = base64.b64decode(request.audio_base64)
    result = engine.verify_voice_via_provider(
        challenge_id=request.challenge_id,
        audio_data=audio_data,
    )
    if result.get("status") == "error":
        raise HTTPException(status_code=400, detail=result["message"])
    return result


@router.post("/provider/face")
def provider_verify_face(request: ProviderFaceVerifyRequest):
    """Verify face + liveness through registered providers."""
    import base64
    engine = get_engine()
    image_data = base64.b64decode(request.image_base64)
    result = engine.verify_face_via_provider(
        challenge_id=request.challenge_id,
        image_data=image_data,
        completed_actions=request.completed_actions,
    )
    if result.get("status") == "error":
        raise HTTPException(status_code=400, detail=result["message"])
    return result


@router.post("/provider/enroll/voice")
def provider_enroll_voice(request: ProviderVoiceEnrollRequest):
    """Enroll voice via the registered provider."""
    import base64
    engine = get_engine()
    audio_samples = [base64.b64decode(s) for s in request.audio_samples_base64]
    return engine.enroll_voice_via_provider(request.user_id, audio_samples)


@router.post("/provider/enroll/face")
def provider_enroll_face(request: ProviderFaceEnrollRequest):
    """Enroll face via the registered provider."""
    import base64
    engine = get_engine()
    image_samples = [base64.b64decode(s) for s in request.image_samples_base64]
    return engine.enroll_face_via_provider(request.user_id, image_samples)


@router.get("/providers")
def get_providers_status():
    """Get status of all registered verification providers."""
    engine = get_engine()
    return engine.get_providers_status()


# ─── REAL BIOMETRIC VALIDATION (Gemini Vision) ────────────────────────────────

class ValidateFaceRequest(BaseModel):
    image_base64: str = Field(..., min_length=100)
    required_action: str = Field(default="look forward")


class ValidateVoiceRequest(BaseModel):
    audio_base64: str = Field(..., min_length=50)
    expected_phrase: str = Field(default="My voice is my identity")


@router.post("/validate/face")
def validate_face_frame(request: ValidateFaceRequest):
    """
    Validate that a real human face is visible in the frame using Gemini Vision.
    Must pass BEFORE biometric verification proceeds.
    """
    from backend.services.biometric_validator import validate_face_frame
    result = validate_face_frame(request.image_base64, request.required_action)
    return result


@router.post("/validate/voice")
def validate_voice_audio(request: ValidateVoiceRequest):
    """
    Validate that audio contains real speech before speaker verification.
    """
    from backend.services.biometric_validator import validate_voice_audio
    result = validate_voice_audio(request.audio_base64, request.expected_phrase)
    return result
