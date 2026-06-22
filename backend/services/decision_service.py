"""
AEGIS-X Decision Engine
========================
Converts Trust Score T(t) into ALLOW / STEP_UP / BLOCK actions.

Standard thresholds:
    T(t) > 0.80  → ALLOW
    T(t) 0.50–0.80 → STEP_UP
    T(t) < 0.50  → BLOCK

Override rules escalate but never de-escalate.
"""

from typing import Dict, List, Optional
from datetime import datetime, timezone


class DecisionService:

    THRESHOLD_ALLOW = 0.80
    THRESHOLD_BLOCK = 0.50

    def decide(
        self,
        trust_score: float,
        trust_velocity: float = 0.0,
        drift_detected: bool = False,
        drift_severity: str = "none",
        cognitive_state: str = "calm",
        transaction_amount: float = 0.0,
    ) -> Dict:
        escalation_factors = []
        base_action = self._base_decision(trust_score)

        # Rule 1: Cognitive coercion/robotic → immediate BLOCK
        if cognitive_state in ("coerced", "robotic"):
            base_action = "BLOCK"
            escalation_factors.append(
                f"Cognitive state '{cognitive_state}' — immediate block"
            )

        # Rule 2: Rapid trust decline while in ALLOW zone → escalate to STEP_UP
        if trust_velocity < -0.025 and base_action == "ALLOW":
            base_action = "STEP_UP"
            escalation_factors.append(
                f"Rapid trust decline (velocity={trust_velocity:.4f})"
            )

        # Rule 3: Drift + severity medium+ → escalate one level
        if drift_detected and drift_severity in ("medium", "high", "critical"):
            if base_action == "ALLOW":
                base_action = "STEP_UP"
                escalation_factors.append(f"Behavioral drift ({drift_severity})")
            elif drift_severity == "critical" and base_action == "STEP_UP":
                base_action = "BLOCK"
                escalation_factors.append("Critical drift → BLOCK")

        # Rule 4: High-value + panicked → BLOCK
        if transaction_amount > 50000 and cognitive_state == "panicked":
            base_action = "BLOCK"
            escalation_factors.append(
                f"₹{transaction_amount:,.0f} + panicked state"
            )

        # Rule 5: High-value + distressed → STEP_UP minimum
        if transaction_amount > 25000 and cognitive_state == "distressed":
            if base_action == "ALLOW":
                base_action = "STEP_UP"
                escalation_factors.append(
                    f"₹{transaction_amount:,.0f} + cognitive distress"
                )

        # Rule 6: Large transaction in allow zone but trust not perfectly high
        # This catches: normal behavior + Rs50K to unknown = transaction pulls trust down
        if transaction_amount > 25000 and base_action == "ALLOW" and trust_score < 0.93:
            base_action = "STEP_UP"
            escalation_factors.append(
                f"₹{transaction_amount:,.0f} requires verification (trust={trust_score:.2f})"
            )

        confidence = self._compute_confidence(trust_score, base_action)
        explanation = self._generate_explanation(
            trust_score, trust_velocity, drift_detected, drift_severity,
            cognitive_state, transaction_amount, base_action
        )
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
        if trust_score > self.THRESHOLD_ALLOW:
            return "ALLOW"
        elif trust_score > self.THRESHOLD_BLOCK:
            return "STEP_UP"
        return "BLOCK"

    def _compute_confidence(self, trust_score: float, action: str) -> float:
        if action == "ALLOW":
            return min(1.0, (trust_score - self.THRESHOLD_ALLOW) / 0.20)
        elif action == "BLOCK":
            return min(1.0, (self.THRESHOLD_BLOCK - trust_score) / 0.25)
        else:
            dist_allow = self.THRESHOLD_ALLOW - trust_score
            dist_block = trust_score - self.THRESHOLD_BLOCK
            return min(1.0, min(dist_allow, dist_block) / 0.15)

    def _build_reasons(self, trust_score, velocity, drift_detected, cognitive_state, escalations) -> List[str]:
        reasons = []
        if trust_score < 0.50:
            reasons.append("Trust below critical threshold (0.50)")
        elif trust_score < 0.80:
            reasons.append("Trust in elevated-risk zone (0.50–0.80)")
        if velocity < -0.02:
            reasons.append("Trust declining rapidly")
        if drift_detected:
            reasons.append("Behavioral drift detected (CUSUM)")
        if cognitive_state in ("panicked", "coerced"):
            reasons.append(f"Cognitive state: {cognitive_state}")
        if cognitive_state == "robotic":
            reasons.append("Automated/scripted behavior")
        reasons.extend(escalations)
        if not reasons:
            reasons.append("All signals normal")
        return reasons

    def _recommend_step_up(self, cognitive_state: str, trust_score: float, amount: float) -> List[str]:
        methods = []
        if cognitive_state in ("distressed", "panicked"):
            methods.append("biometric_face_verification")
            methods.append("cool_down_timer_30s")
        elif cognitive_state == "robotic":
            methods.append("biometric_face_verification")
            methods.append("device_proximity_check")
        else:
            methods.append("otp_verification")
        if amount > 50000:
            methods.append("transaction_pin_confirmation")
        if trust_score < 0.65:
            methods.append("security_question")
        return methods

    def _generate_explanation(self, trust_score, velocity, drift_detected, drift_severity, cognitive_state, amount, action) -> str:
        lines = [f"Decision: {action} | Trust Score: {trust_score:.2f}", ""]

        if action == "ALLOW":
            lines.append("Assessment: Behavior consistent with verified user.")
        elif action == "STEP_UP":
            lines.append("Assessment: Elevated risk — additional verification required.")
        else:
            lines.append("Assessment: CRITICAL — Behavioral identity mismatch or coercion detected.")

        lines.append("")
        lines.append("Contributing factors:")

        if trust_score < 0.65:
            lines.append(f"  • Trust significantly below baseline ({trust_score:.0%})")
        elif trust_score < 0.80:
            lines.append(f"  • Trust moderately below threshold ({trust_score:.0%})")

        if drift_detected:
            lines.append(f"  • Behavioral drift detected (severity: {drift_severity})")
        if velocity < -0.02:
            lines.append(f"  • Trust declining (velocity: {velocity:.4f}/step)")

        state_explanations = {
            "panicked": "  • Panic indicators (elevated hesitation, high correction rate)",
            "coerced": "  • ALERT: Signature consistent with external coercion",
            "robotic": "  • ALERT: Automated/scripted input patterns",
            "distressed": "  • Elevated cognitive uncertainty detected",
        }
        if cognitive_state in state_explanations:
            lines.append(state_explanations[cognitive_state])

        if amount > 100000:
            lines.append(f"  • High-value transaction (₹{amount:,.0f})")

        return "\n".join(lines)
