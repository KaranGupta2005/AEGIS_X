"""
Security Containment System — State Machine, Sandbox, Deception, Intelligence.

SECURITY STATES:
    NORMAL → MONITORING → SUSPICIOUS → CONTAINMENT → VERIFICATION → RECOVERY → TERMINATED

TRUST POLICIES:
    Trust > 80%   → NORMAL operation
    Trust 60-80%  → MONITORING (increase observation)
    Trust 40-60%  → SUSPICIOUS (containment preparation)
    Trust < 40%   → CONTAINMENT (sandbox activated, no real APIs)
    Critical      → TERMINATED (freeze all payment APIs)

TRANSACTION SANDBOX:
    When active: NO real money movement, NO payment gateway calls, NO balance changes.
    Returns simulated responses. Attacker never knows they're sandboxed.
"""

import time
import uuid
import hashlib
import numpy as np
from enum import Enum
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field


# ═══════════════════════════════════════════════════════════════════════════════
# SECURITY STATE MACHINE
# ═══════════════════════════════════════════════════════════════════════════════

class SecurityState(str, Enum):
    NORMAL = "NORMAL"
    MONITORING = "MONITORING"
    SUSPICIOUS = "SUSPICIOUS"
    CONTAINMENT = "CONTAINMENT"
    VERIFICATION = "VERIFICATION"
    RECOVERY = "RECOVERY"
    TERMINATED = "TERMINATED"


VALID_TRANSITIONS = {
    SecurityState.NORMAL:       [SecurityState.MONITORING, SecurityState.TERMINATED],
    SecurityState.MONITORING:   [SecurityState.NORMAL, SecurityState.SUSPICIOUS, SecurityState.TERMINATED],
    SecurityState.SUSPICIOUS:   [SecurityState.MONITORING, SecurityState.CONTAINMENT, SecurityState.TERMINATED],
    SecurityState.CONTAINMENT:  [SecurityState.VERIFICATION, SecurityState.TERMINATED],
    SecurityState.VERIFICATION: [SecurityState.RECOVERY, SecurityState.CONTAINMENT, SecurityState.TERMINATED],
    SecurityState.RECOVERY:     [SecurityState.NORMAL, SecurityState.MONITORING, SecurityState.TERMINATED],
    SecurityState.TERMINATED:   [],
}


# ═══════════════════════════════════════════════════════════════════════════════
# CONFIGURABLE POLICIES
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class SecurityPolicy:
    """Configurable thresholds — never hard-coded."""
    trust_normal: float = 0.80
    trust_monitoring: float = 0.60
    trust_suspicious: float = 0.40
    trust_containment: float = 0.40
    trust_critical: float = 0.20
    bot_confidence_threshold: float = 0.70
    max_requests_per_second: float = 10.0
    max_failed_verifications: int = 3
    sandbox_duration_seconds: float = 300.0
    containment_cooldown_seconds: float = 60.0


DEFAULT_POLICY = SecurityPolicy()


# ═══════════════════════════════════════════════════════════════════════════════
# SESSION SECURITY CONTEXT
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class SecurityEvent:
    timestamp: str
    event_type: str
    description: str
    trust_score: float = 0.0
    risk_level: str = ""
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class BotIndicators:
    """Heuristic bot detection signals."""
    perfect_timing: bool = False
    impossible_mouse: bool = False
    instant_form_completion: bool = False
    no_hesitation: bool = False
    repeated_identical_actions: bool = False
    high_frequency_requests: bool = False
    low_entropy_interactions: bool = False
    confidence: float = 0.0

    def to_dict(self) -> Dict:
        return {
            "perfect_timing": self.perfect_timing,
            "impossible_mouse": self.impossible_mouse,
            "instant_form_completion": self.instant_form_completion,
            "no_hesitation": self.no_hesitation,
            "repeated_identical_actions": self.repeated_identical_actions,
            "high_frequency_requests": self.high_frequency_requests,
            "low_entropy_interactions": self.low_entropy_interactions,
            "confidence": round(self.confidence, 4),
        }


@dataclass
class AttackerFingerprint:
    """Collected intelligence about a suspicious session."""
    session_id: str
    user_id: str
    fingerprint_id: str = ""
    navigation_sequence: List[str] = field(default_factory=list)
    timing_pattern: List[float] = field(default_factory=list)
    api_requests: List[Dict] = field(default_factory=list)
    retry_count: int = 0
    automation_indicators: List[str] = field(default_factory=list)
    bot_indicators: BotIndicators = field(default_factory=BotIndicators)
    first_seen: str = ""
    last_seen: str = ""

    def to_dict(self) -> Dict:
        return {
            "fingerprint_id": self.fingerprint_id,
            "session_id": self.session_id,
            "user_id": self.user_id,
            "navigation_sequence": self.navigation_sequence[-20:],
            "timing_anomalies": len([t for t in self.timing_pattern if t < 0.05]),
            "api_request_count": len(self.api_requests),
            "retry_count": self.retry_count,
            "automation_indicators": self.automation_indicators,
            "bot_indicators": self.bot_indicators.to_dict(),
            "first_seen": self.first_seen,
            "last_seen": self.last_seen,
        }


@dataclass
class SessionSecurityContext:
    """Per-session security state and intelligence."""
    session_id: str
    user_id: str
    state: SecurityState = SecurityState.NORMAL
    previous_state: SecurityState = SecurityState.NORMAL
    sandbox_active: bool = False
    sandbox_activated_at: str = ""
    trust_history: List[float] = field(default_factory=list)
    events: List[SecurityEvent] = field(default_factory=list)
    fingerprint: Optional[AttackerFingerprint] = None
    failed_verifications: int = 0
    containment_reason: str = ""
    created_at: str = ""
    state_changed_at: str = ""

    # CSRF / Session security
    csrf_token: str = ""
    session_token_rotated_at: str = ""
    origin_validated: bool = True



# ═══════════════════════════════════════════════════════════════════════════════
# THREAT DETECTION SERVICE
# ═══════════════════════════════════════════════════════════════════════════════

class ThreatDetectionService:
    """Evaluates session risk from trust signals and behavioral indicators."""

    def __init__(self, policy: SecurityPolicy = DEFAULT_POLICY):
        self._policy = policy

    def evaluate_threat_level(
        self,
        trust_score: float,
        cognitive_state: str,
        drift_detected: bool,
        drift_severity: str,
        velocity: float,
        anomaly_score: float,
        bot_indicators: BotIndicators,
    ) -> Dict:
        """Evaluate current threat level and recommended security state."""
        threat_score = 0.0
        reasons = []

        # Trust-based threat
        if trust_score < self._policy.trust_critical:
            threat_score += 0.40
            reasons.append(f"Critical trust level ({trust_score:.0%})")
        elif trust_score < self._policy.trust_containment:
            threat_score += 0.30
            reasons.append(f"Trust below containment threshold ({trust_score:.0%})")
        elif trust_score < self._policy.trust_monitoring:
            threat_score += 0.15
            reasons.append(f"Trust in monitoring zone ({trust_score:.0%})")

        # Cognitive indicators
        if cognitive_state in ("coerced", "robotic"):
            threat_score += 0.30
            reasons.append(f"Cognitive state: {cognitive_state}")
        elif cognitive_state == "panicked":
            threat_score += 0.15
            reasons.append("Panic indicators detected")

        # Drift
        if drift_detected and drift_severity in ("high", "critical"):
            threat_score += 0.15
            reasons.append(f"Behavioral drift: {drift_severity}")

        # Velocity collapse
        if velocity < -0.04:
            threat_score += 0.10
            reasons.append(f"Rapid trust collapse (velocity={velocity:.4f})")

        # Bot confidence
        if bot_indicators.confidence > self._policy.bot_confidence_threshold:
            threat_score += 0.25
            reasons.append(f"Bot detected (confidence={bot_indicators.confidence:.0%})")

        # Anomaly
        if anomaly_score > 0.7:
            threat_score += 0.10
            reasons.append(f"High anomaly score ({anomaly_score:.2f})")

        threat_score = min(1.0, threat_score)

        # Determine recommended state
        if threat_score > 0.70:
            recommended = SecurityState.CONTAINMENT
        elif threat_score > 0.50:
            recommended = SecurityState.SUSPICIOUS
        elif threat_score > 0.25:
            recommended = SecurityState.MONITORING
        else:
            recommended = SecurityState.NORMAL

        return {
            "threat_score": round(threat_score, 4),
            "recommended_state": recommended.value,
            "reasons": reasons,
            "risk_level": "critical" if threat_score > 0.70 else "high" if threat_score > 0.50 else "medium" if threat_score > 0.25 else "low",
        }


# ═══════════════════════════════════════════════════════════════════════════════
# SESSION CONTAINMENT SERVICE (State Machine)
# ═══════════════════════════════════════════════════════════════════════════════

class SessionContainmentService:
    """Manages the security state machine for each session."""

    def __init__(self, policy: SecurityPolicy = DEFAULT_POLICY):
        self._policy = policy
        self._sessions: Dict[str, SessionSecurityContext] = {}
        self._threat_detector = ThreatDetectionService(policy)

    def get_or_create(self, user_id: str, session_id: str) -> SessionSecurityContext:
        key = f"{user_id}:{session_id}"
        if key not in self._sessions:
            now = datetime.now(timezone.utc).isoformat()
            self._sessions[key] = SessionSecurityContext(
                session_id=session_id,
                user_id=user_id,
                created_at=now,
                state_changed_at=now,
                csrf_token=hashlib.sha256(f"{session_id}{time.time()}".encode()).hexdigest()[:32],
            )
        return self._sessions[key]

    def transition(self, ctx: SessionSecurityContext, new_state: SecurityState, reason: str = "") -> bool:
        """Attempt a state transition. Returns True if valid."""
        allowed = VALID_TRANSITIONS.get(ctx.state, [])
        if new_state not in allowed:
            return False

        now = datetime.now(timezone.utc).isoformat()
        ctx.previous_state = ctx.state
        ctx.state = new_state
        ctx.state_changed_at = now
        ctx.containment_reason = reason

        ctx.events.append(SecurityEvent(
            timestamp=now,
            event_type="state_transition",
            description=f"{ctx.previous_state.value} → {new_state.value}: {reason}",
            risk_level=new_state.value,
        ))

        # Activate/deactivate sandbox
        if new_state == SecurityState.CONTAINMENT:
            ctx.sandbox_active = True
            ctx.sandbox_activated_at = now
        elif new_state in (SecurityState.NORMAL, SecurityState.RECOVERY):
            ctx.sandbox_active = False

        return True

    def evaluate_and_update(
        self,
        user_id: str,
        session_id: str,
        trust_score: float,
        cognitive_state: str = "calm",
        drift_detected: bool = False,
        drift_severity: str = "none",
        velocity: float = 0.0,
        anomaly_score: float = 0.0,
        bot_indicators: Optional[BotIndicators] = None,
    ) -> Dict:
        """Evaluate threat and update security state if needed."""
        ctx = self.get_or_create(user_id, session_id)
        ctx.trust_history.append(trust_score)
        if len(ctx.trust_history) > 100:
            ctx.trust_history = ctx.trust_history[-100:]

        bots = bot_indicators or BotIndicators()
        threat = self._threat_detector.evaluate_threat_level(
            trust_score, cognitive_state, drift_detected, drift_severity,
            velocity, anomaly_score, bots,
        )

        recommended = SecurityState(threat["recommended_state"])

        # Auto-transition based on threat
        if recommended != ctx.state and ctx.state != SecurityState.TERMINATED:
            if recommended.value in [s.value for s in VALID_TRANSITIONS.get(ctx.state, [])]:
                self.transition(ctx, recommended, f"Auto: {'; '.join(threat['reasons'])}")

        return {
            "session_id": session_id,
            "user_id": user_id,
            "security_state": ctx.state.value,
            "sandbox_active": ctx.sandbox_active,
            "threat_score": threat["threat_score"],
            "risk_level": threat["risk_level"],
            "reasons": threat["reasons"],
            "event_count": len(ctx.events),
        }

    def get_status(self, user_id: str, session_id: str) -> Dict:
        ctx = self.get_or_create(user_id, session_id)
        return {
            "security_state": ctx.state.value,
            "previous_state": ctx.previous_state.value,
            "sandbox_active": ctx.sandbox_active,
            "containment_reason": ctx.containment_reason,
            "trust_history_length": len(ctx.trust_history),
            "event_count": len(ctx.events),
            "failed_verifications": ctx.failed_verifications,
            "created_at": ctx.created_at,
            "state_changed_at": ctx.state_changed_at,
        }

    def is_sandboxed(self, user_id: str, session_id: str) -> bool:
        ctx = self.get_or_create(user_id, session_id)
        return ctx.sandbox_active



# ═══════════════════════════════════════════════════════════════════════════════
# TRANSACTION SANDBOX
# ═══════════════════════════════════════════════════════════════════════════════

class TransactionSandbox:
    """
    Isolates suspicious transactions from real banking infrastructure.

    When active:
    - NO real money movement
    - NO payment gateway API calls
    - NO UPI API calls
    - NO account balance modifications
    - Returns simulated responses indistinguishable from real ones
    - Collects attacker behavior for forensics
    """

    def __init__(self):
        self._sandboxed_transactions: Dict[str, Dict] = {}

    def process_transaction(
        self,
        user_id: str,
        session_id: str,
        amount: float,
        beneficiary: str,
        payment_method: str = "UPI",
    ) -> Dict:
        """
        Process a transaction in sandbox mode.
        Returns a fake success response that looks real.
        NO actual money moves.
        """
        now = datetime.now(timezone.utc).isoformat()
        fake_ref = f"UPI{int(time.time() * 1000) % 100000000}"
        tx_id = str(uuid.uuid4())

        # Store sandboxed transaction for forensics
        record = {
            "tx_id": tx_id,
            "user_id": user_id,
            "session_id": session_id,
            "amount": amount,
            "beneficiary": beneficiary,
            "payment_method": payment_method,
            "timestamp": now,
            "status": "SANDBOXED",
            "real_execution": False,
            "reference": fake_ref,
        }
        self._sandboxed_transactions[tx_id] = record

        # Return response that looks exactly like a real success
        return {
            "status": "processing",
            "transaction_id": tx_id,
            "reference": fake_ref,
            "amount": amount,
            "beneficiary": beneficiary,
            "timestamp": now,
            # Internal flag — never exposed to client
            "_sandboxed": True,
            "_reason": "Session in containment — transaction isolated",
        }

    def get_sandboxed_transactions(self, user_id: str) -> List[Dict]:
        return [t for t in self._sandboxed_transactions.values() if t["user_id"] == user_id]


# ═══════════════════════════════════════════════════════════════════════════════
# DECEPTION ENGINE
# ═══════════════════════════════════════════════════════════════════════════════

class DeceptionEngine:
    """
    Generates controlled deception responses for sandboxed sessions.
    Responses must never expose internal architecture.
    """

    def generate_loading_response(self, duration_ms: int = 2000) -> Dict:
        return {
            "type": "processing",
            "message": "Verifying transaction details...",
            "estimated_time_ms": duration_ms,
            "show_spinner": True,
        }

    def generate_verification_response(self) -> Dict:
        return {
            "type": "verification",
            "message": "Additional security verification required",
            "method": "biometric",
            "timeout_seconds": 30,
        }

    def generate_delayed_confirmation(self, delay_ms: int = 3000) -> Dict:
        return {
            "type": "delayed_confirmation",
            "message": "Transaction is being processed by your bank",
            "estimated_completion_ms": delay_ms,
            "reference": f"REF{int(time.time()) % 1000000}",
        }

    def generate_fake_success(self, amount: float, beneficiary: str) -> Dict:
        return {
            "type": "success",
            "message": f"₹{amount:,.0f} sent to {beneficiary}",
            "reference": f"UPI{int(time.time() * 1000) % 100000000}",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    def generate_controlled_error(self, error_type: str = "timeout") -> Dict:
        errors = {
            "timeout": {"message": "Transaction timed out. Please try again.", "code": "TIMEOUT"},
            "bank_unavailable": {"message": "Beneficiary bank is temporarily unavailable.", "code": "BANK_OFFLINE"},
            "limit_exceeded": {"message": "Daily transaction limit reached.", "code": "LIMIT"},
            "maintenance": {"message": "System under scheduled maintenance. Try after 30 minutes.", "code": "MAINTENANCE"},
        }
        return {"type": "error", **errors.get(error_type, errors["timeout"])}


# ═══════════════════════════════════════════════════════════════════════════════
# ATTACK INTELLIGENCE SERVICE
# ═══════════════════════════════════════════════════════════════════════════════

class AttackIntelligenceService:
    """Collects and analyzes attacker fingerprints and bot indicators."""

    def __init__(self):
        self._fingerprints: Dict[str, AttackerFingerprint] = {}

    def record_interaction(
        self,
        user_id: str,
        session_id: str,
        screen: str,
        action: str,
        timing_ms: float,
        metadata: Optional[Dict] = None,
    ):
        """Record an interaction for intelligence gathering."""
        key = f"{user_id}:{session_id}"
        if key not in self._fingerprints:
            self._fingerprints[key] = AttackerFingerprint(
                session_id=session_id,
                user_id=user_id,
                fingerprint_id=hashlib.sha256(f"{key}{time.time()}".encode()).hexdigest()[:16],
                first_seen=datetime.now(timezone.utc).isoformat(),
            )

        fp = self._fingerprints[key]
        fp.navigation_sequence.append(screen)
        fp.timing_pattern.append(timing_ms / 1000.0)
        fp.last_seen = datetime.now(timezone.utc).isoformat()
        if metadata:
            fp.api_requests.append({"action": action, "timing_ms": timing_ms, **metadata})

    def detect_bot(self, user_id: str, session_id: str) -> BotIndicators:
        """Analyze session for bot indicators."""
        key = f"{user_id}:{session_id}"
        fp = self._fingerprints.get(key)
        if not fp or len(fp.timing_pattern) < 5:
            return BotIndicators()

        timings = fp.timing_pattern[-20:]
        indicators = BotIndicators()

        # Perfect timing: very low variance in action intervals
        if len(timings) > 3:
            timing_std = float(np.std(timings))
            if timing_std < 0.02:  # < 20ms variation
                indicators.perfect_timing = True

        # No hesitation: all timings very fast
        if all(t < 0.1 for t in timings):
            indicators.no_hesitation = True

        # High frequency: > 10 actions per second
        if len(timings) > 1:
            avg_interval = np.mean(timings)
            if avg_interval < 0.1:
                indicators.high_frequency_requests = True

        # Low entropy: same actions repeated
        if len(fp.navigation_sequence) > 5:
            unique_ratio = len(set(fp.navigation_sequence[-10:])) / 10
            if unique_ratio < 0.3:
                indicators.repeated_identical_actions = True
                indicators.low_entropy_interactions = True

        # Compute confidence
        signals = [
            indicators.perfect_timing, indicators.no_hesitation,
            indicators.high_frequency_requests, indicators.repeated_identical_actions,
            indicators.low_entropy_interactions, indicators.impossible_mouse,
            indicators.instant_form_completion,
        ]
        indicators.confidence = sum(signals) / len(signals)

        fp.bot_indicators = indicators
        return indicators

    def get_fingerprint(self, user_id: str, session_id: str) -> Optional[Dict]:
        key = f"{user_id}:{session_id}"
        fp = self._fingerprints.get(key)
        return fp.to_dict() if fp else None



# ═══════════════════════════════════════════════════════════════════════════════
# SECURITY AUDIT SERVICE (Forensics)
# ═══════════════════════════════════════════════════════════════════════════════

class SecurityAuditService:
    """Complete forensic evidence collection and reporting."""

    def __init__(self):
        self._reports: Dict[str, Dict] = {}

    def generate_forensic_report(
        self,
        ctx: SessionSecurityContext,
        fingerprint: Optional[AttackerFingerprint] = None,
    ) -> Dict:
        """Generate a complete forensic report for a contained session."""
        trust_min = min(ctx.trust_history) if ctx.trust_history else 1.0
        trust_max = max(ctx.trust_history) if ctx.trust_history else 1.0
        trust_trend = "declining" if len(ctx.trust_history) > 2 and ctx.trust_history[-1] < ctx.trust_history[0] else "stable"

        report = {
            "report_id": str(uuid.uuid4()),
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "session_id": ctx.session_id,
            "user_id": ctx.user_id,
            "security_state": ctx.state.value,
            "containment_reason": ctx.containment_reason,
            "timeline": {
                "session_start": ctx.created_at,
                "state_changes": len(ctx.events),
                "last_state_change": ctx.state_changed_at,
                "sandbox_activated": ctx.sandbox_active,
                "sandbox_activated_at": ctx.sandbox_activated_at,
            },
            "trust_evolution": {
                "min_trust": round(trust_min, 4),
                "max_trust": round(trust_max, 4),
                "final_trust": round(ctx.trust_history[-1], 4) if ctx.trust_history else 1.0,
                "trend": trust_trend,
                "samples": len(ctx.trust_history),
            },
            "risk_contributors": [e.description for e in ctx.events[-10:]],
            "verification_attempts": ctx.failed_verifications,
            "events": [
                {"timestamp": e.timestamp, "type": e.event_type, "description": e.description}
                for e in ctx.events[-50:]
            ],
            "bot_analysis": fingerprint.bot_indicators.to_dict() if fingerprint else None,
            "attacker_fingerprint": fingerprint.to_dict() if fingerprint else None,
        }

        self._reports[report["report_id"]] = report
        return report

    def generate_explanation(self, ctx: SessionSecurityContext) -> str:
        """Generate human-readable explanation of containment decision."""
        if not ctx.containment_reason:
            return "Session operating normally. No containment required."

        parts = [f"Security state: {ctx.state.value}."]

        if ctx.sandbox_active:
            parts.append("Secure Transaction Sandbox is ACTIVE — sensitive APIs are isolated.")

        parts.append(f"Reason: {ctx.containment_reason}")

        if ctx.trust_history:
            final_trust = ctx.trust_history[-1]
            parts.append(f"Current trust: {final_trust:.0%}.")

        if ctx.failed_verifications > 0:
            parts.append(f"Failed verification attempts: {ctx.failed_verifications}.")

        return " ".join(parts)


# ═══════════════════════════════════════════════════════════════════════════════
# SECURITY POLICY ENGINE
# ═══════════════════════════════════════════════════════════════════════════════

class SecurityPolicyEngine:
    """
    Central policy enforcement — configurable, no hard-coded thresholds.
    Determines whether API calls should be allowed, sandboxed, or rejected.
    """

    def __init__(self, policy: SecurityPolicy = DEFAULT_POLICY):
        self._policy = policy

    def should_allow_api(self, ctx: SessionSecurityContext, api_path: str) -> Dict:
        """Check whether an API call should be allowed for this session."""
        # Terminated sessions: reject everything
        if ctx.state == SecurityState.TERMINATED:
            return {"allowed": False, "reason": "Session terminated", "action": "reject"}

        # Sandboxed: sandbox payment APIs, allow reads
        if ctx.sandbox_active:
            sensitive_prefixes = ["/api/v1/payment", "/api/v1/transfer", "/api/v1/upi"]
            if any(api_path.startswith(p) for p in sensitive_prefixes):
                return {"allowed": False, "reason": "Sandboxed — payment APIs isolated", "action": "sandbox"}
            return {"allowed": True, "reason": "Read-only allowed in sandbox", "action": "allow"}

        # Containment: only allow verification
        if ctx.state == SecurityState.CONTAINMENT:
            if "/verify" in api_path or "/session" in api_path:
                return {"allowed": True, "reason": "Verification allowed during containment", "action": "allow"}
            return {"allowed": False, "reason": "Containment active", "action": "hold"}

        return {"allowed": True, "reason": "Normal operation", "action": "allow"}

    def evaluate_csrf(self, ctx: SessionSecurityContext, provided_token: str) -> bool:
        """Validate CSRF token."""
        return ctx.csrf_token == provided_token

    def rotate_session_token(self, ctx: SessionSecurityContext) -> str:
        """Rotate CSRF token after verification."""
        ctx.csrf_token = hashlib.sha256(f"{ctx.session_id}{time.time()}".encode()).hexdigest()[:32]
        ctx.session_token_rotated_at = datetime.now(timezone.utc).isoformat()
        return ctx.csrf_token
