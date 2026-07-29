"""
AEGIS-X Trust Fusion Engine
=============================
Context-aware multi-evidence trust computation.

Trust is a continuously evolving probability, not a static score.
Every decision is based on evidence from ALL subsystems.

Components:
- TrustFusionEngine: Central orchestrator
- EvidenceCollector: Gathers evidence from all providers
- EvidenceNormalizer: Normalizes evidence to [0,1] with decay
- RiskFusionModel: Multi-signal weighted Bayesian fusion
- TrustCalculator: Final trust probability computation
- DecisionEngine: Configurable policy-based decisions
- PolicyEngine: Bank-specific threshold configuration
- TrustHistoryService: Complete timeline persistence
- ExplainabilityEngine: Human-readable decision explanations
"""
