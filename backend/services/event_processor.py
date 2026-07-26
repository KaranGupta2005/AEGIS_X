"""
Event Processor — Central Traffic Controller
================================================================
The single entry point that connects the WebSocket layer to the Trust Pipeline.

Architecture:
    WebSocket → Event Processor → Pipeline → Session Update → Response Builder

The Event Processor is responsible for:
1. Receiving aggregated BehaviorWindows from the continuous SDK (every 2s)
2. Validating event structure
3. Routing to the correct user session
4. Executing the trust pipeline
5. Maintaining the continuous session timeline (screen, activity, SDK state)
6. Updating session state (histories, velocities, alerts)
7. Building the response payload
8. Generating alerts if thresholds breached
9. Writing audit log entries
10. Persisting pipeline state to Redis for crash recovery

Continuous Monitoring Architecture:
    Application Launch → SDK INITIALIZING → OBSERVING → LEARNING
       → TRANSACTION → VERIFYING → OBSERVING → ... → FINISHED

    Every screen contributes to trust — not just payment screens.
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
from backend.services.adaptive_learning import AdaptiveLearningService, LearningResult


# Audit log directory
AUDIT_LOG_DIR = Path(__file__).parent.parent.parent / "logs"
AUDIT_LOG_DIR.mkdir(parents=True, exist_ok=True)

# How often to persist pipeline state to Redis (every N events per user)
STATE_PERSIST_INTERVAL = 5


class AlertEngine:
    """
    Generates human-readable alerts based on trust state.

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
    Records every trust decision for compliance and traceability.

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
    6. Persists pipeline state to Redis (every 5 events — FIX #9)
    7. Builds the structured response
    8. Returns everything needed for WebSocket + Dashboard
    """

    def __init__(self):
        """Initialize all subsystems."""
        self._pipeline = TrustPipeline()
        self._baseline_service = BaselineService()
        self._adaptive_learning = AdaptiveLearningService()
        self._feature_engineer = FeatureEngineer()
        self._alert_engine = AlertEngine()
        self._audit_logger = AuditLogger()
        self._cache = CacheService()

        # Active pipeline contexts: user_id → PipelineContext
        self._contexts: Dict[str, PipelineContext] = {}

        # Session metadata
        self._session_ids: Dict[str, str] = {}
        self._session_alerts: Dict[str, List[Dict]] = {}
        self._blocked_users: Dict[str, str] = {}  # user_id → block reason

        # ── Continuous session state (new) ──────────────────────────────────
        # Tracks the full lifecycle from app launch through session end
        self._session_start_times: Dict[str, datetime] = {}
        self._current_screens: Dict[str, str] = {}          # user_id → screen
        self._sdk_states: Dict[str, str] = {}               # user_id → SDK state
        self._current_activities: Dict[str, str] = {}       # user_id → activity label
        self._session_timelines: Dict[str, List[Dict]] = {} # user_id → timeline entries
        self._decision_histories: Dict[str, List[Dict]] = {} # user_id → decision log
        self._trust_histories: Dict[str, List[float]] = {}  # user_id → trust score list
        self._navigation_paths: Dict[str, List[str]] = {}   # user_id → screen path

    # ═══════════════════════════════════════════════════════════════════════
    # SESSION LIFECYCLE
    # ═══════════════════════════════════════════════════════════════════════

    def start_session(self, user_id: str, session_id: str) -> Dict:
        """
        Initialize processing context for a new user session.
        Called at application launch — not at transaction start.
        Loads adaptive behavioral profile (or falls back to legacy baseline).
        """
        # Prefer adaptive profile over legacy baseline
        baseline, meta = self._adaptive_learning.get_active_baseline(user_id)
        if baseline is None:
            # Fallback to legacy baseline service for backward compat
            baseline, meta = self._baseline_service.load_baseline(user_id)

        ctx = self._pipeline.create_context(user_id=user_id, baseline=baseline)

        # Attempt to restore pipeline state from Redis (crash recovery)
        saved_state = self._cache.load_pipeline_state(user_id)
        if saved_state and saved_state.get("session_id") == session_id:
            self._restore_pipeline_context(ctx, saved_state)

        self._contexts[user_id] = ctx
        self._session_ids[user_id] = session_id
        self._session_alerts[user_id] = []

        # Initialize continuous session tracking
        now = datetime.now(timezone.utc)
        self._session_start_times[user_id] = now
        self._current_screens[user_id] = "home"
        self._sdk_states[user_id] = "OBSERVING"
        self._current_activities[user_id] = "Session started"
        self._session_timelines[user_id] = []
        self._decision_histories[user_id] = []
        self._trust_histories[user_id] = []
        self._navigation_paths[user_id] = ["home"]

        self._cache.set_session_state(user_id, {
            "session_id": session_id,
            "has_baseline": baseline is not None,
            "started_at": now.isoformat(),
            "event_count": ctx.event_count,
            "sdk_state": "OBSERVING",
            "current_screen": "home",
        })

        return {
            "user_id": user_id,
            "session_id": session_id,
            "has_baseline": baseline is not None,
            "status": "ready",
            "restored_events": ctx.event_count,
            "sdk_state": "OBSERVING",
            "started_at": now.isoformat(),
        }

    def end_session(self, user_id: str) -> Dict:
        """Clean up session resources and remove persisted pipeline state."""
        ctx = self._contexts.pop(user_id, None)
        session_id = self._session_ids.pop(user_id, "unknown")
        alerts = self._session_alerts.pop(user_id, [])
        was_blocked = user_id in self._blocked_users
        self._blocked_users.pop(user_id, None)

        # Clean up continuous session state
        start_time = self._session_start_times.pop(user_id, None)
        timeline = self._session_timelines.pop(user_id, [])
        decision_history = self._decision_histories.pop(user_id, [])
        self._current_screens.pop(user_id, None)
        self._sdk_states.pop(user_id, None)
        self._current_activities.pop(user_id, None)
        self._trust_histories.pop(user_id, None)
        nav_path = self._navigation_paths.pop(user_id, [])

        self._cache.delete_session_state(user_id)
        self._cache.delete_pipeline_state(user_id)
        self._cache.flush_user(user_id)

        if ctx is None:
            return {"status": "not_found"}

        # Compute session duration
        now = datetime.now(timezone.utc)
        duration_s = (now - start_time).total_seconds() if start_time else 0.0

        trust_history = ctx.trust_engine.get_trust_history()
        final_trust = trust_history[-1] if trust_history else 1.0

        # ─── ADAPTIVE LEARNING: evaluate session for profile update ─────
        learning_result_dict = None
        trust_hist = self._trust_histories.get(user_id) or trust_history
        if ctx.event_count >= 5 and trust_hist:
            mean_trust = sum(trust_hist) / len(trust_hist) if trust_hist else final_trust
            mean_similarity = float(ctx.history._scores[-1]) if len(ctx.history._scores) > 0 else 1.0

            # Use baseline as proxy for session embedding (full impl accumulates per window)
            session_embedding = ctx.baseline if ctx.is_enrolled else None
            if session_embedding is not None:
                learning_result = self._adaptive_learning.evaluate_session(
                    user_id=user_id,
                    session_embedding=session_embedding,
                    trust_score=mean_trust,
                    similarity=mean_similarity,
                    drift_detected=ctx.cusum.is_drifting,
                    drift_severity=getattr(ctx.cusum, 'severity', 'none') if ctx.cusum.is_drifting else 'none',
                    cognitive_state="calm",
                    session_windows=ctx.event_count,
                    is_learning_candidate=not was_blocked,
                )
                learning_result_dict = learning_result.to_dict()

        return {
            "user_id": user_id,
            "session_id": session_id,
            "status": "ended",
            "total_events": ctx.event_count,
            "total_alerts": len(alerts),
            "final_trust_score": round(final_trust, 4),
            "was_blocked": was_blocked,
            "drift_detected": ctx.cusum.is_drifting,
            "duration_seconds": round(duration_s, 1),
            "screens_visited": list(dict.fromkeys(nav_path)),  # unique ordered
            "total_timeline_entries": len(timeline),
            "total_decisions": len(decision_history),
            "learning": learning_result_dict,
        }

    # ═══════════════════════════════════════════════════════════════════════
    # FIX #9: STATE PERSISTENCE HELPERS
    # ═══════════════════════════════════════════════════════════════════════

    def _persist_pipeline_state(self, user_id: str, ctx: PipelineContext, session_id: str):
        """
        Serialize pipeline context state to Redis for crash recovery.

        Persists: CUSUM state, similarity history, trust history, event count.
        Called every STATE_PERSIST_INTERVAL events (default: 5) to minimize
        Redis overhead while ensuring minimal state loss on crash.
        """
        try:
            state = {
                "session_id": session_id,
                "user_id": user_id,
                "event_count": ctx.event_count,
                "is_enrolled": ctx.is_enrolled,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "cusum": {
                    "cusum_pos": ctx.cusum._cusum_pos,
                    "cusum_neg": ctx.cusum._cusum_neg,
                    "previous_score": ctx.cusum._previous_score,
                    "step_count": ctx.cusum._step_count,
                    "drift_detected": ctx.cusum._drift_detected,
                    "max_cusum": ctx.cusum._max_cusum,
                },
                "similarity_history": list(ctx.history._scores),
                "trust_history": list(ctx.trust_engine._history),
            }
            self._cache.save_pipeline_state(user_id, state)
        except Exception as e:
            # Non-critical: log but don't fail the pipeline
            print(f"[AEGIS-X] Warning: Failed to persist state for {user_id}: {e}")

    def _restore_pipeline_context(self, ctx: PipelineContext, state: Dict):
        """
        Restore pipeline context from persisted Redis state after a crash/restart.

        Rebuilds: CUSUM accumulator, similarity history buffer,
        trust history, and event count so the session continues seamlessly.
        """
        try:
            ctx.event_count = state.get("event_count", 0)

            # Restore CUSUM state
            cusum_state = state.get("cusum", {})
            if cusum_state:
                ctx.cusum._cusum_pos = cusum_state.get("cusum_pos", 0.0)
                ctx.cusum._cusum_neg = cusum_state.get("cusum_neg", 0.0)
                ctx.cusum._previous_score = cusum_state.get("previous_score")
                ctx.cusum._step_count = cusum_state.get("step_count", 0)
                ctx.cusum._drift_detected = cusum_state.get("drift_detected", False)
                ctx.cusum._max_cusum = cusum_state.get("max_cusum", 0.0)

            # Restore similarity history
            for score in state.get("similarity_history", []):
                ctx.history.add(float(score))

            # Restore trust score history
            for score in state.get("trust_history", []):
                ctx.trust_engine._history.append(float(score))

        except Exception as e:
            print(f"[AEGIS-X] Warning: Failed to restore state for {ctx.user_id}: {e}")

    # ═══════════════════════════════════════════════════════════════════════
    # MAIN EVENT PROCESSING (called every 2 seconds per user)
    # ═══════════════════════════════════════════════════════════════════════

    def process_behavioral_event(
        self,
        user_id: str,
        raw_event: Dict,
        transaction_amount: float = 0.0,
        is_new_beneficiary: bool = False,
        sdk_context: Optional[Dict] = None,
    ) -> Dict:
        """
        Process one behavioral window through the full AEGIS-X trust pipeline.

        Called every 2 seconds from application launch onward — not just during
        payment. This is what makes AEGIS-X a continuous authentication platform.

        Args:
            user_id: User identifier.
            raw_event: Aggregated 16-feature behavioral window from SDK.
            transaction_amount: Active transaction amount (₹0 if not in payment).
            is_new_beneficiary: Whether transfer target is new/unknown.
            sdk_context: Optional enriched context (screen, SDK state, navigation).

        Returns:
            Complete structured response with trust assessment + session context.
        """
        # ─── GET CONTEXT ───────────────────────────────────────────────────
        ctx = self._contexts.get(user_id)
        if ctx is None:
            return {"error": "no_session", "message": "Call start_session first."}

        # ─── CHECK IF SESSION IS BLOCKED ───────────────────────────────────
        import os
        if user_id in self._blocked_users:
            if os.getenv("AEGISX_DEMO_MODE", "false").lower() == "true":
                self._blocked_users.pop(user_id, None)
            else:
                return {
                    "error": "session_blocked",
                    "reason": self._blocked_users[user_id],
                    "action": "BLOCK",
                }

        # ─── UPDATE CONTINUOUS SESSION STATE ──────────────────────────────
        if sdk_context:
            screen = sdk_context.get("current_screen", self._current_screens.get(user_id, "home"))
            sdk_state = sdk_context.get("sdk_state", self._sdk_states.get(user_id, "OBSERVING"))
            self._current_screens[user_id] = screen
            self._sdk_states[user_id] = sdk_state

            # Update navigation path if screen changed
            nav_path = self._navigation_paths.get(user_id, [])
            if not nav_path or nav_path[-1] != screen:
                nav_path.append(screen)
                self._navigation_paths[user_id] = nav_path[-50:]  # cap at 50

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

        # ─── PERSIST PIPELINE STATE (every N events) ──────────────────────
        if ctx.event_count % STATE_PERSIST_INTERVAL == 0:
            self._persist_pipeline_state(user_id, ctx, session_id)

        # ─── UPDATE CONTINUOUS TIMELINE ───────────────────────────────────
        timeline_entry = {
            "timestamp": result.timestamp,
            "trust_score": round(result.trust_score, 4),
            "decision": result.decision,
            "cognitive_state": result.cognitive_state,
            "sdk_state": self._sdk_states.get(user_id, "OBSERVING"),
            "current_screen": self._current_screens.get(user_id, "home"),
            "event_number": result.event_number,
        }
        self._session_timelines.setdefault(user_id, []).append(timeline_entry)
        # Keep last 200 entries in memory
        if len(self._session_timelines[user_id]) > 200:
            self._session_timelines[user_id] = self._session_timelines[user_id][-200:]

        # Track trust history
        self._trust_histories.setdefault(user_id, []).append(result.trust_score)

        # Log to decision history
        self._decision_histories.setdefault(user_id, []).append({
            "timestamp": result.timestamp,
            "decision": result.decision,
            "trust_score": round(result.trust_score, 4),
            "screen": self._current_screens.get(user_id, "home"),
        })

        # ─── TRACK BLOCK STATE ─────────────────────────────────────────────
        if result.decision == "BLOCK":
            self._blocked_users[user_id] = result.explanation

        # ─── BUILD RESPONSE ───────────────────────────────────────────────
        return self._build_response(user_id, result, alerts)

    # ═══════════════════════════════════════════════════════════════════════
    # RESPONSE BUILDER
    # ═══════════════════════════════════════════════════════════════════════

    def _build_response(
        self,
        user_id: str,
        result: TrustUpdate,
        alerts: List[Dict],
    ) -> Dict:
        """
        Build the structured WebSocket response payload.

        This is the API CONTRACT — every frontend consumer (SDK, dashboard, monitoring)
        consumes this exact format. Backward compatible: all existing fields preserved,
        session_context added as an extension.
        """
        session_id = self._session_ids.get(user_id, "")
        current_screen = self._current_screens.get(user_id, "home")
        sdk_state = self._sdk_states.get(user_id, "OBSERVING")
        start_time = self._session_start_times.get(user_id)
        session_duration_s = (
            (datetime.now(timezone.utc) - start_time).total_seconds()
            if start_time else 0.0
        )

        response = {
            "type": "trust_update",
            "user_id": user_id,
            "session_id": session_id,
            "timestamp": result.timestamp,

            "trust_score": round(result.trust_score, 4),
            "effective_trust": round(result.effective_trust, 4),
            "decision": result.decision,
            "trust_level": result.trust_level,

            "similarity": round(result.similarity, 4),
            "cognitive_state": result.cognitive_state,
            "cognitive_stability": result.cognitive_stability,

            "drift_detected": bool(result.drift_detected),
            "drift_severity": result.drift_severity,

            "anomaly": {
                "score": round(result.anomaly_score, 4),
                "is_anomaly": bool(result.is_anomaly),
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

            # ── Continuous session context (new) ─────────────────────────
            "session_context": {
                "sdk_state": sdk_state,
                "current_screen": current_screen,
                "session_duration_s": round(session_duration_s, 1),
                "navigation_path": self._navigation_paths.get(user_id, [])[-10:],
            },
        }

        self._cache.set_trust_score(user_id, {
            "trust_score": response["trust_score"],
            "decision": response["decision"],
            "cognitive_state": response["cognitive_state"],
            "fraud_probability": response["fraud"]["probability"],
            "current_screen": current_screen,
            "sdk_state": sdk_state,
        })

        if alerts:
            for alert in alerts:
                self._cache.push_alert(user_id, alert)

        return response

    # ═══════════════════════════════════════════════════════════════════════
    # QUERIES (for dashboard/API)
    # ═══════════════════════════════════════════════════════════════════════

    def get_trust_timeline(self, user_id: str) -> List[float]:
        """Return trust score history for timeline visualization."""
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

    def get_session_timeline(self, user_id: str) -> List[Dict]:
        """Return the full continuous session timeline (screen, trust, decision, SDK state)."""
        return self._session_timelines.get(user_id, [])

    def get_session_summary(self, user_id: str) -> Dict:
        """Return a rich summary of the current continuous session."""
        ctx = self._contexts.get(user_id)
        if ctx is None:
            return {}
        start_time = self._session_start_times.get(user_id)
        duration_s = (
            (datetime.now(timezone.utc) - start_time).total_seconds()
            if start_time else 0.0
        )
        trust_hist = self._trust_histories.get(user_id, [])
        return {
            "user_id": user_id,
            "session_id": self._session_ids.get(user_id, ""),
            "sdk_state": self._sdk_states.get(user_id, "OBSERVING"),
            "current_screen": self._current_screens.get(user_id, "home"),
            "current_activity": self._current_activities.get(user_id, ""),
            "duration_seconds": round(duration_s, 1),
            "event_count": ctx.event_count,
            "navigation_path": self._navigation_paths.get(user_id, []),
            "trust_history": [round(t, 4) for t in trust_hist[-50:]],
            "timeline_length": len(self._session_timelines.get(user_id, [])),
            "total_alerts": len(self._session_alerts.get(user_id, [])),
            "total_decisions": len(self._decision_histories.get(user_id, [])),
        }

    @property
    def active_user_count(self) -> int:
        """Number of users currently being monitored."""
        return len(self._contexts)
