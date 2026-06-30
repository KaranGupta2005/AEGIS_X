# AEGIS-X

**Continuous Mathematical Trust Infrastructure & Behavioral Identity Verification for Next-Gen Banking**

> DFS & IBA Cyber Security PSBs Hackathon Series 2026 — Central Bank of India × MNNIT Allahabad, Prayagraj

[![Live Demo](https://img.shields.io/badge/Live_Demo-aegisx--2026.web.app-blue)](https://aegisx-2026.web.app)
[![Backend](https://img.shields.io/badge/API-aegisx--backend.onrender.com-green)](https://aegisx-backend-t1v7.onrender.com)
[![Demo Video](https://img.shields.io/badge/Demo_Video-Google_Drive-red)](https://drive.google.com/file/d/1zddcrk7vlf4fkms0AsWPKA7wImePqric/view?usp=sharing)

---

## Team AEGIS-X

- **Dhruv Dawar** — Team Leader
- **Karan Gupta** — Full-Stack Developer & AI/ML Engineer
- **Parkhar Sharma** — Developer

---

## Problem Statement

Current banking security stops at the front door. Once a password or fingerprint is verified, the system **blindly trusts** the rest of the session. In high-speed ecosystems like UPI, this static "Login Blind Spot" leaves apps defenseless against mid-stream device hijacks or psychological manipulation.

**Key Threats:**
- **Scam Calls**: Coerced victims pass checks themselves, tricking the app into approving fraud for a "legitimate" user
- **Session Takeovers**: Screen-mirroring malware makes it impossible to distinguish genuine taps from a hacker's commands
- **Black Box Blocks**: Vague, unexplained rejections create nightmares for compliance audits and customer support

---

## Solution

AEGIS-X replaces one-time passwords with a **living mathematical system**. A lightweight 15KB SDK passively captures 16 behavioral signals every 2 seconds. By tracking behavioral trajectories in real-time, we kill the session the millisecond it drifts from the verified user.

**Core Innovations:**
- **Continuous Trust (dT/dt)**: Fluid mathematical authentication replacing static gateways
- **Cognitive Coercion Detection**: Random Forest identifies psychological distress through micro-hesitations and motor control drift
- **Zero-Knowledge Privacy**: Raw biometrics never leave the phone — only encrypted, anonymized vectors reach the server
- **Sub-100ms Interception**: Full 11-step ML pipeline executes in under 100ms

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│  Banking App + AEGIS-X SDK (15KB TypeScript)                      │
│  → Captures 16 behavioral features every 2 seconds                │
│  → WebSocket transport → zero raw biometrics leave device         │
└───────────────────────────────┬──────────────────────────────────┘
                                │ WebSocket (every 2s)
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│  FastAPI Backend — 11-Step Trust Pipeline (< 100ms)               │
│  [1] Feature Extraction (16-dim) → [2] Text Serialization →      │
│  [3] MiniLM-L6-v2 Embedding (384-dim) → [4] Cosine Similarity →  │
│  [5] Temporal Dynamics (dT/dt, d²T/dt²) → [6] CUSUM Drift →      │
│  [7] Isolation Forest Anomaly → [8] Cognitive State (RF) →        │
│  [9] Trust Score T(t) → [10] Decision Engine → [11] Fraud Intent  │
└──────────────┬────────────────────────────────────┬──────────────┘
               │                                    │
               ▼                                    ▼
┌────────────────────────┐          ┌────────────────────────────────┐
│  PostgreSQL 16          │          │  Redis 7                        │
│  (Audit logs, users,    │          │  (Session state, pipeline       │
│   trust decisions)      │          │   recovery every 5 events)      │
└────────────────────────┘          └────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────────────────┐
│  SOC Dashboard (React 18 + Tailwind + Three.js + Recharts)        │
│  Live Monitor | Trust Timeline | Cognitive Analysis |              │
│  Incident Explorer | Session Replay                               │
└──────────────────────────────────────────────────────────────────┘
```

---

## Trust Score Formula

```
T(t) = 0.40 × Behavioral Similarity + 0.20 × Device Trust
     + 0.20 × Transaction Normality + 0.20 × Cognitive Stability

Effective_T = T(t) - Drift Penalty
```

**Decision Thresholds:**
- `T(t) > 0.80` → **ALLOW** (frictionless verification)
- `T(t) ∈ [0.50, 0.80]` → **STEP_UP** (biometric retry / cool-down)
- `T(t) < 0.50` → **BLOCK** (terminate session instantly)

---

## AI/ML Models

1. **MiniLM-L6-v2** (Sentence-Transformers) — Converts behavioral descriptions into 384-dim semantic fingerprints
2. **Random Forest** (Cognitive Classifier) — Predicts 6 mental states: calm, focused, distressed, panicked, coerced, robotic
3. **Isolation Forest** — Unsupervised zero-day anomaly detection (pre-seeded, no cold-start)
4. **CUSUM Drift Detection** — Statistical change-point algorithm catching slow social engineering attacks

---

## Tech Stack

- **Client/Edge**: TypeScript SDK (15KB), React 18, Tailwind CSS, Vite
- **Backend & ML**: Python 3.11, FastAPI, Scikit-Learn, sentence-transformers, NumPy
- **Databases**: PostgreSQL 16 (Audit & Persistence), Redis 7 (Real-time State & Cache)
- **Dashboard**: React 18, TypeScript, Vite 6, TailwindCSS 4, Three.js, Highcharts, Recharts, Motion
- **Infrastructure**: Docker, Render (Backend), Firebase Hosting (Frontend)

---

## Project Structure

```
AEGIS-X/
├── README.md
│
├── docs/
│   ├── Technical_Document.pdf
│   └── Technical_Document.md
│
├── presentation/
│   ├── AEGIS-X_Presentation.pdf
│   └── AEGIS-X_Presentation.pptx
│
├── demo/
│   └── Demo_Video.mp4
│
├── backend/
│   ├── main.py                      FastAPI app + WebSocket endpoints
│   ├── api/                         REST routes (session, event, monitor, audit, auth)
│   ├── core/                        Config, auth, rate limiting, metrics, validators
│   ├── models/                      SQLAlchemy ORM (7 tables)
│   ├── schemas/                     Pydantic request/response models
│   ├── services/                    18 ML/AI services (trust pipeline, cognitive, drift, etc.)
│   └── websocket/                   Connection manager, broadcast hub
│
├── dashboard/                       Vite + React 18 + Tailwind CSS + Three.js
│   └── src/app/pages/               LiveDemo, LiveMonitor, TrustTimeline,
│                                    CognitiveAnalysis, IncidentExplorer, SessionReplay
│
├── sdk/                             TypeScript SDK for banking apps (15KB)
├── simulators/                      Attack scenario simulators
├── scripts/                         Training scripts, data generation
├── models/                          Trained ML models (.pkl)
├── data/                            Synthetic training datasets
├── embeddings/                      User behavioral baselines (.npz)
├── logs/                            Audit trail (JSON Lines)
├── requirements/                    Python dependencies
├── docker-compose.yml               Full stack orchestration
├── Dockerfile                       Backend container
└── render.yaml                      Render deployment config
```

---

## Quick Start

```bash
# 1. Setup environment
python -m venv venv
venv\Scripts\activate          # Windows
pip install -r requirements/base.txt

# 2. Train cognitive model (first time only)
python scripts/generate_cognitive_dataset.py
python scripts/train_cognitive_model.py

# 3. Start backend
uvicorn backend.main:app --reload --port 8000

# 4. Start dashboard (separate terminal)
cd dashboard
npm install
npm run dev

# 5. Run attack simulators
python -m simulators.normal_user
python -m simulators.scam_victim
python -m simulators.malware_bot
```

---

## Demo

**Live Prototype**: https://aegisx-2026.web.app

**Demo Video**: https://drive.google.com/file/d/1zddcrk7vlf4fkms0AsWPKA7wImePqric/view?usp=sharing

**Demo Scenarios:**
- Normal User → Trust stays 0.95-0.99, Cognitive: calm → **ALLOW**
- Scam Call Victim → Trust collapses 0.95→0.38, Cognitive: panicked→coerced → **BLOCK**
- Remote Malware → Trust drops instantly, Cognitive: robotic → **BLOCK**
- Account Takeover → Gradual drift detected by CUSUM → **STEP_UP**

---

## Security Measures

- **Anti-Poisoning Gate**: Baselines only update when Trust > 0.90
- **Rate Limiting**: Token-bucket (50 HTTP req/s; 5 WS events/s per user)
- **Input Validation**: Pydantic v2 enforces strict physical bounds on all 16 features
- **HMAC-SHA256 Auth**: Secure token-based authentication
- **CORS Restrictions**: Whitelisted origins only
- **Audit Logging**: Every decision recorded in JSON Lines for compliance

---

## References

- Page, E. S. (1954). *Continuous Inspection Schemes.* Biometrika. (CUSUM)
- Reimers, N., & Gurevych, I. (2019). *Sentence-BERT.* (MiniLM-L6-v2 architecture)
- Liu, F. T., Ting, K. M., & Zhou, Z. H. (2008). *Isolation Forest.* (Anomaly detection)
- Breiman, L. (2001). *Random Forests.* Machine Learning. (Cognitive classification)

---

## License

This project was built for the DFS & IBA Cyber Security PSBs Hackathon Series 2026.
