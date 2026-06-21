async def calculate_drift(hesitation: float, correction_rate: float, typing_speed: float, swipe_behavior: float) -> float:
    """Mock drift calculation based on telemetry."""
    # Dummy logic to calculate drift (lower is better, meaning less deviation)
    drift = (hesitation * 0.3) + (correction_rate * 0.4) + (abs(100 - typing_speed) * 0.1) + (swipe_behavior * 0.2)
    return min(1.0, drift)
