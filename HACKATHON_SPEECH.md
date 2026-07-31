# AEGIS-X: Hackathon Presentation Guide
## Continuous Mathematical Trust Infrastructure & Behavioral Identity Verification for Next-Gen Banking

---

## 🎤 OPENING SPEECH (3-4 minutes)

### Hook (30 seconds)
"Every 12 seconds, someone in India falls victim to a UPI fraud. In 2025, India lost over ₹14,000 crore to digital payment fraud. The scary part? OTPs, PINs, and fingerprints DIDN'T prevent any of these. Why? Because fraudsters don't hack your password — they hack YOUR BEHAVIOR. They manipulate you into sending money yourself. AEGIS-X is built to solve exactly that."

### Problem Statement (60 seconds)
"Current banking security relies on 3 things: something you know (PIN), something you have (phone), and something you are (fingerprint). All 3 fail against social engineering. When a scammer calls pretending to be your bank, convinces you there's a 'KYC issue', and walks you through a transaction — your PIN works, your phone is in your hand, and your fingerprint scans perfectly. The system sees a legitimate user because it only checks WHO you are, not HOW you're behaving.

This is the fundamental flaw: **static identity ≠ behavioral identity**. A person being coerced types differently, hesitates differently, scrolls differently than when they're freely banking. AEGIS-X detects this."

### Solution (90 seconds)
"AEGIS-X is a Continuous Mathematical Trust Infrastructure. Instead of one-time authentication, we compute a real-time trust score T(t) that evolves EVERY 2 SECONDS based on how you interact with the banking app.

Here's what makes it different:

1. **Behavioral Biometrics SDK** — silently tracks 16 behavioral features: typing speed, rhythm variance, touch pressure, swipe straightness, hesitation patterns, gyroscope data, and more.

2. **384-Dimensional Behavioral Embeddings** — we convert behavior into a mathematical identity using sentence-transformers (MiniLM-L6-v2), then compare against your baseline using cosine similarity.

3. **Cognitive State Classification** — our ML model classifies you into one of 6 states: calm, focused, distressed, panicked, coerced, or robotic. Each maps to a risk tier.

4. **CUSUM Drift Detection** — statistical change-point algorithm detects when behavior drifts from your baseline, even gradually.

5. **Adaptive Verification** — when trust drops, we don't just block you. We pick the RIGHT verification based on WHY trust dropped. Voice verification for cognitive distress, face liveness for robotic behavior.

6. **Containment Sandbox** — if we detect a scam in progress, we sandbox the transaction. The attacker sees success, but NO money moves. They never know they're contained."

### Impact (30 seconds)
"AEGIS-X doesn't replace existing security — it adds a CONTINUOUS behavioral layer that catches what OTPs never can. It detects coercion, automation, and social engineering IN REAL-TIME, BEFORE money leaves the account. Zero friction for legitimate users. Complete protection against behavioral manipulation."

---

## 🏗️ ARCHITECTURE DEEP DIVE

### System Overview
```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
│  React/TypeScript Dashboard + Behavioral SDK                    │
│  Firebase Hosting: https://aegisx-2026.web.app                  │
└───────────────────────────┬─────────────────────────────────────┘
                            │ WebSocket (real-time)
                            │ REST API (verification)
┌───────────────────────────┴─────────────────────────────────────┐
│                      BACKEND (GCP Cloud Run)                     │
│  FastAPI + ML Pipeline + Biometric Providers                    │
│  URL: aegisx-backend-40060733769.us-central1.run.app            │
├─────────────────────────────────────────────────────────────────┤
│  Trust Pipeline (55-75ms per event):                            │
│  [1] Feature Extraction (16-dim)                                │
│  [2] Text Serialization                                         │
│  [3] MiniLM-L6-v2 Embedding (384-dim)                          │
│  [4] Cosine Similarity vs Baseline                              │
│  [5] Similarity History + Temporal Dynamics                     │
│  [6] CUSUM Drift Detection                                      │
│  [7] Cognitive State Classification (6 states)                  │
│  [8] Transaction Risk Scoring                                   │
│  [9] Weighted Trust Computation                                 │
│  [10] Decision Engine (ALLOW/STEP_UP/BLOCK)                     │
├─────────────────────────────────────────────────────────────────┤
│  Biometric Providers:                                           │
│  • SpeechBrain ECAPA-TDNN (voice, 192-dim)                     │
│  • InsightFace buffalo_l (face, 512-dim)                        │
│  • MediaPipe FaceMesh (liveness, 468 landmarks)                 │
│  • sentence-transformers/all-MiniLM-L6-v2 (behavioral, 384-dim)│
└─────────────────────────────────────────────────────────────────┘
```

### Trust Score Formula
```
T(t) = 0.40 × Behavioral + 0.20 × Device + 0.20 × Transaction + 0.20 × Cognitive

Where:
  Behavioral = cosine_similarity(current_embedding, baseline_embedding)
  Device     = known_device_score (fingerprint match)
  Transaction = f(amount, beneficiary_novelty, frequency)
  Cognitive  = stability_score(cognitive_state)
```

### Decision Thresholds
| Trust Score | Decision | Action |
|-------------|----------|--------|
| > 78% | ALLOW | Normal operation |
| 50-78% | STEP_UP | Adaptive verification |
| < 50% | BLOCK | Containment activated |

### Cognitive States → Stability Mapping
| State | Stability | Risk Level | Trigger |
|-------|-----------|------------|---------|
| Calm | 1.00 | None | Normal browsing |
| Focused | 0.85 | Minimal | Active typing |
| Distressed | 0.50 | Moderate | Hesitation + corrections |
| Panicked | 0.30 | High | Erratic + fast + errors |
| Coerced | 0.15 | Very High | Slow + long touch + freeze |
| Robotic | 0.05 | Critical | Perfect timing + no variance |

---

## 🎯 DEMO GUIDE

### Normal User Flow (Trust stays ~95%)
1. Open https://aegisx-2026.web.app → Click "Normal User"
2. Navigate the banking app naturally — trust stays green
3. Initiate a ₹500 transfer → MPIN → Success (no extra verification needed)
4. Show the AEGIS Console on right: trust ~95%, cognitive "calm", decision "ALLOW"

### Scam Simulation (Trust drops → BLOCK)
1. Click "Scam Call" mode
2. Watch trust score drop in real-time on the right panel
3. Cognitive state transitions: calm → distressed → panicked → coerced
4. Trust drops below 50% → **CONTAINMENT OVERLAY** appears
5. "Session blocked due to behavioral anomaly detected"

### Malware/Bot Simulation (Instant detection)
1. Click "Malware Bot" mode
2. Robotic behavior: perfect timing, zero variance, superhuman speed
3. Trust drops immediately → cognitive "robotic" → BLOCK in 1-2 events
4. Show how fast the system detects automation

### Verification Demo (Face/Voice)
1. Normal mode → Send ₹25,000+
2. MPIN entered correctly
3. **Extra security**: Face liveness OR voice verification appears
4. Perform the action (smile, nod, turn, speak phrase)
5. Passes → Payment successful with AEGIS-X verified badge

### Spam Detection in Normal Mode
1. In the banking app text fields, type keyboard spam (random keys)
2. System detects abnormal typing pattern instantly
3. Trust drops → may trigger STEP_UP or BLOCK

---

## ❓ Q&A PREPARATION

### Technical Questions

**Q: How is this different from just using fingerprint/FaceID?**
A: Fingerprint/FaceID verifies WHO you are at one point in time. AEGIS-X continuously verifies HOW you're behaving throughout the session. A scammer can force you to unlock your phone, but they can't force you to behave normally. We detect the behavioral change in real-time.

**Q: What ML models do you use and why?**
A: 
- **sentence-transformers/all-MiniLM-L6-v2** (behavioral embeddings): 384-dim semantic embeddings from behavioral text descriptions. Fast (~55ms) and captures behavioral patterns.
- **HistGradientBoosting** (cognitive classifier): Trained on 25K synthetic samples across 6 cognitive states. 80.8% accuracy with engineered cross-features.
- **Isolation Forest** (anomaly detection): Unsupervised, trained on 50K behavioral samples. 89.5% social engineering detection rate.
- **SpeechBrain ECAPA-TDNN** (voice): State-of-art speaker verification, 192-dim embeddings, 0.8% EER on VoxCeleb.
- **InsightFace buffalo_l** (face): ArcFace 512-dim embeddings, 99.83% LFW accuracy.
- **MediaPipe FaceMesh** (liveness): 468 facial landmarks for real-time action detection.

**Q: What happens if the user is just having a bad day (shaky hands, nervous)?**
A: The system has trust inertia — established sessions (5+ events) resist single outlier events. The CUSUM algorithm needs CUMULATIVE evidence of drift, not one bad event. Also, "distressed" alone doesn't block — it just increases monitoring. Only sustained coercion/robotic patterns or rapid trust collapse trigger containment.

**Q: How do you handle false positives?**
A: Multiple safeguards:
1. Trust inertia for established sessions
2. Hysteresis (need 85% to recover from STEP_UP, prevents oscillation)
3. STEP_UP is not BLOCK — it just asks for quick verification
4. Cognitive classification requires confidence > threshold
5. CUSUM needs cumulative evidence, not single events

**Q: Can an attacker fool the behavioral biometrics?**
A: Extremely difficult because:
1. We track 16 features simultaneously in 2-second windows
2. Baseline is a 384-dimensional embedding — impossible to manually replicate
3. CUSUM detects even GRADUAL behavioral shifts
4. Cognitive model catches coercion signatures (long touches + hesitation + low speed)
5. Robotic behavior (perfect timing, zero variance) is instantly flagged

**Q: How do you protect voice verification from replay attacks?**
A: Spectral flatness analysis. Live speech has natural spectral variation (frequency energy distributed across bands). Replayed audio from speakers shows compressed spectral characteristics, narrow bandwidth, and unnaturally high spectral flatness. We measure spectral flatness > 0.6 + low high-frequency ratio as replay indicators.

**Q: What's the latency? Can this work in production?**
A: Full pipeline executes in 55-75ms per event. The bottleneck is MiniLM inference (~50ms on CPU). Events come every 2 seconds, so we have 2000ms budget with only 75ms used. Voice/face verification adds 200-500ms (acceptable for biometric UX).

**Q: How does the containment sandbox work?**
A: When trust drops below critical (40%), the security state machine transitions to CONTAINMENT. In this state:
- All transaction APIs return FAKE success responses
- No real money movement occurs
- The attacker doesn't know they're sandboxed
- Forensic evidence is collected silently
- Bank SOC team gets notified
- Session can recover through successful verification

**Q: What data do you collect? Privacy concerns?**
A: We collect behavioral PATTERNS, not content. We don't read messages, track locations, or access personal data. The features are: typing speed, touch duration, scroll patterns — all aggregated into 2-second windows. Behavioral embeddings are stored encrypted (AES-128-CBC Fernet). No raw biometric data leaves the device — only embeddings.

**Q: How does the cognitive state classifier work?**
A: HistGradientBoosting model trained on 25K synthetic behavioral samples with 14 engineered features (8 base + 6 cross-features like speed_consistency, stress_compound, automation_signal). Labels: calm, focused, distressed, panicked, coerced, robotic. Each state maps to a stability score that feeds into the trust formula.

**Q: What if the internet is slow/disconnected?**
A: The SDK buffers events locally and reconnects automatically (5-attempt exponential backoff). Session state is preserved in sessionStorage. The backend persists pipeline state to prevent data loss on restarts.

### Business Questions

**Q: What's the market size?**
A: India's digital payment fraud: ₹14,000 crore+ annually. Global behavioral biometrics market: $3.2B (2024) → projected $12.6B by 2030. UPI handles 12 billion+ transactions/month — even 0.1% fraud prevention = massive savings.

**Q: How would banks integrate this?**
A: SDK integration — 5 lines of code in any banking app:
1. Initialize AEGIS SDK on app launch
2. Notify screen changes
3. Set transaction context before payment
4. Listen for trust decisions (ALLOW/BLOCK)
5. Show containment UI when blocked

Backend: single API endpoint via WebSocket. No changes to existing payment infrastructure needed.

**Q: What's your competitive advantage vs existing fraud detection?**
A: Existing systems (rule-based, transaction monitoring) detect fraud AFTER it happens. They flag suspicious transactions based on amount/frequency. AEGIS-X detects the ATTACK IN PROGRESS by monitoring behavioral changes. We catch social engineering, phone-call scams, and remote access — the top fraud vectors that bypass all existing systems.

**Q: Revenue model?**
A: SaaS per-API-call pricing for banks. Free tier for startups. Enterprise tier with SOC dashboard, custom thresholds, and dedicated support. Also: compliance-as-a-service (RBI mandates continuous auth under DPSS guidelines).

---

## 🔧 TECHNICAL SPECS (Quick Reference)

| Component | Technology | Performance |
|-----------|-----------|-------------|
| Behavioral Embedding | MiniLM-L6-v2 | 384-dim, ~55ms |
| Cognitive Classifier | HistGradientBoosting | 80.8% accuracy, 6 classes |
| Anomaly Detection | Isolation Forest | 89.5% social eng detection |
| Drift Detection | CUSUM | Statistical, O(1) per event |
| Voice Verification | SpeechBrain ECAPA-TDNN | 192-dim, 0.8% EER |
| Face Verification | InsightFace buffalo_l | 512-dim, 99.83% LFW |
| Liveness Detection | MediaPipe FaceMesh | 468 landmarks, real-time |
| Pipeline Latency | End-to-end | 55-75ms per event |
| SDK Window | Behavioral capture | Every 2 seconds |
| Backend | FastAPI + GCP Cloud Run | 4GB RAM, always-on |
| Frontend | React + Firebase | CDN-delivered globally |

---

## 🏆 KEY DIFFERENTIATORS

1. **Continuous, not one-time** — Trust evolves every 2 seconds from app launch
2. **Behavioral, not credential** — Detects HOW you act, not WHAT you know
3. **Cognitive awareness** — First system to classify user's mental state (coercion, panic)
4. **Adaptive verification** — Picks the RIGHT check based on WHY trust dropped
5. **Deceptive containment** — Attacker never knows they're caught (sandbox returns fake success)
6. **Mathematical foundation** — CUSUM theory, cosine similarity, weighted trust formula
7. **Real ML models** — Not mock/rule-based. Actual trained models with real provider inference
8. **Production-ready** — Deployed on GCP Cloud Run, handles real biometric verification
9. **Privacy-preserving** — Only behavioral patterns, encrypted at rest, no content access
10. **Zero UX friction** — Invisible to legitimate users, only activates under threat

---

## 📌 CLOSING STATEMENT

"AEGIS-X doesn't ask 'who are you?' once. It continuously asks 'are you still you?' — every 2 seconds, through mathematical behavioral analysis. When the answer changes, when hesitation creeps in, when someone else takes control, when a scam call creates panic — we see it in the numbers before any money leaves the account. This is the future of banking security: invisible, continuous, and mathematically certain."

---

## 🔗 LIVE LINKS

- **Demo**: https://aegisx-2026.web.app
- **Backend Health**: https://aegisx-backend-40060733769.us-central1.run.app/health
- **GitHub**: github.com/KaranGupta2005/AEGIS-X
- **Models**: huggingface.co/guptakaran2026/aegisx-models
