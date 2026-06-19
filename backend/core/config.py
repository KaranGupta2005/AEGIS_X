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

# Redis (session state, trust score caching, real-time lookups)
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))
REDIS_DB = int(os.getenv("REDIS_DB", "0"))

# Trust Score Weights (from proposal: Section 6.a)
TRUST_WEIGHT_BEHAVIORAL = 0.40
TRUST_WEIGHT_DEVICE = 0.20
TRUST_WEIGHT_TRANSACTION = 0.20
TRUST_WEIGHT_COGNITIVE = 0.20

# Decision Thresholds (from proposal: Section 6.c)
THRESHOLD_ALLOW = 0.85
THRESHOLD_STEP_UP = 0.60  # Between 0.60 and 0.85 = step-up auth
# Below 0.60 = BLOCK
