from typing import List

async def calculate_similarity(embedding: List[float]) -> float:
    """Mock similarity calculation."""
    # Dummy logic for similarity score based on embedding length and values
    return min(1.0, max(0.0, sum(embedding) / (len(embedding) or 1)))
