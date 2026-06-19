# AEGIS-X

**Continuous Mathematical Trust Infrastructure & Behavioral Identity Verification for Next-Gen Banking**

## Architecture

```
React Native SDK (TypeScript)
        │ (WebSocket, every 2s)
        ▼
  FastAPI Backend
        │
        ├── Behavioral Embedding Engine (MiniLM-L6-v2 → 384-dim)
        ├── Drift Detection (CUSUM + Isolation Forest)
        ├── Cognitive State Machine (Random Forest, 100 estimators)
        └── Trust Score Engine T(t)
        │
        ├── PostgreSQL (persistent storage)
        └── Redis (session state, real-time caching)
        │
        ▼
 Streamlit Dashboard (compliance heatmaps)
```

## Trust Score Formula

```
T(t) = 0.40 × behavioral_similarity
     + 0.20 × device_trust
     + 0.20 × transaction_normality
     + 0.20 × cognitive_stability
```

**Temporal Dynamics:** Trust Velocity (dT/dt), Acceleration (d²T/dt²), Entropy H(t), Drift D(t)

**Decision Thresholds:**
- `[ALLOW]`   T > 0.85
- `[STEP-UP]` 0.60 – 0.85
- `[BLOCK]`   T < 0.60

## 4-Stage Implementation Pipeline

1. **Behavioral Embedding:** SDK streams events → 16-dim features → text → MiniLM-L6-v2 → 384-dim vector
2. **Drift Detection:** CUSUM (gradual drift / sudden jumps) + Isolation Forest (anomaly severity)
3. **Cognitive State Machine:** RF classifier → calm → focused → distressed → panicked → coerced | robotic
4. **Adaptive Output:** Trust Score T(t) + action + compliance heatmap

## Project Structure

```
AEGIS-X/
├── backend/
│   ├── main.py
│   ├── api/              (REST endpoints)
│   ├── websocket/        (real-time event ingestion)
│   ├── services/
│   │   ├── embedding_service.py    (MiniLM-L6-v2, 384-dim)
│   │   ├── drift_service.py        (CUSUM + Isolation Forest)
│   │   ├── cognitive_service.py    (Random Forest state machine)
│   │   ├── trust_service.py        (T(t) computation)
│   │   └── decision_service.py     (ALLOW/STEP-UP/BLOCK)
│   ├── models/           (SQLAlchemy ORM)
│   ├── schemas/          (Pydantic validation)
│   └── core/             (config, constants)
├── dashboard/            (Streamlit real-time monitoring)
├── sdk/                  (React Native SDK integration)
├── data/                 (raw, processed, synthetic)
├── models/               (ML model artifacts)
│   ├── baseline/         (user behavioral baselines)
│   ├── drift/            (CUSUM parameters)
│   ├── cognitive/        (Random Forest .pkl)
│   ├── trust/            (trust model weights)
│   └── classifiers/      (Isolation Forest, RF)
├── embeddings/           (stored 384-dim vectors)
├── notebooks/            (experimentation)
├── tests/
├── docs/
├── scripts/
├── configs/
└── requirements/
```

## Tech Stack

- **Mobile SDK:** React Native (TypeScript)
- **AI Models:** sentence-transformers/all-MiniLM-L6-v2, CUSUM, Isolation Forest, Random Forest (scikit-learn)
- **Backend:** Python, FastAPI, WebSocket
- **Databases:** PostgreSQL (persistent), Redis (session/cache)
- **Dashboard:** Streamlit + Plotly

## Quick Start

```bash
# Create and activate virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
source venv/bin/activate     # Mac/Linux

# Install dependencies
pip install -r requirements/base.txt

# Run the server
uvicorn backend.main:app --reload

# Expected: {"status":"running","project":"AEGIS-X"}
```

## Cognitive States

| State | Description |
|-------|-------------|
| calm | Normal baseline behavior |
| focused | Active engagement, no anomalies |
| distressed | Elevated hesitation, irregular rhythm |
| panicked | Extreme motor control deviation |
| coerced | Behavioral signature of external manipulation |
| robotic | Near-zero variance, automated script pattern |

## Demo Scenarios

| Scenario | Trust Pattern | Key Signals |
|----------|--------------|-------------|
| Normal | T ∈ [0.78, 0.98] | Stable fingerprint, low drift |
| Account Takeover | T: 0.88 → 0.20 | Progressive drift over 20 steps |
| Social Engineering | T ∈ [0.35, 0.75] oscillating | Hesitation spikes, panic state |
| Remote Malware | T ∈ [0.25, 0.55] | Robot-precise, no corrections |
