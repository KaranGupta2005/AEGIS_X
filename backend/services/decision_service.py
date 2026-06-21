"""
AEGIS-X Phase 5E/5F: Decision Engine + Explainability Layer
=============================================================
The final decision point: converts Trust Score T(t) into a concrete action
(ALLOW / STEP_UP / BLOCK) and generates human-readable compliance explanations.

Pipeline position:
    Trust Score T(t) + Drift Status + Velocity → **Decision Engine** → Action + Explanation

Decision Thresholds (from proposal Section 6.c):
    T(t) > 0.85  → [ALLOW]   Transaction proceeds without interruption
    T(t) 0.60-0.85 → [STEP-UP]  Biometric verification / OTP required
    T(t) < 0.60  → [BLOCK]   Transaction blocked, session flagged for review

STEP-UP explained:
    This is what makes AEGIS-X bank-friendly. Instead of hard blocking
    (which creates customer complaints and false positive nightmares),
    we ask for additional verification:
    - Biometric face scan
    - Additional OTP to registered number
    - Security question
    - Voice verification

    This reduces false positives dramatically while maintaining security.
    Banks LOVE this — it's the difference between "your transaction was blocked"
    and "please verify your identity to continue."

Explainability Layer (Langfun placeholder):
    For compliance audits, banks need to know WHY a decision was made.
    Instead of showing "Trust = 0.58" to a compliance officer, we generate:
    "Trust score declined due to elevated hesitation patterns, significant
     transaction deviation, and 38% behavioral similarity decrease.
     Assessment: possible social engineering attack."

    In production, this would use Langfun for rich natural language generation.
    For hackathon MVP, we use rule-based template explanations.

Reference: Section 6.c - "Adaptive Output: [ALLOW/STEP-UP/BLOCK] alongside compliance heatmap"
"""

from typing import Dict, List, Optional
from datetime import datetime, timezone


class DecisionService:
    """
    Makes the final ALLOW/STEP_UP/BLOCK decision and explains it.

    The Decision Engine goes beyond simple threshold checking:
    - Trust velocity can escalate ALLOW → STEP_UP (trust falling fast)
    - Drift detection can escalate ALLOW → STEP_UP (accumulated concern)
    - Cognitive coercion state can override to BLOCK (regardless of trust score)
    - Transaction amount can force STEP_UP for high-value transfers

    This is the "judge's verdict" — everything before this was testimony.
    """

    THRESHOLD_ALLOW = 0.85
    THRESHOLD_BLOCK = 0.60

    def decide(
        self,
        trust_score: float,
        trust_velocity: float = 0.0,
        drift_detected: bool = False,
        drift_severity: str = "none",
        cognitive_state: str = "calm",
        transaction_amount: float = 0.0,
    ) -> Dict:
        """
        Make the final session/transaction decision.

        Args:
            trust_score: Current T(t) from TrustService [0, 1]
            trust_velocity: dT/dt from trust history (negative = declining)
            drift_detected: Whether CUSUM has triggered
            drift_severity: "none" | "low" | "medium" | "high" | "critical"
            cognitive_state: Current predicted state from CognitiveService
            transaction_amount: Amount of pending transaction (₹)

        Returns:
            Decision dictionary with:
            - action: "ALLOW" | "STEP_UP" | "BLOCK"
            - confidence: how certain the decision is [0, 1]
            - reasons: list of contributing factors
            - explanation: human-readable compliance summary
            - escalation_factors: what pushed the decision up/down
            - step_up_methods: recommended verification methods (if STEP_UP)
            - timestamp: when decision was made
        """
        escalation_factors = []
        base_action = self._base_decision(trust_score)

        # ─── OVERRIDE RULES (can escalate but never de-escalate) ──────────

        # Rule 1: Cognitive coercion → immediate BLOCK
        if cognitive_state in ("coerced", "robotic"):
            base_action = "BLOCK"
            escalation_factors.append(
                f"Cognitive state '{cognitive_state}' triggered immediate block"
            )

        # Rule 2: Rapid trust decline → escalate one level
        if trust_velocity < -0.03 and base_action == "ALLOW":
            base_action = "STEP_UP"
            escalation_factors.append(
                f"Rapid trust decline (velocity={trust_velocity:.4f})"
            )

        # Rule 3: Drift detected with medium+ severity → escalate
        if drift_detected and drift_severity in ("medium", "high", "critical"):
            if base_action == "ALLOW":
                base_action = "STEP_UP"
                escalation_factors.append(
                    f"CUSUM drift detected (severity={drift_severity})"
                )
            elif drift_severity == "critical" and base_action == "STEP_UP":
                base_action = "BLOCK"
                escalation_factors.append(
                    f"Critical drift severity escalated to BLOCK"
                )

        # Rule 4: High-value transaction + panicked state → BLOCK
        if transaction_amount > 100000 and cognitive_state == "panicked":
            base_action = "BLOCK"
            escalation_factors.append(
                f"High-value transaction (₹{transaction_amount:,.0f}) "
                f"combined with panicked cognitive state"
            )

        # Rule 5: High-value transaction in STEP_UP zone → keep STEP_UP (enforce verification)
        if transaction_amount > 50000 and base_action == "ALLOW" and trust_score < 0.92:
            base_action = "STEP_UP"
            escalation_factors.append(
                f"High-value transaction (₹{transaction_amount:,.0f}) "
                f"requires verification at current trust level"
            )

        # ─── CONFIDENCE COMPUTATION ───────────────────────────────────────
        confidence = self._compute_confidence(trust_score, base_action)

        # ─── GENERATE EXPLANATION ─────────────────────────────────────────
        explanation = self._generate_explanation(
            trust_score, trust_velocity, drift_detected, drift_severity,
            cognitive_state, transaction_amount, base_action
        )

        # ─── STEP-UP METHODS ──────────────────────────────────────────────
        step_up_methods = self._recommend_step_up(
            cognitive_state, trust_score, transaction_amount
        ) if base_action == "STEP_UP" else []

        return {
            "action": base_action,
            "confidence": round(confidence, 4),
            "trust_score": round(trust_score, 4),
            "reasons": self._build_reasons(
                trust_score, trust_velocity, drift_detected,
                cognitive_state, escalation_factors
            ),
            "explanation": explanation,
            "escalation_factors": escalation_factors,
            "step_up_methods": step_up_methods,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    def _base_decision(self, trust_score: float) -> str:
        """Simple threshold-based decision (before overrides)."""
        if trust_score > self.THRESHOLD_ALLOW:
            return "ALLOW"
        elif trust_score > self.THRESHOLD_BLOCK:
            return "STEP_UP"
        return "BLOCK"

    def _compute_confidence(self, trust_score: float, action: str) -> float:
        """
        How confident are we in this decision?
        High confidence when trust_score is far from thresholds.
        """
        if action == "ALLOW":
            # Confidence = how far above 0.85
            return min(1.0, (trust_score - self.THRESHOLD_ALLOW) / 0.15)
        elif action == "BLOCK":
            # Confidence = how far below 0.60
            return min(1.0, (self.THRESHOLD_BLOCK - trust_score) / 0.30)
        else:
            # STEP_UP: confidence based on distance from nearest boundary
            dist_allow = self.THRESHOLD_ALLOW - trust_score
            dist_block = trust_score - self.THRESHOLD_BLOCK
            return min(1.0, min(dist_allow, dist_block) / 0.12)

    def _build_reasons(
        self, trust_score, velocity, drift_detected, cognitive_state, escalations
    ) -> List[str]:
        """Build list of reasons for the decision."""
        reasons = []

        if trust_score < 0.60:
            reasons.append("Trust score below critical threshold (0.60)")
        elif trust_score < 0.85:
            reasons.append("Trust score in elevated-risk zone (0.60-0.85)")

        if velocity < -0.02:
            reasons.append("Trust score declining rapidly")

        if drift_detected:
            reasons.append("Behavioral drift detected by CUSUM")

        if cognitive_state in ("panicked", "coerced"):
            reasons.append(f"Cognitive state: {cognitive_state}")

        if cognitive_state == "robotic":
            reasons.append("Automated/scripted behavior detected")

        reasons.extend(escalations)

        if not reasons:
            reasons.append("All signals within normal parameters")

        return reasons

    def _recommend_step_up(
        self, cognitive_state: str, trust_score: float, amount: float
    ) -> List[str]:
        """
        Recommend appropriate step-up verification methods.
        The method depends on what triggered the STEP_UP.
        """
        methods = []

        if cognitive_state in ("distressed", "panicked"):
            # User may be under pressure — use methods that give them "escape"
            methods.append("biometric_face_verification")
            methods.append("cool_down_timer_30s")  # Gives victim time to think
        elif cognitive_state == "robotic":
            methods.append("biometric_face_verification")
            methods.append("device_proximity_check")
        else:
            methods.append("otp_verification")

        if amount > 50000:
            methods.append("transaction_pin_confirmation")

        if trust_score < 0.70:
            methods.append("security_question")

        return methods

    def _generate_explanation(
        self,
        trust_score: float,
        velocity: float,
        drift_detected: bool,
        drift_severity: str,
        cognitive_state: str,
        amount: float,
        action: str,
    ) -> str:
        """
        Generate human-readable explanation for compliance audit.

        In production, this would use Langfun for richer natural language.
        For hackathon MVP, we use structured templates that are still
        far more useful than raw numbers for compliance officers.
        """
        lines = []

        # Header
        lines.append(f"Decision: {action} | Trust Score: {trust_score:.2f}")
        lines.append("")

        # Primary assessment
        if action == "ALLOW":
            lines.append("Assessment: Session behavior consistent with verified user identity.")
        elif action == "STEP_UP":
            lines.append("Assessment: Elevated risk indicators detected. Additional verification required.")
        else:
            lines.append("Assessment: CRITICAL — Behavioral identity mismatch or coercion indicators detected.")

        lines.append("")
        lines.append("Contributing factors:")

        # Behavioral similarity
        sim_component = trust_score  # Approximation for explanation
        if sim_component < 0.70:
            lines.append(f"  • Behavioral similarity significantly below baseline ({sim_component:.0%})")
        elif sim_component < 0.85:
            lines.append(f"  • Moderate behavioral deviation from baseline ({sim_component:.0%})")

        # Drift
        if drift_detected:
            lines.append(f"  • Cumulative behavioral drift detected (severity: {drift_severity})")

        # Velocity
        if velocity < -0.02:
            lines.append(f"  • Trust score declining rapidly (velocity: {velocity:.4f}/step)")

        # Cognitive state
        if cognitive_state == "panicked":
            lines.append("  • User exhibiting panic indicators (elevated hesitation, high correction rate)")
        elif cognitive_state == "coerced":
            lines.append("  • ALERT: Behavioral signature consistent with external coercion")
        elif cognitive_state == "robotic":
            lines.append("  • ALERT: Input patterns suggest automated/scripted interaction")
        elif cognitive_state == "distressed":
            lines.append("  • Elevated cognitive uncertainty detected")

        # Transaction
        if amount > 100000:
            lines.append(f"  • High-value transaction (₹{amount:,.0f}) requires additional scrutiny")

        return "\n".join(lines)
