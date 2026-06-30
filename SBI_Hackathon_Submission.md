# SBI Hackathon Submission — AEGIS-X

## Theme
Agentic AI & Emerging Tech

## Problem Statement
Digital Engagement — Create AI-driven engagement models that proactively interact with customers based on behaviours, financial patterns, and life events.

## Project Title
AEGIS-X: Continuous Behavioral Trust Intelligence for Proactive Digital Banking Engagement

---

## Team Details

- Karan Gupta — Full-stack developer & AI/ML engineer (Team Lead)
- (Add up to 3 more members with names and organization if applicable)

---

## Brief Description of the Idea

AEGIS-X is a real-time behavioral intelligence engine that continuously monitors how a customer interacts with their banking app — not just what they do, but how they do it. Every 2 seconds, the system captures 16 behavioral biometric signals (typing rhythm, swipe patterns, touch pressure, hesitation, gyroscope movement, correction rates) and transforms them into a "behavioral fingerprint" using semantic AI embeddings. This fingerprint is compared against the customer's established behavioral identity to produce a live Trust Score that drives proactive engagement decisions.

Unlike traditional fraud detection that reacts after damage is done, AEGIS-X enables the bank to proactively engage with customers in real-time — intervening when a customer shows signs of being under duress from a scam call, detecting account takeover the moment behavioral patterns shift, and adapting the banking experience based on the customer's cognitive state. This means the bank can send a reassuring message when it detects panic, introduce a mandatory cool-down period when coercion signatures appear, or fast-track transactions when behavior is perfectly consistent — all without the customer explicitly asking for help.

---

## Proposed Solution

AEGIS-X solves the Digital Engagement challenge through three pillars:

**1. Behavioral Identity as Engagement Foundation:** Every customer builds a unique behavioral baseline over their first 5+ trusted sessions. This baseline is a 384-dimensional vector representing "how this person normally interacts with their phone." All future engagement decisions are personalized based on deviation from this identity — not generic rules applied to everyone.

**2. Proactive Real-Time Intervention:** The system doesn't wait for a fraud report. It detects behavioral anomalies within seconds and triggers contextual engagement actions:
- If Trust Score drops gradually (account takeover signature) → proactive step-up authentication with a helpful message explaining why
- If cognitive state shifts to "panicked" or "coerced" (social engineering/scam call) → mandatory cool-down timer, biometric verification, and an in-app safety alert
- If behavioral patterns indicate "robotic" input (remote access malware) → immediate session block with customer notification
- If behavior is perfectly consistent → friction-free experience, instant approvals, personalized offers

**3. Cognitive-Aware Customer Experience:** AEGIS-X classifies the customer's mental state into 6 levels (calm, focused, distressed, panicked, coerced, robotic) using a trained Random Forest classifier. This enables the bank to engage empathetically — a distressed customer transferring a large sum gets a gentle verification prompt, not a cold OTP. A calm, focused customer gets fast-tracked.

**Key Differentiators over existing solutions:**
- Continuous authentication (every 2 seconds), not one-time login verification
- Semantic embedding approach means the system understands behavioral meaning, not just raw numbers
- Anti-poisoning protection ensures attackers cannot gradually shift the baseline to match their own behavior
- Complete audit trail for every decision with human-readable explanations (RBI compliance ready)
- Works passively — zero friction for genuine customers, no extra taps or inputs required

---

## Business Model / Commercial Potential

**Revenue Streams:**
- SaaS licensing to banks and NBFCs on a per-active-user/month basis (₹2-5 per user/month at scale, targeting 10Cr+ digital banking users in India)
- Premium tier with advanced cognitive analytics, incident investigation tools, and custom model training
- Implementation and integration consulting fees for enterprise deployments
- Transaction-level micro-pricing for high-value transfer protection

**Cost Savings for the Bank:**
- India lost ₹11,333 Cr to digital fraud in 2023 (RBI data). Even a 5% reduction represents ₹500+ Cr saved annually across the banking sector
- Reduction in false-positive friction (fewer unnecessary OTPs/blocks) directly improves customer retention and NPS scores
- Automated real-time decisions reduce manual investigation team costs by 60-70%

**Market Opportunity:**
- 350+ million UPI users in India, growing 40% YoY
- RBI mandate for enhanced digital security creates regulatory tailwind
- No existing solution combines behavioral biometrics + cognitive state detection + semantic AI in a single real-time pipeline
- Applicable beyond banking: insurance, fintech lending, e-commerce, government digital services

**Competitive Moat:**
- The behavioral baseline builds over time — each customer's identity becomes more precise with usage, creating a switching cost
- Patent-potential on the semantic embedding approach to behavioral biometrics (text serialization → MiniLM → cosine drift is novel)
- First-mover advantage in cognitive state-aware banking engagement in the Indian market

---

## Technology Stack Details

**Backend (Real-Time Trust Engine):**
- Python 3.11 with FastAPI for high-performance async HTTP and WebSocket APIs
- sentence-transformers library with all-MiniLM-L6-v2 model for generating 384-dimensional semantic behavioral embeddings — this is the core innovation that converts raw behavioral numbers into meaningful identity vectors
- scikit-learn powering two ML models: an Isolation Forest for unsupervised anomaly detection (pre-seeded with synthetic data to eliminate cold-start) and a Random Forest classifier for cognitive state prediction across 6 mental states
- NumPy for all vector operations, cosine similarity, CUSUM algorithm computation, and EMA baseline adaptation
- PostgreSQL for persistent user data, session records, and baseline metadata storage
- Redis for real-time session state caching, pipeline state persistence (crash recovery every 5 events), and pub/sub for alert broadcasting
- WebSocket (native FastAPI) for bidirectional real-time communication with both the mobile SDK and the monitoring dashboard — each user maintains a persistent connection with per-user token-bucket rate limiting (5 events/sec, burst of 10)
- Custom CUSUM (Cumulative Sum) change-point detection algorithm for identifying gradual behavioral drift that would indicate an account takeover in progress
- JWT-based authentication with session management, CORS restrictions on known origins, and multi-layer rate limiting (per-user WebSocket + global HTTP middleware at 50 req/s)

**Frontend (Operations Dashboard):**
- React 18 with TypeScript for type-safe component architecture
- Vite 6 as the build tool for instant HMR during development and optimized production bundles
- TailwindCSS 4 for utility-first responsive styling
- Three.js with GSAP for 3D interactive visualizations of behavioral drift in embedding space
- Highcharts and Recharts for real-time trust score timelines, cognitive state distribution charts, and anomaly heatmaps
- React Router 7 for client-side routing with lazy-loaded pages (LiveMonitor, TrustTimeline, CognitiveAnalysis, IncidentExplorer, SessionReplay)
- Motion (Framer Motion) for smooth UI animations and state transitions
- WebSocket client consuming the same real-time trust updates that the mobile SDK receives

**Mobile SDK (Data Collection Layer — designed for integration):**
- Lightweight JavaScript/React Native SDK that captures 16 behavioral features every 2 seconds: typing speed (chars/sec), typing rhythm variance, typing pressure, swipe velocity (mean + variance), swipe straightness, touch duration (mean + variance), touch area, hesitation ratio, hesitation count, correction rate, scroll speed, gyroscope variance, session elapsed time, and interaction intensity
- All data transmitted over WebSocket for minimal latency — no HTTP overhead per heartbeat
- Entirely passive collection — zero UI elements, zero user interaction required

**ML/AI Pipeline (11-step, less than 100ms end-to-end):**
- Step 1: Feature extraction and validation (16-dim vector with boundary clipping and missing-field imputation)
- Step 2: Behavioral text serialization (converts numeric features to natural language descriptions for semantic understanding)
- Step 3: MiniLM-L6-v2 embedding generation (50-70ms, the primary computational cost)
- Step 4: Cosine similarity against user's stored 384-dim baseline
- Step 5: Sliding window history (50 scores = 100 seconds) with temporal dynamics computation (trust velocity dT/dt, acceleration d²T/dt², entropy H(t))
- Step 6: CUSUM drift detection for gradual change-point identification
- Step 6.5: Isolation Forest anomaly scoring on the raw 16-dim feature vector
- Step 7: Cognitive state classification via Random Forest (calm/focused/distressed/panicked/coerced/robotic)
- Step 8: Transaction risk scoring (amount thresholds calibrated for Indian banking: ₹5K/₹25K/₹1L/₹5L tiers, new beneficiary penalty, time-of-day risk, frequency analysis)
- Step 9: Trust Score computation using weighted multi-signal fusion: T(t) = 0.40×behavioral_similarity + 0.20×device_trust + 0.20×transaction_normality + 0.20×cognitive_stability
- Step 10: Decision engine (ALLOW above 0.80 / STEP_UP 0.50-0.80 / BLOCK below 0.50) with override rules for cognitive coercion, rapid decline, critical drift, and high-value panic transactions
- Step 11: Fraud intent vector estimation (coercion probability, takeover probability, robotic probability, anomaly severity)

**Infrastructure & DevOps:**
- Backend deployed on Render with auto-scaling and self-ping keep-alive to prevent cold starts
- Frontend hosted on Firebase Hosting (global CDN, SSL, SPA routing)
- Infrastructure-as-code via render.yaml for reproducible deployments
- JSON Lines audit logging for full compliance traceability (every decision recorded with timestamp, user, score, reasons, and cognitive state)
- Graceful degradation: system operates without PostgreSQL (in-memory state) and without Redis (in-memory CacheService fallback) for demo/hackathon resilience

---

## Process Flow / Architecture

**End-to-End Flow:**

The customer opens their SBI mobile banking app. In the background, the AEGIS-X SDK activates and begins passively capturing behavioral telemetry — how they type their password, how they swipe through menus, the rhythm of their taps, the steadiness of their hand (gyroscope). Every 2 seconds, this 16-feature behavioral snapshot is transmitted over a persistent WebSocket connection to the AEGIS-X backend.

Upon receiving the event, the Event Processor validates the data completeness and routes it to the Trust Pipeline. The pipeline first extracts and normalizes the 16 features, then serializes them into a human-readable behavioral description (e.g., "typing speed is normal, high hesitation detected, touch pressure elevated"). This text is fed through the MiniLM-L6-v2 transformer to produce a 384-dimensional embedding — the customer's current behavioral fingerprint.

This fingerprint is compared via cosine similarity against the customer's stored baseline (their "behavioral identity" built over previous trusted sessions). The similarity score feeds into the CUSUM drift detector, which accumulates evidence of gradual behavioral shift. Simultaneously, the Isolation Forest flags statistical anomalies, and the Cognitive Classifier identifies the customer's mental state.

All signals converge into the Trust Score formula: T(t) = 0.40×behavioral + 0.20×device + 0.20×transaction + 0.20×cognitive. The Decision Engine applies the score against thresholds and override rules to produce a verdict: ALLOW, STEP_UP, or BLOCK. The Fraud Predictor simultaneously estimates attack-type probabilities (coercion, takeover, malware, anomaly).

The complete result (trust score, decision, cognitive state, alerts, explanation) is pushed back to the mobile SDK over WebSocket in real-time, and simultaneously broadcast to the bank's operations dashboard. The Alert Engine fires notifications for critical events. The Audit Logger records every decision for RBI compliance. The pipeline state is persisted to Redis every 5 events for crash recovery.

**Architecture Layers:**
- Layer 1 (Data Collection): Mobile SDK → 16 behavioral features every 2 seconds → WebSocket
- Layer 2 (Ingestion): WebSocket Handler → Rate Limiter → Event Processor → Validation
- Layer 3 (Intelligence): Feature Engineering → Serialization → Embedding → Similarity → CUSUM → Anomaly → Cognitive → Trust Computation → Decision
- Layer 4 (Action): Decision pushed to SDK (ALLOW/STEP_UP/BLOCK) + Dashboard broadcast + Alert Engine + Audit Log
- Layer 5 (Adaptation): Baseline EMA update (only if trust > 0.90, anti-poisoning) + Isolation Forest retraining on accumulated samples
- Layer 6 (Operations): Real-time dashboard with LiveMonitor, TrustTimeline, CognitiveAnalysis, IncidentExplorer, and SessionReplay for bank security teams

**What makes this architecture unique for SBI:**
- Entirely passive — customers never know it's running, zero friction added to the banking experience
- Sub-100ms processing ensures decisions happen faster than a human can complete a transaction
- Works on existing banking app infrastructure — just add the SDK, no hardware changes
- Indian banking context built-in: transaction thresholds in ₹, UPI/NEFT patterns, new beneficiary risk (70% of UPI fraud involves first-time payees), time-of-day risk based on Indian banking activity distributions
- Scalable to SBI's 100Cr+ customer base with horizontal backend scaling and per-user isolated pipeline contexts

---

This positions AEGIS-X not just as a fraud detection tool, but as an intelligent engagement layer — one that knows when to protect, when to assist, when to verify, and when to get out of the way.
