# AEGIS-X

**Continuous Mathematical Trust Infrastructure & Behavioral Identity Verification for Next-Gen Banking**

> DFS & IBA Cyber Security PSBs Hackathon 2026 — Central Bank of India × MNNIT Allahabad

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│  Banking App (CBI Mobile App)                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  AEGIS-X SDK (TypeScript)                                      │ │
│  │  ├── Typing Collector → speed, correction, hesitation          │ │
│  │  ├── Touch Collector  → tap interval, duration, pressure       │ │
│  │  ├── Navigation Collector → screen flow, volatility            │ │
│  │  ├── Feature Extractor → 16-dim behavioral vector              │ │
│  │  ├── Event Buffer (IndexedDB) → offline resilience             │ │
│  │  └── WebSocket Transport → batched every 2s                    │ │
│  └────────────────────────────────────────────────────────────────┘ │
└───────────────────────────────┬─────────────────────────────────────┘
                                │ WebSocket (every 2 seconds)
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│  FastAPI Backend (Python 3.11)                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  Trust Pipeline (< 100ms per event)                            │ │
│  │  [1] Feature Engineer → 16-dim validated vector                │ │
│  │  [2] Behavioral Serializer → natural language description      │ │
│  │  [3] MiniLM-L6-v2 Embedding → 384-dim fingerprint             │ │
│  │  [4] Cosine Similarity vs enrolled baseline                    │ │
│  │  [5] Temporal Dynamics → dT/dt, d²T/dt², H(t)                 │ │
│  │  [6] CUSUM Drift Detector → change-point detection             │ │
│  │  [7] Isolation Forest → unsupervised anomaly scoring           │ │
│  │  [8] Cognitive State Machine → RF classifier (96.3%)           │ │
│  │  [9] Trust Score T(t) → weighted composite + velocity          │ │
│  │  [10] Decision Engine → ALLOW | STEP_UP | BLOCK               │ │
│  │  [11] Fraud Predictor → intent vector + trajectory             │ │
│  └────────────────────────────────────────────────────────────────┘ │
│  ├── Rate Limiter (token bucket, 50 req/s burst 100)              │ │
│  ├── API Key Authentication (SHA-256 hash verification)           │ │
│  ├── Input Validation (bounds checking, sanitization)             │ │
│  ├── Structured Logging (JSON, audit trail)                       │ │
│  └── Metrics Collector (latency p50/p95/p99, decision counts)     │ │
└───────────────┬──────────────────────────────────┬──────────────────┘
                │                                  │
                ▼                                  ▼
┌──────────────────────────┐       ┌──────────────────────────────────┐
│  PostgreSQL 16           │       │  Redis 7                         │
│  ├── users               │       │  ├── aegisx:session:{id}         │
│  ├── sessions            │       │  ├── aegisx:trust:{id}           │
│  ├── behavioral_events   │       │  ├── aegisx:alerts:{id}          │
│  ├── trust_decisions     │       │  └── aegisx:events:{id}          │
│  ├── baselines           │       │                                  │
│  ├── alerts              │       │  (session state caching,         │
│  └── audit_logs          │       │   real-time trust lookups)       │
└──────────────────────────┘       └──────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────────────────┐
│  SOC Dashboard (Vite + React 18 + Tailwind + Motion + Recharts)     │
│  ├── Landing Page (CardSwap, BentoGrid, FlipWords, RippleGrid)    │ │
│  ├── Live Monitor (trust gauge, real-time similarity)              │ │
│  ├── Trust Timeline (area chart, temporal dynamics)                │ │
│  ├── Cognitive Analysis (state machine, stability metrics)        │ │
│  ├── Incident Explorer (root causes, intent vectors)              │ │
│  └── Session Replay (attack timeline, decision audit)             │ │
└─────────────────────────────────────────────────────────────────────┘
```

## Trust Score Formula

```
T(t) = 0.40 × behavioral_similarity
     + 0.20 × device_trust
     + 0.20 × transaction_normality
     + 0.20 × cognitive_stability

Effective_T = T(t) × drift_penalty × anomaly_factor
```

**Temporal Dynamics:**
- Trust Velocity: dT/dt (rate of trust change)
- Trust Acceleration: d²T/dt² (rate of velocity change)
- Behavioral Entropy: H(t) (randomness in similarity history)
- Drift Magnitude: D(t) (CUSUM accumulated evidence)

**Decision Thresholds:**
- `[ALLOW]`   T > 0.85 — transaction proceeds normally
- `[STEP-UP]` T ∈ [0.60, 0.85] — biometric verification required
- `[BLOCK]`   T < 0.60 — session terminated, fraud team alerted

## Project Structure

```
AEGIS-X/
├── backend/
│   ├── main.py                      FastAPI app, WebSocket endpoints, lifespan
│   ├── api/
│   │   ├── session_routes.py        Session start/end/status
│   │   ├── event_routes.py          Behavioral event submission
│   │   ├── monitor_routes.py        Dashboard data queries
│   │   ├── audit_routes.py          Compliance and explainability
│   │   └── dependencies.py          Lazy-loaded EventProcessor
│   ├── core/
│   │   ├── config.py                Environment variables, weights, thresholds
│   │   ├── auth.py                  API key verification, session tokens
│   │   ├── rate_limiter.py          Token bucket rate limiting
│   │   ├── metrics.py               Latency tracking, decision counters
│   │   ├── validators.py            Input validation, bounds checking
│   │   └── logging.py              Structured JSON logging
│   ├── models/
│   │   └── database.py              SQLAlchemy ORM (7 tables, lazy engine)
│   ├── schemas/
│   │   ├── requests.py              Pydantic request validation
│   │   └── responses.py             Pydantic response models
│   ├── services/
│   │   ├── feature_engineering.py   16-dim behavioral feature extraction
│   │   ├── serializer.py            Numeric features → natural language
│   │   ├── embedding_service.py     MiniLM-L6-v2 → 384-dim embeddings
│   │   ├── baseline_service.py      Enrollment, EMA update, anti-poisoning
│   │   ├── similarity_service.py    Cosine similarity + classification
│   │   ├── history_service.py       Temporal dynamics buffer
│   │   ├── drift_service.py         CUSUM change-point detection
│   │   ├── anomaly_service.py       Isolation Forest (online learning)
│   │   ├── cognitive_service.py     Random Forest state machine
│   │   ├── trust_service.py         T(t) computation + velocity/acceleration
│   │   ├── decision_service.py      ALLOW/STEP_UP/BLOCK + reasoning
│   │   ├── fraud_predictor.py       Intent vector + trajectory classification
│   │   ├── risk_service.py          Unified risk aggregation
│   │   ├── explanation_service.py   Incident narratives, root cause analysis
│   │   ├── trust_pipeline.py        11-step orchestrator (< 100ms)
│   │   ├── event_processor.py       Central controller + audit logging
│   │   ├── session_manager.py       Session lifecycle management
│   │   └── cache_service.py         Redis cache (graceful fallback)
│   └── websocket/
│       └── socket_manager.py        Connection registry, broadcast hub
├── dashboard/                       Vite + React 18 + Tailwind CSS
│   └── src/
│       ├── app/pages/               5 dashboard pages + landing
│       ├── app/components/          Reusable UI components
│       └── services/                API client, state store, live capture
├── sdk/                             TypeScript SDK for banking apps
│   ├── core/
│   │   ├── collectors/              Typing, Touch, Navigation, Hesitation
│   │   ├── processors/              FeatureExtractor (16-dim output)
│   │   ├── transport/               WebSocket (auto-reconnect, queue)
│   │   └── storage/                 EventBuffer (IndexedDB offline)
│   ├── browser/                     BrowserSDK (keyboard + mouse)
│   └── index.ts                     Public API: init, start, stop, onDecision
├── simulators/                      Demo attack scenarios
│   ├── normal_user.py               Calm browsing → ALLOW
│   ├── scam_victim.py               Coercion escalation → BLOCK
│   └── malware_bot.py               Robotic automation → BLOCK
├── scripts/
│   ├── generate_behavioral_data.py  10,500 synthetic samples
│   ├── generate_cognitive_dataset.py 12,000 cognitive state samples
│   ├── train_cognitive_model.py     Random Forest training (96.3%)
│   └── init_database.py             PostgreSQL schema creation
├── data/synthetic/                  Training datasets
├── models/cognitive/                Trained .pkl models
├── embeddings/baselines/            User baseline .npz files
├── logs/                            Audit trail (JSON Lines)
├── docker-compose.yml               Full stack orchestration
├── Dockerfile                       Backend container
├── .env.example                     Environment template
└── requirements/base.txt            Pinned Python dependencies
```

## Quick Start

```bash
# 1. Setup
python -m venv venv
venv\Scripts\activate
pip install -r requirements/base.txt

# 2. Train cognitive model (required first time)
python scripts/generate_cognitive_dataset.py
python scripts/train_cognitive_model.py

# 3. Start backend
uvicorn backend.main:app --reload --port 8000

# 4. Start dashboard (separate terminal)
cd dashboard
npm install
npm run dev

# 5. Run attack simulators (separate terminals)
python -m simulators.normal_user
python -m simulators.scam_victim
python -m simulators.malware_bot
```

### Docker Deployment

```bash
docker-compose up --build
# Backend: http://localhost:8000
# Dashboard: http://localhost:3000
# Swagger: http://localhost:8000/docs
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Health check |
| GET | `/status` | System status + cache health |
| GET | `/metrics` | Pipeline latency, decision counters |
| POST | `/api/v1/session/start` | Start monitoring session |
| POST | `/api/v1/session/end` | End session, return summary |
| GET | `/api/v1/session/{user_id}` | Session status |
| GET | `/api/v1/session/{user_id}/history` | Trust timeline |
| POST | `/api/v1/event/behavioral` | Submit behavioral event |
| GET | `/api/v1/monitor/active` | Active sessions list |
| GET | `/api/v1/monitor/metrics` | Real-time pipeline metrics |
| POST | `/api/v1/audit/explain` | Decision explanation |
| GET | `/api/v1/audit/session/{id}/summary` | Session audit summary |
| WS | `/ws/{user_id}` | SDK WebSocket (real-time) |
| WS | `/ws/dashboard` | Dashboard broadcast channel |

## Demo Scenarios

| Scenario | Trust Pattern | Cognitive State | Final Decision |
|----------|--------------|-----------------|----------------|
| Normal User | T ∈ [0.95, 0.99] | calm/focused | ALLOW |
| Account Takeover | T: 0.99 → 0.87 (gradual drift) | focused | STEP_UP |
| Scam Call Victim | T: 0.95 → 0.38 (collapse) | panicked → coerced | BLOCK |
| Remote Malware | T: 0.95 → 0.25 (instant) | robotic | BLOCK |

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Backend | Python 3.11, FastAPI | REST + WebSocket server |
| ML | sentence-transformers (MiniLM-L6-v2) | 384-dim behavioral embeddings |
| Classification | scikit-learn (Random Forest, Isolation Forest) | Cognitive states + anomaly |
| Drift Detection | CUSUM (custom) | Statistical change-point detection |
| Database | PostgreSQL 16 | Persistent storage (7 tables) |
| Cache | Redis 7 | Session state, real-time lookups |
| Dashboard | Vite, React 18, Tailwind, Motion, Recharts | SOC monitoring interface |
| SDK | TypeScript | Browser/mobile behavioral telemetry |
| Infrastructure | Docker Compose | Container orchestration |

## Key Differentiators

1. **Sub-100ms Pipeline** — Full 11-step trust assessment in < 100ms (MiniLM bottleneck ~55ms)
2. **Anti-Coercion Detection** — Cognitive state machine detects social engineering in real-time
3. **Continuous Trust** — Not one-time auth; ongoing behavioral verification every 2 seconds
4. **Explainable AI** — Every BLOCK decision comes with root cause, narrative, and audit trail
5. **Zero-Day Anomaly Detection** — Isolation Forest catches novel attack patterns without labels
6. **Fraud Intent Vectors** — Probabilistic classification of coercion vs takeover vs robotic
7. **Graceful Degradation** — Redis/Postgres failures → in-memory fallback, never blocks users
8. **Bank-Grade Security** — Rate limiting, API key auth, input validation, structured audit logs
