async def analyze_cognitive_state(hesitation: float, correction_rate: float, typing_speed: float) -> str:
    """Mock cognitive state analysis."""
    if hesitation > 0.8 or correction_rate > 0.8:
        return "HIGH_COGNITIVE_LOAD_OR_COERCION"
    elif typing_speed < 30:
        return "HESITANT"
    else:
        return "NORMAL"
