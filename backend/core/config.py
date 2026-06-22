# Application configuration loaded from environment variables
from dotenv import load_dotenv
import os

load_dotenv()

# PostgreSQL
POSTGRES_USER = os.getenv("POSTGRES_USER", "postgres")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "postgres")
POSTGRES_DB = os.getenv("POSTGRES_DB", "aegisx")
POSTGRES_HOST = os.getenv("POSTGRES_HOST", "localhost")
POSTGRES_PORT = os.getenv("POSTGRES_PORT", "5432")

DATABASE_URL = (
    f"postgresql://{POSTGRES_USER}:{POSTGRES_PASSWORD}"
    f"@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}"
)

# Redis
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))
REDIS_DB = int(os.getenv("REDIS_DB", "0"))

# Trust Score Weights (standard equal-split with behavioral priority)
TRUST_WEIGHT_BEHAVIORAL = 0.40
TRUST_WEIGHT_DEVICE = 0.20
TRUST_WEIGHT_TRANSACTION = 0.20
TRUST_WEIGHT_COGNITIVE = 0.20

# Decision Thresholds (standard continuous auth)
THRESHOLD_ALLOW = 0.80    # Above → ALLOW
THRESHOLD_STEP_UP = 0.50  # Between 0.50–0.80 → STEP_UP
# Below 0.50 → BLOCK

# CUSUM Parameters (general purpose)
CUSUM_EXPECTED_SIMILARITY = 0.92
CUSUM_ALLOWANCE = 0.03
CUSUM_DRIFT_THRESHOLD = 0.15
CUSUM_INSTANT_JUMP = 0.10

# Cognitive Stability Scores
COGNITIVE_STABILITY = {
    "calm": 1.00,
    "focused": 0.85,
    "distressed": 0.50,
    "panicked": 0.30,
    "coerced": 0.15,
    "robotic": 0.05,
}

# Transaction Scoring
TX_AMOUNT_LOW = 5000
TX_AMOUNT_MEDIUM = 25000
TX_AMOUNT_HIGH = 100000
TX_AMOUNT_EXTREME = 500000
