"""
Event Processor — Central Traffic Controller
================================================================
The single entry point that connects the WebSocket layer to the Trust Pipeline.

Without this:
    WebSocket → Pipeline (tight coupling, messy)

With this:
    WebSocket → Event Processor → Pipeline → Session Update → Response Builder
    (clean separation of concerns, testable, auditable)

The Event Processor is responsible for:
1. Receiving raw events from WebSocket
2. Validating event structure
3. Routing to the correct user session
4. Executing the trust pipeline
5. Updating session state (histories, velocities, alerts)
6. Building the response payload
7. Generating alerts if thresholds breached
8. Writing audit log entries

This is the CONTROLLER in MVC terms — it doesn't DO the computation,
it ORCHESTRATES it and manages the data flow between components.

Architecture:
    WebSocket Handler
         ↓
    EventProcessor.process_behavioral_event(user_id, raw_event, context)
         ↓
    ┌── Validation
    ├── SessionManager (get/create session)
    ├── TrustPipeline.process(ctx, event)
    ├── Alert Engine (generate alerts if needed)
    ├── Audit Logger (record every decision)
    └── Response Builder (structured WebSocket payload)
         ↓
    TrustResponse → WebSocket → Client + Dashboard
"""

import numpy as np
from typing import Dict, Optional, List
from datetime import datetime, timezone
from pathlib import Path
import json

from backend.services.trust_pipeline import TrustPipeline, PipelineContext, TrustUpdate
from backend.services.baseline_service import BaselineService
from backend.services.feature_engineering import FeatureEngineer
from backend.services.cache_service import CacheService


# Audit log directory
AUDIT_LOG_DIR = Path(__file__).parent.parent.parent / "logs"
AUDIT_LOG_DIR.mkdir(parents=True, exist_ok=True)


class AlertEngine:
    """
    Phase 6I: Generates human-readable alerts based on trust state.

    Alerts are pushed to the dashboard immediately and stored in audit logs.
    They answer: "What just happened and why should a human care?"
    """

    ALERT_RULES = [
        # (condition_fn, severity, message_template)
        (lambda r: r.cognitive_state == "coerced",
         "CRITICAL", "External coercion detected — user may be under duress from social engineering attack."),
        (lambda r: r.cognitive_state == "robotic",
         "CRITICAL", "Automated behavior detected — possible remote access malware or screen mirroring."),
        (lambda r: r.cognitive_state == "panicked" and r.trust_score < 0.70,
         "HIGH", "Severe cognitive distress with declining trust — potential active scam call."),
        (lambda r: r.decision == "BLOCK",
         "HIGH", "Session BLOCKED — trust score below critical threshold."),
        (lambda r: r.drift_detected and r.drift_severity in ("high", "critical"),
         "MEDIUM", "Significant behavioral drift detected — possible account takeover in progress."),
        (lambda r: r.decision == "STEP_UP",
         "LOW", "Elevated risk — step-up verification requested."),
        (lambda r: r.velocity < -0.04,
         "MEDIUM", "Trust score declining rapidly — accelerating behavioral divergence."),
    ]

    def evaluate(self, result: TrustUpdate) -> List[Dict]:
        """
        Evaluate all alert rules against a pipeline result.

        Returns:
            List of triggered alerts, each with severity, message, and metadata.
        """
        alerts = []
        for condition_fn, severity, message in self.ALERT_RULES:
            try:
                if condition_fn(result):
                    alerts.append({
                        "severity": severity,
                        "message": message,
                        "cognitive_state": result.cognitive_state,
                        "trust_score": round(result.trust_score, 4),
                        "decision": result.decision,
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                    })
            except Exception:
                continue

        # Deduplicate by severity (keep highest per cycle)
        seen_severities = set()
        unique_alerts = []
        for alert in alerts:
            if alert["severity"] not in seen_severities:
                seen_severities.add(alert["severity"])
                unique_alerts.append(alert)

        return unique_alerts


class AuditLogger:
    """
    Phase 6J: Records every trust decision for compliance and traceability.

    Banks require complete audit trails:
    - What happened? (event details)
    - What was decided? (ALLOW/STEP_UP/BLOCK)
    - Why? (reasons, scores, cognitive state)
    - When? (timestamp)
    - For whom? (user_id, session_id)

    Stores: JSON lines format (one JSON object per line, easy to parse).
    Production: would write to PostgreSQL or dedicated logging service.
    """

    def __init__(self, log_dir: Path = AUDIT_LOG_DIR):
        self._log_dir = log_dir
        self._log_dir.mkdir(parents=True, exist_ok=True)

    def log_decision(
        self,
        user_id: str,
        session_id: str,
        result: TrustUpdate,
        alerts: List[Dict],
        transaction_amount: float = 0.0,
    ):
        """
        Write a single decision record to the audit log.

        Format: JSON Lines (one record per line, chronological).
        """
        record = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "user_id": user_id,
            "session_id": session_id,
            "event_number": result.event_number,
            "trust_score": round(result.trust_score, 4),
            "effective_trust": round(result.effective_trust, 4),
            "decision": result.decision,
            "cognitive_state": result.cognitive_state,
            "cognitive_stability": result.cognitive_stability,
            "similarity": round(result.similarity, 4),
            "drift_detected": result.drift_detected,
            "drift_severity": result.drift_severity,
            "velocity": round(result.velocity, 6),
            "transaction_amount": transaction_amount,
            "latency_ms": round(result.latency_ms, 1),
            "alerts": [a["severity"] for a in alerts],
            "reasons": result.reasons,
        }

        # Write to daily log file
        date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        log_file = self._log_dir / f"audit_{date_str}.jsonl"

        with open(log_file, "a", encoding="utf-8") as f:
            f.write(json.dumps(record) + "\n")


class EventProcessor:
    """
    Central traffic controller: receives events, orchestrates processing, returns results.

    This is the TOP-LEVEL interface that the WebSocket handler calls.
    One method call handles everything:
        result = processor.process_behavioral_event(user_id, event, context)

    Internally it:
    1. Validates the event
    2. Retrieves/creates the user's pipeline context
    3. Runs the full trust pipeline
    4. Evaluates alert rules
    5. Logs the decision for audit
    6. Builds the structured response
    7. Returns everything needed for WebSocket + Dashboard

    This replaces all the manual orchestration that would otherwise
    live in the WebSocket handler itself.
    """

    def __init__(self):
        """Initialize all subsystems."""
        self._pipeline = TrustPipeline()
        self._baseline_service = BaselineService()
        self._feature_engineer = FeatureEngineer()
        self._alert_engine = AlertEngine()
        self._audit_logger = AuditLogger()
        self._cache = CacheService()

        # Active pipeline contexts: user_id → PipelineContext
        self._contexts: Dict[str, PipelineContext] = {}

        # Session metadata
        self._session_ids: Dict[str, str] = {}
        self._session_alerts: Dict[str, List[Dict]] = {}

    # ═══════════════════════════════════════════════════════════════════════
    # SESSION LIFECYCLE
    # ═══════════════════════════════════════════════════════════════════════

    def start_session(self, user_id: str, session_id: str) -> Dict:
        """
        Initialize processing context for a new user session.
        Loads baseline if available.
        """
        baseline, meta = self._baseline_service.load_baseline(user_id)
        ctx = self._pipeline.create_context(user_id=user_id, baseline=baseline)
        self._contexts[user_id] = ctx
        self._session_ids[user_id] = session_id
        self._session_alerts[user_id] = []

        self._cache.set_session_state(user_id, {
            "session_id": session_id,
            "has_baseline": baseline is not None,
            "started_at": datetime.now(timezone.utc).isoformat(),
            "event_count": 0,
        })

        return {
            "user_id": user_id,
            "session_id": session_id,
            "has_baseline": baseline is not None,
            "status": "ready",
        }

    def end_session(self, user_id: str) -> Dict:
        """Clean up session resources."""
        ctx = self._contexts.pop(user_id, None)
        session_id = self._session_ids.pop(user_id, "unknown")
        alerts = self._session_alerts.pop(user_id, [])

        self._cache.delete_session_state(user_id)
        self._cache.flush_user(user_id)

        if ctx is None:
            return {"status": "not_found"}

        return {
            "user_id": user_id,
            "session_id": session_id,
            "status": "ended",
            "total_events": ctx.event_count,
            "total_alerts": len(alerts),
        }

    # ═══════════════════════════════════════════════════════════════════════
    # MAIN EVENT PROCESSING (called every 2 seconds per user)
    # ═══════════════════════════════════════════════════════════════════════

    def process_behavioral_event(
        self,
        user_id: str,
        raw_event: Dict,
        transaction_amount: float = 0.0,
        is_new_beneficiary: bool = False,
    ) -> Dict:
        """
        Process one behavioral heartbeat through the entire AEGIS-X engine.

        THIS IS THE SINGLE FUNCTION THAT MAKES EVERYTHING WORK.

        Args:
            user_id: User identifier.
            raw_event: Raw 16-feature behavioral telemetry from SDK.
            transaction_amount: Pending transaction amount (₹).
            is_new_beneficiary: Whether target account is new/unknown.

        Returns:
            Complete structured response for WebSocket transmission:
            {
                "trust_score": 0.92,
                "decision": "ALLOW",
                "cognitive_state": "calm",
                "drift_detected": false,
                "velocity": -0.001,
                "alerts": [],
                "event_number": 5,
                "latency_ms": 65.2,
                ...
            }
        """
        # ─── GET CONTEXT ───────────────────────────────────────────────────
        ctx = self._contexts.get(user_id)
        if ctx is None:
            return {"error": "no_session", "message": "Call start_session first."}

        # ─── VALIDATE EVENT ────────────────────────────────────────────────
        validation = self._feature_engineer.validate_event(raw_event)
        if validation["completeness"] < 0.5:
            return {
                "error": "invalid_event",
                "message": f"Event too incomplete ({validation['completeness']:.0%}). "
                           f"Missing: {validation['missing_fields'][:5]}",
            }

        # ─── EXECUTE TRUST PIPELINE ────────────────────────────────────────
        result: TrustUpdate = self._pipeline.process(
            ctx=ctx,
            raw_event=raw_event,
            transaction_amount=transaction_amount,
            is_new_beneficiary=is_new_beneficiary,
        )

        # ─── GENERATE ALERTS ──────────────────────────────────────────────
        alerts = self._alert_engine.evaluate(result)
        if alerts:
            self._session_alerts.setdefault(user_id, []).extend(alerts)

        # ─── AUDIT LOG ────────────────────────────────────────────────────
        session_id = self._session_ids.get(user_id, "unknown")
        self._audit_logger.log_decision(
            user_id=user_id,
            session_id=session_id,
            result=result,
            alerts=alerts,
            transaction_amount=transaction_amount,
        )

        # ─── BUILD RESPONSE ───────────────────────────────────────────────
        return self._build_response(user_id, result, alerts)

    # ═══════════════════════════════════════════════════════════════════════
    # RESPONSE BUILDER (Phase 6G)
    # ═══════════════════════════════════════════════════════════════════════

    def _build_response(
        self,
        user_id: str,
        result: TrustUpdate,
        alerts: List[Dict],
    ) -> Dict:
        """
        Build the structured WebSocket response payload.

        This is the API CONTRACT — every frontend (SDK, dashboard, monitoring)
        consumes this exact format.
        """
        response = {
            "type": "trust_update",
            "user_id": user_id,
            "session_id": self._session_ids.get(user_id, ""),
            "timestamp": result.timestamp,

            "trust_score": round(result.trust_score, 4),
            "effective_trust": round(result.effective_trust, 4),
            "decision": result.decision,
            "trust_level": result.trust_level,

            "similarity": round(result.similarity, 4),
            "cognitive_state": result.cognitive_state,
            "cognitive_stability": result.cognitive_stability,

            "drift_detected": result.drift_detected,
            "drift_severity": result.drift_severity,

            "anomaly": {
                "score": round(result.anomaly_score, 4),
                "is_anomaly": result.is_anomaly,
            },

            "fraud": {
                "probability": round(result.fraud_probability, 4),
                "trajectory": result.fraud_trajectory,
                "intent_vector": result.intent_vector,
            },

            "temporal": {
                "velocity": round(result.velocity, 6),
                "acceleration": round(result.acceleration, 6),
                "trend": result.trend,
                "entropy": round(result.entropy, 4),
            },

            "reasons": result.reasons,
            "explanation": result.explanation,

            "alerts": alerts,

            "event_number": result.event_number,
            "latency_ms": round(result.latency_ms, 1),
            "confidence": round(result.confidence, 4),
        }

        self._cache.set_trust_score(user_id, {
            "trust_score": response["trust_score"],
            "decision": response["decision"],
            "cognitive_state": response["cognitive_state"],
            "fraud_probability": response["fraud"]["probability"],
        })

        if alerts:
            for alert in alerts:
                self._cache.push_alert(user_id, alert)

        return response

    # ═══════════════════════════════════════════════════════════════════════
    # QUERIES (for dashboard/API)
    # ═══════════════════════════════════════════════════════════════════════

    def get_trust_timeline(self, user_id: str) -> List[float]:
        """Phase 6H: Return trust score history for timeline visualization."""
        ctx = self._contexts.get(user_id)
        if ctx is None:
            return []
        return ctx.trust_engine.get_trust_history()

    def get_session_alerts(self, user_id: str) -> List[Dict]:
        """Get all alerts generated during this session."""
        return self._session_alerts.get(user_id, [])

    def get_active_users(self) -> List[str]:
        """List all users with active processing contexts."""
        return list(self._contexts.keys())

    @property
    def active_user_count(self) -> int:
        """Number of users currently being monitored."""
        return len(self._contexts)
