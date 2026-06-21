# pyrefly: ignore [missing-import]
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import List

from similarity_service import calculate_similarity
from drift_service import calculate_drift
from cognitive_service import analyze_cognitive_state

app = FastAPI(title="AEGIS-X API", description="Continuous Trust Infrastructure API")

class TelemetryData(BaseModel):
    hesitation: float = Field(..., ge=0.0, le=1.0, description="Hesitation score (0-1)")
    correction_rate: float = Field(..., ge=0.0, le=1.0, description="Correction rate (0-1)")
    typing_speed: float = Field(..., ge=0.0, description="Typing speed in WPM")
    swipe_behavior: float = Field(..., ge=0.0, le=1.0, description="Swipe anomaly score (0-1)")

class VerifySessionRequest(BaseModel):
    telemetry: TelemetryData
    embedding: List[float] = Field(..., description="1D embedding array representing current biometric state")

class VerifySessionResponse(BaseModel):
    similarity_score: float
    drift_score: float
    cognitive_state: str
    trust_verdict: str
    trust_derivative: float

@app.post("/verify_session", response_model=VerifySessionResponse)
async def verify_session(request: VerifySessionRequest):
    try:
        # Await mock service calculations
        similarity_score = await calculate_similarity(request.embedding)
        drift_score = await calculate_drift(
            request.telemetry.hesitation,
            request.telemetry.correction_rate,
            request.telemetry.typing_speed,
            request.telemetry.swipe_behavior
        )
        cognitive_state = await analyze_cognitive_state(
            request.telemetry.hesitation,
            request.telemetry.correction_rate,
            request.telemetry.typing_speed
        )

        # Calculate a mock continuous trust derivative (dT/dt)
        # Higher similarity is good, higher drift is bad
        trust_derivative = similarity_score - drift_score
        
        # Determine final verdict
        if trust_derivative < -0.2 or cognitive_state == "HIGH_COGNITIVE_LOAD_OR_COERCION":
            trust_verdict = "REJECT_SESSION"
        elif trust_derivative < 0.2:
            trust_verdict = "ELEVATE_AUTH"
        else:
            trust_verdict = "TRUST_MAINTAINED"

        return VerifySessionResponse(
            similarity_score=similarity_score,
            drift_score=drift_score,
            cognitive_state=cognitive_state,
            trust_verdict=trust_verdict,
            trust_derivative=trust_derivative
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
