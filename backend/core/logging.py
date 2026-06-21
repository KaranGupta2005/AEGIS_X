import logging
import json
import sys
from datetime import datetime, timezone
from typing import Any


class StructuredFormatter(logging.Formatter):

    def format(self, record: logging.LogRecord) -> str:
        log_entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }

        if record.exc_info:
            log_entry["exception"] = self.formatException(record.exc_info)

        if hasattr(record, "user_id"):
            log_entry["user_id"] = record.user_id
        if hasattr(record, "session_id"):
            log_entry["session_id"] = record.session_id
        if hasattr(record, "latency_ms"):
            log_entry["latency_ms"] = record.latency_ms
        if hasattr(record, "decision"):
            log_entry["decision"] = record.decision
        if hasattr(record, "trust_score"):
            log_entry["trust_score"] = record.trust_score

        return json.dumps(log_entry)


def setup_logging(level: str = "INFO") -> logging.Logger:
    logger = logging.getLogger("aegisx")
    logger.setLevel(getattr(logging, level.upper(), logging.INFO))

    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(StructuredFormatter())
        logger.addHandler(handler)

    logger.propagate = False
    return logger


class AuditEventLogger:

    def __init__(self):
        self._logger = setup_logging()

    def log_session_start(self, user_id: str, session_id: str, has_baseline: bool):
        self._logger.info(
            "Session started",
            extra={"user_id": user_id, "session_id": session_id},
        )

    def log_session_end(self, user_id: str, session_id: str, event_count: int):
        self._logger.info(
            f"Session ended after {event_count} events",
            extra={"user_id": user_id, "session_id": session_id},
        )

    def log_trust_decision(self, user_id: str, decision: str, trust_score: float, latency_ms: float):
        self._logger.info(
            f"Decision: {decision}",
            extra={
                "user_id": user_id,
                "decision": decision,
                "trust_score": trust_score,
                "latency_ms": latency_ms,
            },
        )

    def log_alert(self, user_id: str, severity: str, message: str):
        log_fn = self._logger.warning if severity in ("CRITICAL", "HIGH") else self._logger.info
        log_fn(
            f"Alert [{severity}]: {message}",
            extra={"user_id": user_id},
        )

    def log_error(self, message: str, error: Exception = None):
        self._logger.error(message, exc_info=error)


logger = setup_logging()
audit_logger = AuditEventLogger()
