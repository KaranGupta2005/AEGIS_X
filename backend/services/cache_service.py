import json
import time
import numpy as np
from typing import Dict, Optional, Any, List
from dataclasses import dataclass, field

from backend.core.config import REDIS_HOST, REDIS_PORT, REDIS_DB

try:
    import redis
    _REDIS_AVAILABLE = True
except ImportError:
    _REDIS_AVAILABLE = False


@dataclass
class CacheEntry:
    value: Any
    expires_at: float
    created_at: float = field(default_factory=time.time)


class CacheService:

    SESSION_TTL = 3600
    TRUST_TTL = 10
    BASELINE_TTL = 86400
    ALERT_TTL = 7200
    PIPELINE_STATE_TTL = 1800  # Pipeline state persists for 30 min (session TTL)

    def __init__(self):
        self._redis: Optional[Any] = None
        self._fallback: Dict[str, CacheEntry] = {}
        self._connected = False
        self._connect()

    def _connect(self):
        if not _REDIS_AVAILABLE:
            return
        try:
            self._redis = redis.Redis(
                host=REDIS_HOST,
                port=REDIS_PORT,
                db=REDIS_DB,
                decode_responses=True,
                socket_connect_timeout=2,
                socket_timeout=1,
                retry_on_timeout=True,
            )
            self._redis.ping()
            self._connected = True
        except Exception:
            self._redis = None
            self._connected = False

    @property
    def is_connected(self) -> bool:
        return self._connected

    # ═══════════════════════════════════════════════════════════════════════
    # SESSION STATE (existing)
    # ═══════════════════════════════════════════════════════════════════════

    def set_session_state(self, user_id: str, state: Dict) -> bool:
        key = f"aegisx:session:{user_id}"
        return self._set(key, state, self.SESSION_TTL)

    def get_session_state(self, user_id: str) -> Optional[Dict]:
        key = f"aegisx:session:{user_id}"
        return self._get(key)

    def delete_session_state(self, user_id: str) -> bool:
        key = f"aegisx:session:{user_id}"
        return self._delete(key)

    def set_trust_score(self, user_id: str, trust_data: Dict) -> bool:
        key = f"aegisx:trust:{user_id}"
        return self._set(key, trust_data, self.TRUST_TTL)

    def get_trust_score(self, user_id: str) -> Optional[Dict]:
        key = f"aegisx:trust:{user_id}"
        return self._get(key)

    def set_baseline(self, user_id: str, baseline_meta: Dict) -> bool:
        key = f"aegisx:baseline:{user_id}"
        return self._set(key, baseline_meta, self.BASELINE_TTL)

    def get_baseline(self, user_id: str) -> Optional[Dict]:
        key = f"aegisx:baseline:{user_id}"
        return self._get(key)

    def push_alert(self, user_id: str, alert: Dict) -> bool:
        key = f"aegisx:alerts:{user_id}"
        if self._connected and self._redis:
            try:
                self._redis.rpush(key, json.dumps(alert))
                self._redis.expire(key, self.ALERT_TTL)
                return True
            except Exception:
                pass
        alerts = self._get(key) or []
        alerts.append(alert)
        return self._set(key, alerts, self.ALERT_TTL)

    def get_alerts(self, user_id: str, limit: int = 50) -> List[Dict]:
        key = f"aegisx:alerts:{user_id}"
        if self._connected and self._redis:
            try:
                raw = self._redis.lrange(key, -limit, -1)
                return [json.loads(r) for r in raw]
            except Exception:
                pass
        data = self._get(key)
        if isinstance(data, list):
            return data[-limit:]
        return []

    def increment_event_count(self, session_id: str) -> int:
        key = f"aegisx:events:{session_id}"
        if self._connected and self._redis:
            try:
                val = self._redis.incr(key)
                self._redis.expire(key, self.SESSION_TTL)
                return val
            except Exception:
                pass
        entry = self._fallback.get(key)
        count = 1
        if entry and entry.expires_at > time.time():
            count = entry.value + 1
        self._fallback[key] = CacheEntry(value=count, expires_at=time.time() + self.SESSION_TTL)
        return count

    def get_active_sessions(self) -> List[str]:
        if self._connected and self._redis:
            try:
                keys = self._redis.keys("aegisx:session:*")
                return [k.replace("aegisx:session:", "") for k in keys]
            except Exception:
                pass
        now = time.time()
        return [
            k.replace("aegisx:session:", "")
            for k, v in self._fallback.items()
            if k.startswith("aegisx:session:") and v.expires_at > now
        ]

    def flush_user(self, user_id: str):
        patterns = [
            f"aegisx:session:{user_id}",
            f"aegisx:trust:{user_id}",
            f"aegisx:alerts:{user_id}",
            f"aegisx:pipeline:{user_id}",
        ]
        for key in patterns:
            self._delete(key)

    # ═══════════════════════════════════════════════════════════════════════
    # FIX #9: PIPELINE STATE PERSISTENCE
    # Serialize full pipeline state (CUSUM, similarity history, trust history,
    # event count) to Redis so sessions survive server restarts.
    # ═══════════════════════════════════════════════════════════════════════

    def save_pipeline_state(self, user_id: str, state: Dict) -> bool:
        """
        Persist full pipeline context state to Redis.

        State includes:
        - cusum: {cusum_pos, cusum_neg, previous_score, step_count, drift_detected, max_cusum}
        - similarity_history: list of recent similarity scores
        - trust_history: list of recent trust scores
        - event_count: total events processed
        - session_id: associated session identifier
        - cognitive_trajectory: list of cognitive states
        - latest_decision: last action taken

        Called periodically (every 5 events) to minimize Redis overhead
        while ensuring minimal state loss on crash.
        """
        key = f"aegisx:pipeline:{user_id}"
        return self._set(key, state, self.PIPELINE_STATE_TTL)

    def load_pipeline_state(self, user_id: str) -> Optional[Dict]:
        """
        Load persisted pipeline state from Redis.

        Returns None if no state exists (new user or expired session).
        The caller must reconstruct PipelineContext from this state.
        """
        key = f"aegisx:pipeline:{user_id}"
        return self._get(key)

    def delete_pipeline_state(self, user_id: str) -> bool:
        """Remove pipeline state (session ended cleanly)."""
        key = f"aegisx:pipeline:{user_id}"
        return self._delete(key)

    # ═══════════════════════════════════════════════════════════════════════
    # INTERNAL HELPERS
    # ═══════════════════════════════════════════════════════════════════════

    def _set(self, key: str, value: Any, ttl: int) -> bool:
        if self._connected and self._redis:
            try:
                self._redis.setex(key, ttl, json.dumps(value))
                return True
            except Exception:
                pass
        self._fallback[key] = CacheEntry(value=value, expires_at=time.time() + ttl)
        return True

    def _get(self, key: str) -> Optional[Any]:
        if self._connected and self._redis:
            try:
                raw = self._redis.get(key)
                if raw:
                    return json.loads(raw)
                return None
            except Exception:
                pass
        entry = self._fallback.get(key)
        if entry and entry.expires_at > time.time():
            return entry.value
        if entry:
            del self._fallback[key]
        return None

    def _delete(self, key: str) -> bool:
        if self._connected and self._redis:
            try:
                self._redis.delete(key)
                return True
            except Exception:
                pass
        self._fallback.pop(key, None)
        return True

    def health(self) -> Dict:
        return {
            "redis_connected": self._connected,
            "fallback_entries": len(self._fallback),
            "host": REDIS_HOST,
            "port": REDIS_PORT,
        }
