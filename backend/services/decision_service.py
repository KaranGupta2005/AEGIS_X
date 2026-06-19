# Decision Service: Adaptive output layer
# Calculates final Trust Score T(t) and delivers instant action:
#   [ALLOW]   T > 0.85  - Transaction proceeds
#   [STEP-UP] 0.60-0.85 - Additional authentication required
#   [BLOCK]   T < 0.60  - Transaction blocked, session flagged
# Also generates compliance heatmap for audit trail
# Reference: Section 6.c - "Adaptive Output"
