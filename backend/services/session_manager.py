"""
Session Manager — Thin delegation layer (FIX #8: Removed duplicate pipeline)
=============================================================================

PREVIOUSLY: This file contained a full duplicate of the 10-step trust pipeline,
independently maintaining sessions, CUSUM detectors, similarity history, and
cognitive trajectories — duplicating everything in event_processor.py.

NOW: This is a thin facade that delegates to EventProcessor, which is the
single source of truth for all pipeline operations. This preserves backward
compatibility for any code that imported SessionManager while eliminating
the maintenance trap of two independent pipeline implementations.

If you need pipeline processing, use EventProcessor directly:
    from backend.services.event_processor import EventProcessor
    processor = EventProcessor()
    processor.start_session(user_id, session_id)
    result = processor.process_behavioral_event(user_id, raw_event)
"""

from typing import Dict, List, Optional
from backend.services.event_processor import EventProcessor


class SessionManager:
    """
    Facade over EventProcessor for backward compatibility.

    All pipeline logic lives in EventProcessor. This class delegates to it,
    providing the same interface that existing code may depend on.
    """

    def __init__(self):
        self._processor = EventProcessor()

    def create_session(self, user_id: str, session_id: Optional[str] = None) -> Dict:
        """Initialize a new trust session for a user."""
        if session_id is None:
            import uuid
            session_id = f"sess_{uuid.uuid4().hex[:12]}"
        return self._processor.start_session(user_id, session_id)

    def end_session(self, user_id: str) -> Dict:
        """Terminate a user session and cleanup resources."""
        result = self._processor.end_session(user_id)
        # Backward-compatible response shape
        if result.get("status") == "ended":
            result.setdefault("duration_seconds", 0.0)
            result.setdefault("final_trust_score", 1.0)
            result.setdefault("final_decision", result.get("was_blocked") and "BLOCK" or "ALLOW")
            result.setdefault("was_blocked", False)
            result.setdefault("drift_detected", False)
            result.setdefault("cognitive_states_observed", [])
        return result

    def process_event(
        self,
        user_id: str,
        raw_event: Dict,
        transaction_amount: float = 0.0,
        is_new_beneficiary: bool = False,
    ) -> Dict:
        """
        Process a single behavioral event through the trust pipeline.

        Returns response in the legacy SessionManager format for backward compat:
        - trust_state: {trust_score, action, cognitive_state, ...}
        - drift: {detected, severity, ...}
        - temporal_dynamics: {velocity, acceleration, trend, entropy}
        - decision: {action, confidence, reasons, step_up_methods}
        """
        result = self._processor.process_behavioral_event(
            user_id=user_id,
            raw_event=raw_event,
            transaction_amount=transaction_amount,
            is_new_beneficiary=is_new_beneficiary,
        )

        # Pass through errors unchanged
        if "error" in result:
            return result

        # Transform flat EventProcessor response → nested SessionManager format
        return {
            "type": "trust_update",
            "user_id": user_id,
            "session_id": result.get("session_id", ""),
            "event_number": result.get("event_number", 0),
            "timestamp": result.get("timestamp", ""),
            "trust_state": {
                "trust_score": result.get("trust_score", 1.0),
                "effective_trust": result.get("effective_trust", 1.0),
                "trust_level": result.get("trust_level", "high"),
                "cognitive_state": result.get("cognitive_state", "calm"),
                "cognitive_stability": result.get("cognitive_stability", 1.0),
                "action": result.get("decision", "ALLOW"),
                "drift_score": 1.0 - result.get("similarity", 1.0),
            },
            "temporal_dynamics": result.get("temporal", {
                "velocity": 0.0,
                "acceleration": 0.0,
                "trend": "stable",
                "entropy": 0.0,
            }),
            "drift": {
                "detected": result.get("drift_detected", False),
                "severity": result.get("drift_severity", "none"),
            },
            "decision": {
                "action": result.get("decision", "ALLOW"),
                "confidence": result.get("confidence", 1.0),
                "reasons": result.get("reasons", []),
                "step_up_methods": [],
            },
            "similarity": {
                "current": result.get("similarity", 1.0),
            },
        }

    def get_session(self, user_id: str) -> Optional[Dict]:
        """Get active session summary for a user."""
        if user_id in self._processor._contexts:
            return {"user_id": user_id, "is_active": True}
        return None

    def get_active_sessions(self) -> List[Dict]:
        """List all active sessions."""
        return [
            {"user_id": uid, "is_active": True}
            for uid in self._processor.get_active_users()
        ]
