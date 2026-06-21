
import json
import logging
from typing import List
# pyrefly: ignore [missing-import]
import redis.asyncio as redis
# pyrefly: ignore [missing-import]
from fastapi import HTTPException

logger = logging.getLogger(__name__)

# Initialize async Redis client (would be configured via env vars in prod)
# decode_responses=True ensures we get string responses instead of bytes
redis_client = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)

class CacheMissError(Exception):
    """Exception raised when a requested session embedding is not found in cache."""
    pass

async def get_baseline_embedding(session_id: str) -> List[float]:
    """
    Retrieves the baseline embedding for a given session.
    Raises CacheMissError if the session is not found, optimizing for fast fail.
    """
    try:
        data = await redis_client.get(f"session:{session_id}:embedding")
        if data is None:
            logger.warning(f"Cache miss for session_id: {session_id}")
            raise CacheMissError(f"Baseline embedding not found for session {session_id}")
        return json.loads(data)
    except redis.RedisError as e:
        logger.error(f"Redis connection error during get: {e}")
        # We might want to fallback to a DB here, but for low-latency we fail fast
        raise HTTPException(status_code=503, detail="Cache service unavailable")

async def set_baseline_embedding(session_id: str, embedding: List[float], expire_seconds: int = 3600):
    """
    Stores a new baseline embedding in the cache with a TTL.
    """
    try:
        await redis_client.setex(
            f"session:{session_id}:embedding",
            expire_seconds,
            json.dumps(embedding)
        )
    except redis.RedisError as e:
        logger.error(f"Redis connection error during set: {e}")
        raise HTTPException(status_code=503, detail="Cache service unavailable")

async def update_baseline_embedding(session_id: str, current_embedding: List[float], alpha: float = 0.05, expire_seconds: int = 3600):
    """
    Dynamically updates the stored baseline embedding using Exponential Moving Average (EMA).
    This allows the system to slowly adapt to genuine changes in user behavior (e.g. morning vs evening typing).
    
    alpha: Learning rate (0-1). 
           Lower alpha (e.g., 0.05) means high inertia (slow adaptation, highly secure).
           Higher alpha means fast adaptation.
    """
    try:
        try:
            baseline = await get_baseline_embedding(session_id)
        except CacheMissError:
            # If no baseline exists, we seed it with the current highly-trusted embedding
            await set_baseline_embedding(session_id, current_embedding, expire_seconds)
            return

        # Ensure dimensions match before zip
        if len(baseline) != len(current_embedding):
            logger.error(f"Dimension mismatch for session {session_id}. Baseline: {len(baseline)}, Current: {len(current_embedding)}")
            return

        # Calculate new baseline using EMA for continuous learning
        new_baseline = [
            (alpha * curr) + ((1.0 - alpha) * base)
            for curr, base in zip(current_embedding, baseline)
        ]

        # Fire and forget update
        await set_baseline_embedding(session_id, new_baseline, expire_seconds)

    except Exception as e:
        logger.error(f"Failed to update baseline embedding dynamically: {e}")
        # Non-critical failure: we don't raise an HTTP error here to avoid blocking the main auth flow
