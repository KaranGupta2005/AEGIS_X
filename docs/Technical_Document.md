# AEGIS-X Technical Document
## Continuous Behavioral Monitoring SDK + Adaptive Learning Architecture

> **Version:** 4.0 — Continuous Monitoring + Adaptive Behavioral Learning  
> **Project:** AEGIS-X — Behavioral Identity Verification for Next-Gen Banking  
> **Submitted for:** DFS & IBA Cyber Security PSBs Hackathon Series 2026

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Why Continuous Monitoring?](#2-why-continuous-monitoring)
3. [SDK Lifecycle Architecture](#3-sdk-lifecycle-architecture)
4. [SDK Internal State Machine](#4-sdk-internal-state-machine)
5. [Behavioral Data Collection](#5-behavioral-data-collection)
6. [Feature Windows](#6-feature-windows)
7. [Trust Timeline](#7-trust-timeline)
8. [Backend Session Manager](#8-backend-session-manager)
9. [Frontend Trust Dashboard](#9-frontend-trust-dashboard)
10. [API Reference](#10-api-reference)
11. [Engineering Principles](#11-engineering-principles)
12. [Security Considerations](#12-security-considerations)

---

## 1. Executive Summary

AEGIS-X v3.0 transforms from a **transaction-only behavioral observer** into a **session-level behavioral intelligence platform**. The SDK now activates at application launch and maintains continuous awareness throughout the entire user session — from the moment the app opens to the moment it closes.

### What changed

| Dimension | v2.0 (Transaction Monitor) | v3.0 (Continuous Monitor) |
|---|---|---|
| SDK activation | On payment initiation | On application launch |
| Monitoring scope | Transfer screens only | Every screen, always |
| Trust baseline | Built at payment time | Built from first interaction |
| Behavioral context | 16 features at payment | 25+ features + navigation + session |
| Trust timeline | Payment-scoped | Full session lifecycle |
| SDK state | Implicit (on/off) | Explicit state machine (6 states) |
| Screen awareness | None | Full navigation path tracking |
| Idle detection | None | Active idle time measurement |
| Session summary | End-of-payment | End-of-session with full history |

---

## 2. Why Continuous Monitoring?

### The fundamental problem with transaction-only monitoring

A payment-only behavioral monitor sees only the last 30 seconds of a user session. This is like a bank security guard who only checks your face when you're at the cashier — and ignores you for the 10 minutes you were wandering the branch looking confused.

**Attackers exploit this gap.** Social engineering attacks (scam calls), remote access malware, and account takeover operations all begin their behavioral footprint long before the payment screen appears.

### What continuous monitoring sees that transaction monitoring misses

**1. Cognitive drift before payment**

A user under a scam call begins showing elevated hesitation and erratic touch patterns on the home screen — 3 minutes before they reach the transfer screen. Transaction-only monitoring arrives too late.

**2. Navigation anomalies**

A legitimate user navigates: Home → History → Bills → Transfer.  
A compromised account navigates: Home → Transfer (direct, 2 seconds flat).  
Continuous monitoring detects the missing pre-transaction exploration that real users exhibit.

**3. Idle/active ratio**

A malware bot has near-zero idle time. It processes screens with mechanical regularity. A human user pauses, reads, re-reads. The idle ratio over a full session is a powerful fraud signal that only exists when you monitor from launch.

**4. Behavioral baseline quality**

The more behavioral windows the system has before a transaction, the more accurate the cosine similarity comparison against the user's enrolled baseline. 15 windows (30 seconds) of pre-transaction monitoring produces a far more confident identity assertion than 3 windows captured mid-payment.

**5. Trust momentum**

A trust score of 0.85 carries different meaning depending on its history:
- Trajectory A: 0.95 → 0.92 → 0.88 → 0.85 (declining, concerning)
- Trajectory B: 0.72 → 0.78 → 0.82 → 0.85 (recovering, reassuring)

Continuous monitoring provides the temporal context to distinguish these. Transaction-only monitoring sees only the final value.

---

## 3. SDK Lifecycle Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     APPLICATION LAUNCH                          │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  SDK INITIALIZATION                                             │
│  ─────────────────────────────────────────────────────────────  │
│  • WebSocket opened to /ws/{userId}                             │
│  • DOM listeners attached (keydown, scroll, mousemove, touch)   │
│  • 2-second window timer started                                │
│  • Device context collected (screen, browser, timezone)         │
│  • Session object created with start timestamp                  │
│  • SDK transitions: INITIALIZING → OBSERVING                    │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  SESSION CREATION (Backend)                                     │
│  ─────────────────────────────────────────────────────────────  │
│  • EventProcessor.start_session() called                        │
│  • Behavioral baseline loaded from storage (384-dim vector)     │
│  • PipelineContext created (CUSUM, history buffers)             │
│  • Redis state restored if crash-recovery available             │
│  • Session metadata initialized (start time, screen, SDK state) │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  CONTINUOUS MONITORING  [every 2 seconds]                       │
│  ─────────────────────────────────────────────────────────────  │
│  • Raw events accumulated: keystrokes, scrolls, mouse, touch    │
│  • Every 2s: aggregate → BehaviorWindow (25 features)           │
│  • Window transmitted over WebSocket (no raw events sent)       │
│  • Trust pipeline executes: 11 steps, target < 100ms            │
│  • Trust score T(t) computed and returned to SDK                │
│  • Session timeline updated with screen + trust + SDK state     │
│  • Dashboard broadcast: every window reaches all monitors       │
│                                                                 │
│  SDK state: OBSERVING (windows 1–4) → LEARNING (window 5+)     │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  BEHAVIOR LEARNING                                              │
│  ─────────────────────────────────────────────────────────────  │
│  • Behavioral similarity converges to enrolled baseline         │
│  • CUSUM drift detector accumulates reference distribution      │
│  • Isolation Forest anomaly detector warms up sample buffer     │
│  • Behavior confidence score rises toward 1.0                   │
│  • Trust score stabilizes — high-quality identity assertion     │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  TRANSACTION MONITORING                                         │
│  ─────────────────────────────────────────────────────────────  │
│  • SDK transitions: LEARNING → TRANSACTION                      │
│  • Transaction context injected: amount, beneficiary, category  │
│  • TransactionScorer applies amount/beneficiary risk penalties  │
│  • DecisionService override rules activate for high-value tx    │
│  • Trust already warm — no cold-start problem                   │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  ADAPTIVE VERIFICATION                                          │
│  ─────────────────────────────────────────────────────────────  │
│  • SDK transitions: TRANSACTION → VERIFYING                     │
│  • PIN/OTP/Biometric screen detected via notifyScreenChange()   │
│  • Behavioral patterns during verification recorded             │
│  • STEP_UP result logged against session timeline               │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  SESSION END                                                    │
│  ─────────────────────────────────────────────────────────────  │
│  • SDK transitions: any → FINISHED                              │
│  • DOM listeners detached                                       │
│  • Window timer stopped                                         │
│  • Final screen time accumulated                                │
│  • SessionSummary object generated                              │
│  • Backend: end_session() called, Redis state cleared           │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  SESSION SUMMARY                                                │
│  ─────────────────────────────────────────────────────────────  │
│  • Total duration (active + idle breakdown)                     │
│  • Windows collected                                            │
│  • Full navigation path                                         │
│  • Time-per-screen map                                          │
│  • Transaction count                                            │
│  • Final trust score                                            │
│  • Total alerts generated                                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. SDK Internal State Machine

The SDK maintains an explicit state machine with six states. State transitions are validated — invalid transitions are rejected with a console warning.

```
                    ┌─────────────┐
                    │ INITIALIZING│  ◄─ App launch
                    └──────┬──────┘
                           │ initialize()
                           ▼
                    ┌─────────────┐
                    │  OBSERVING  │  ◄─ Monitoring, no baseline yet
                    └──┬────┬─────┘
         5 windows ▼   │    │ setTransactionContext()
                    │   │    ▼
             ┌──────┴──┐  ┌─────────────┐
             │ LEARNING │  │ TRANSACTION │  ◄─ Payment flow entered
             └──┬───────┘  └──────┬──────┘
                │                 │ PIN/OTP screen
                │                 ▼
                │          ┌─────────────┐
                │          │  VERIFYING  │  ◄─ Step-up verification
                │          └──────┬──────┘
                │                 │
                └────────┬────────┘
                         │ success / home
                         ▼
                    ┌─────────────┐
                    │  OBSERVING  │  ◄─ Back to passive monitoring
                    └──────┬──────┘
                           │ endSession()
                           ▼
                    ┌─────────────┐
                    │  FINISHED   │  ◄─ Terminal state
                    └─────────────┘
```

### State descriptions

| State | Meaning | Trust weight context |
|---|---|---|
| `INITIALIZING` | SDK booting, no DOM listeners yet | No windows emitted |
| `OBSERVING` | Active monitoring, building baseline | Windows emitted, trust computed |
| `LEARNING` | Enough windows for confident comparison | Behavioral similarity converging |
| `TRANSACTION` | Payment flow active | Transaction scoring penalties active |
| `VERIFYING` | Step-up verification screen | Cognitive patterns during verification recorded |
| `FINISHED` | Session ended, cleanup complete | No windows emitted |

---

## 5. Behavioral Data Collection

The SDK attaches the following DOM listeners immediately on `initialize()`:

| Event | Data collected | Computed features |
|---|---|---|
| `keydown` | Key timestamps, Backspace count | typing_speed_cps, hesitation_ratio, correction_rate |
| `keyup` | Key hold duration | touch_duration_mean, touch_duration_variance |
| `scroll` | Scroll timestamps, direction | scroll_speed_mean, scroll_direction_changes |
| `mousemove` | Pointer x/y coordinates (sampled 50ms) | pointer_velocity, swipe_straightness |
| `touchstart` | Touch contact area, timestamp | touch_area_mean |
| `touchend` | Touch duration | touch_duration_mean |
| `visibilitychange` | Tab focus/blur | idle_ratio, idleTimeMs |

### Navigation context (injected by banking app)

The banking app calls `aegisSDK.notifyScreenChange(screen)` on every navigation event. The SDK:
- Records time spent on the previous screen
- Updates `currentScreen`, `previousScreen`, `navigationPath`
- Triggers state transitions when transaction/verification screens are entered
- Includes `current_screen`, `time_on_current_screen`, `navigation_depth` in every window

### Transaction context (injected by banking app)

The banking app calls `aegisSDK.setTransactionContext(ctx)` when payment details change:

```typescript
aegisSDK.setTransactionContext({
  amount: 85000,
  beneficiary: 'Rahul Verma',
  category: 'transfer',
  paymentMethod: 'UPI',
  isNewBeneficiary: true,
  frequency: 1,
})
```

This automatically transitions the SDK from `OBSERVING/LEARNING` to `TRANSACTION`.

---

## 6. Feature Windows

Every **2 seconds**, the SDK aggregates raw DOM events into a `BehaviorWindow`. Raw events are never transmitted — only the aggregated window.

### Window structure (25+ features)

```typescript
BehaviorWindow {
  // Identity
  windowId: number          // Monotonically increasing session counter
  timestamp: number         // Unix ms
  sdkState: SDKState        // Current SDK state machine state

  // Typing biometrics
  typing_speed_cps          // Characters per second in this window
  typing_rhythm_variance    // Key-flight-time variance (ms²)
  typing_pressure_mean      // Estimated hold force [0–1]
  correction_rate           // Backspace / total keys
  hesitation_ratio          // Pauses > 2s / total keys
  hesitation_count          // Absolute pause count
  backspace_rate            // Redundant alias for correction_rate

  // Touch / swipe
  swipe_velocity_mean       // Mean pointer speed [0–5 normalized]
  swipe_velocity_variance   // Variance of pointer speed
  swipe_straightness        // Direct distance / total path [0–1]
  touch_duration_mean       // Mean key/touch hold time (ms)
  touch_duration_variance   // Variance of hold times (ms²)
  touch_area_mean           // Mean touch contact area [0–1]

  // Scroll
  scroll_speed_mean         // Scroll events × 40 / 100
  scroll_direction_changes  // Direction reversals in window

  // Pointer (web-specific)
  pointer_velocity          // Mouse velocity [0–5]
  pointer_straightness      // Mouse path straightness [0–1]

  // Motion / device
  gyroscope_variance        // Approximated from pointer on web

  // Session signals
  session_time_elapsed      // Seconds since session start
  interaction_intensity     // Keys + pointer moves + scrolls + touches
  idle_ratio                // idleTimeMs / totalElapsedMs

  // Navigation context
  current_screen            // Active screen name
  navigation_depth          // Total screens visited so far
  time_on_current_screen    // Seconds on current screen

  // Temporal context
  hour_of_day               // 0–23
  day_of_week               // 0–6

  // Transaction context
  transaction_amount        // Active transaction ₹ (0 if not in payment)
  is_new_beneficiary        // Whether recipient is unknown
  transaction_category      // 'transfer' | 'bill' | 'recharge' | 'idle' | …
  transaction_count         // Transactions this session
}
```

### Transmission format

Windows are transmitted as the existing 16-feature backend event (backward compatible) plus an `sdk_context` extension block:

```json
{
  "type": "behavioral_event",
  "event": { ...16 core features... },
  "transaction_amount": 85000,
  "is_new_beneficiary": true,
  "sdk_context": {
    "sdk_state": "TRANSACTION",
    "current_screen": "review",
    "navigation_depth": 4,
    "time_on_screen": 12.4,
    "idle_ratio": 0.08,
    "hour_of_day": 14,
    "day_of_week": 1,
    "transaction_category": "transfer",
    "transaction_count": 1,
    "window_id": 23
  }
}
```

---

## 7. Trust Timeline

Trust evolves through every screen of the session. Each behavioral window contributes to T(t) regardless of whether a transaction is in progress.

### Example session trust trajectory

```
Launch          Dashboard       History         Bills           Transfer        PIN             Success
  │                │               │               │               │               │               │
  ▼                ▼               ▼               ▼               ▼               ▼               ▼
0.97─────────────0.96────────────0.95────────────0.94──────────[TX START]──────[VERIFY]────────0.93
                                                                  ↓ amount penalty applied
                                                               0.87──────────0.84──────────────0.91
```

**Key insight:** By the time the user reaches the transfer screen, the system already has 10–20 windows of behavioral history. This provides:

1. **Higher similarity confidence** — more samples compared against baseline
2. **Drift detection accuracy** — CUSUM has enough reference data to distinguish genuine drift from natural variance
3. **Cognitive trajectory** — the system knows if the user was calm on the dashboard and panicking only at the transfer screen (scam indicator) vs. calm throughout (legitimate)
4. **Idle ratio context** — a 15-second session jumping straight to transfer is suspicious; a 4-minute browsing session is normal

### Trust formula (unchanged, now applied continuously)

```
T(t) = 0.40 × behavioral_similarity    (cosine vs. 384-dim baseline)
     + 0.20 × device_trust             (known device, no VPN/root)
     + 0.20 × transaction_normality    (amount, beneficiary, time, frequency)
     + 0.20 × cognitive_stability      (Random Forest: calm/focused/distressed/…)

effective_trust = T(t) − drift_penalty
drift_penalty: none=0, low=0.05, medium=0.10, high=0.18, critical=0.30
```

During non-transaction windows, `transaction_normality = 1.0` (neutral), so the behavioral and cognitive components dominate.

---

## 8. Backend Session Manager

### Continuous session state (new in v3.0)

`EventProcessor` now tracks the following per-user continuous state alongside the existing pipeline context:

```python
# Per-user continuous session metadata
_session_start_times: Dict[str, datetime]     # App launch timestamp
_current_screens: Dict[str, str]              # Active screen name
_sdk_states: Dict[str, str]                   # SDK state machine state
_current_activities: Dict[str, str]           # Human-readable activity label
_session_timelines: Dict[str, List[Dict]]     # Per-window timeline (max 200)
_decision_histories: Dict[str, List[Dict]]    # Every ALLOW/STEP_UP/BLOCK decision
_trust_histories: Dict[str, List[float]]      # Trust score per window
_navigation_paths: Dict[str, List[str]]       # Ordered screen history (max 50)
```

### Session start (on app launch, not payment initiation)

```python
processor.start_session(user_id, session_id)
# → Loads 384-dim baseline
# → Creates PipelineContext
# → Initializes all continuous state dicts
# → Returns: {sdk_state: "OBSERVING", started_at: "...", has_baseline: true}
```

### Per-window processing

```python
processor.process_behavioral_event(
    user_id=user_id,
    raw_event=feature_dict,           # 16 core features
    transaction_amount=0.0,           # 0 if not in payment
    is_new_beneficiary=False,
    sdk_context={                     # Optional enrichment from continuous SDK
        "sdk_state": "LEARNING",
        "current_screen": "history",
        "navigation_depth": 3,
        ...
    }
)
```

### Session end response

```python
{
    "status": "ended",
    "total_events": 47,
    "total_alerts": 2,
    "final_trust_score": 0.9142,
    "duration_seconds": 183.4,
    "screens_visited": ["home", "history", "bills", "transfer", "pin", "success"],
    "total_timeline_entries": 47,
    "total_decisions": 47,
    "was_blocked": false,
    "drift_detected": false
}
```

---

## 9. Frontend Trust Dashboard

The Trust Dashboard (AegisConsole) now has five tabs instead of four, with the new **Session** tab displaying continuous monitoring intelligence.

### Tab structure

| Tab | Content |
|---|---|
| **Trust** | Risk signal breakdown, temporal dynamics (velocity/acceleration/entropy), decision engine output |
| **Session** *(new)* | SDK state badge, current screen, live activity label, session duration, windows collected, behavior confidence bar, live session timeline |
| **Cognitive** | Cognitive state panel, behavioral biometrics, SDK monitoring panel |
| **Fraud** | Intent vector radar (coercion/takeover/malware/anomaly), threat probability bars |
| **Events** | Live behavior window stream, pipeline health metrics |

### SDK State Badge

Every view in the console shows a live SDK state badge that pulses when the SDK is actively observing/learning:

```
● OBSERVING    (blue pulse)
● LEARNING     (purple pulse)
● TRANSACTION  (amber, no pulse)
● VERIFYING    (red, no pulse)
```

### Session Timeline (in Session tab)

The timeline renders the last 8 windows as a vertical list showing:
- Screen visited
- Trust score at that window
- SDK state at that window
- Timestamp

This makes it immediately visible when trust declined on a specific screen or when the SDK transitioned into TRANSACTION state.

### Dashboard state fields (new)

```typescript
SessionState {
  // Existing fields preserved unchanged...
  
  // New continuous monitoring fields
  sdkState: SDKState                    // Current SDK state machine state
  liveActivity: {
    currentActivity: string             // "In transaction — Reviewing transfer"
    currentPage: AppScreen              // Active screen
    sessionDurationMs: number           // Elapsed since launch
    activeTimeMs: number                // Non-idle time
    idleTimeMs: number                  // Idle time
    collectedWindows: number            // Total windows sent
    behaviorConfidence: number          // 0–1, converges to 1.0
  }
}
```

---

## 10. API Reference

### Existing endpoints (backward compatible, unchanged)

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/session/start` | Start session (now called at app launch) |
| `POST` | `/api/v1/session/end` | End session with summary |
| `POST` | `/api/v1/event` | Single window via REST |
| `GET` | `/api/v1/session/{uid}` | Session status + continuous fields |
| `GET` | `/api/v1/session/{uid}/history` | Trust score history |
| `GET` | `/api/v1/session/{uid}/alerts` | Session alerts |
| `GET` | `/api/v1/sessions` | Active session list |
| `WS` | `/ws/{userId}` | SDK bidirectional stream |
| `WS` | `/ws/dashboard` | Dashboard broadcast receiver |

### New continuous monitoring endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/session/{uid}/summary` | Rich continuous session summary |
| `GET` | `/api/v1/session/{uid}/timeline` | Full window-by-window session timeline |
| `GET` | `/api/v1/sessions/overview` | All active sessions with live stats |

### Session summary response

```json
{
  "user_id": "user_42",
  "session_id": "sess_a3f8b2c1",
  "sdk_state": "OBSERVING",
  "current_screen": "home",
  "current_activity": "Observing — Browsing home",
  "duration_seconds": 127.4,
  "event_count": 63,
  "navigation_path": ["home", "history", "bills", "transfer", "pin", "success", "home"],
  "trust_history": [0.9701, 0.9688, 0.9712, ...],
  "timeline_length": 63,
  "total_alerts": 0,
  "total_decisions": 63
}
```

### SDK context block (WebSocket extension)

```json
{
  "type": "behavioral_event",
  "event": { "typing_speed_cps": 3.6, "...": "..." },
  "transaction_amount": 0.0,
  "is_new_beneficiary": false,
  "sdk_context": {
    "sdk_state": "LEARNING",
    "current_screen": "history",
    "navigation_depth": 2,
    "time_on_screen": 8.2,
    "idle_ratio": 0.04,
    "hour_of_day": 11,
    "day_of_week": 1,
    "transaction_category": "idle",
    "transaction_count": 0,
    "window_id": 7
  }
}
```

---

## 11. Engineering Principles

### Modular architecture preserved

All refactoring respects existing module boundaries:

```
dashboard/src/services/
  sdk/
    AegisBehavioralSDK.ts    ← NEW: Core SDK class + types + singleton
    useAegisSDK.ts           ← NEW: React integration hook
  store.ts                   ← Extended: sdkState + liveActivity fields
  StoreProvider.tsx          ← Refactored: SDK init on mount, not on connect
  api.ts                     ← Extended: session_context in TrustUpdate type

backend/
  schemas/requests.py        ← Extended: SDKContext optional field
  services/event_processor.py ← Extended: continuous session state tracking
  api/monitor_routes.py      ← Extended: 3 new continuous monitoring endpoints
  api/event_routes.py        ← Extended: forwards sdk_context to processor
  main.py                    ← Extended: sdk_context extracted in WS handler
```

### Zero breaking changes

- All existing API contracts are preserved
- `sdk_context` is **optional** in every endpoint — existing integrations continue working
- All existing store fields remain; new fields are additive
- The `BehavioralEventRequest` schema is backward compatible

### Low CPU / memory footprint

| Mechanism | Cost | How minimized |
|---|---|---|
| DOM event listeners | Near zero | Passive listeners; no heavy computation on event |
| 2-second aggregation | ~0.2ms per flush | Simple arithmetic on small arrays |
| Mouse sampling | Sampled every 50ms max | `mousePositions` array capped implicitly by flush interval |
| Session timeline | Bounded memory | Capped at 200 entries in-memory per user |
| Navigation path | Bounded memory | Capped at 50 entries per user |
| Redis persistence | Low I/O | Only every 5 windows; no per-event writes |

### TypeScript throughout SDK

The entire SDK layer is strictly typed:
- `SDKState` union type with compile-time exhaustiveness checks
- `BehaviorWindow` interface with all 25+ fields typed
- `VALID_TRANSITIONS` map enforces state machine rules at runtime
- `windowToBackendEvent()` converter maintains type safety at the API boundary

---

## 12. Security Considerations

### Data minimization

Raw DOM events (individual keystrokes, exact mouse coordinates) are **never transmitted** to the backend. Only the 2-second aggregated `BehaviorWindow` is sent. This means:
- No keystroke logging
- No screen recording
- No exact cursor paths
- Timing patterns are aggregated, not individual

### SDK context trust

The `sdk_context` block sent by the frontend is treated as **untrusted metadata** by the backend. It is used for:
- Session timeline enrichment (screen labels, SDK state annotations)
- Dashboard display

It is **not** used to influence trust scores or security decisions. The trust pipeline operates solely on the 16 behavioral features; `sdk_context` is cosmetic context only.

### WebSocket rate limiting

The existing per-user token bucket rate limiter (5 events/second, burst 10) applies to all WebSocket messages including continuous monitoring windows. At one window every 2 seconds, the SDK operates at 10% of the rate limit, providing a large safety margin against floods.

### Session isolation

Each user session has its own isolated `PipelineContext`. There is no cross-user state. Redis keys are namespaced by `user_id`. Session end triggers complete cleanup of all in-memory and Redis state.

---

*AEGIS-X v3.0 — Continuous Behavioral Monitoring SDK*  
*Built for enterprise banking. Designed for zero-friction security.*


---

## 13. Adaptive Behavioral Learning System

### 13.1 Architecture Overview

AEGIS-X v4.0 replaces the static single-embedding baseline with a **continuously evolving behavioral profile** that learns gradually from trusted sessions while being resistant to model poisoning attacks.

```
┌─────────────────────────────────────────────────────────────────┐
│           ADAPTIVE LEARNING ARCHITECTURE                        │
└─────────────────────────────────────────────────────────────────┘

 Session Completed
       │
       ▼
 ┌─────────────┐     ┌──────────────────┐
 │  GATE 1     │ No  │ SDK marked       │
 │  SDK flag?  │────→│ "Do Not Learn"   │→ OBSERVE
 └──────┬──────┘     └──────────────────┘
        │ Yes
        ▼
 ┌─────────────┐     ┌──────────────────┐
 │  GATE 2     │ No  │ Too few windows  │
 │  ≥5 windows?│────→│ (< 5 windows)    │→ REJECT
 └──────┬──────┘     └──────────────────┘
        │ Yes
        ▼
 ┌─────────────┐     ┌──────────────────┐
 │  GATE 3     │ No  │ Trust < 70%      │
 │  Trust≥70%? │────→│ Quarantine       │→ REJECT
 └──────┬──────┘     └──────────────────┘
        │ Yes
        ▼
 ┌─────────────┐     ┌──────────────────┐
 │  GATE 4     │ No  │ Trust 70–90%     │
 │  Trust≥90%? │────→│ Record only      │→ OBSERVE
 └──────┬──────┘     └──────────────────┘
        │ Yes
        ▼
 ┌─────────────┐     ┌──────────────────┐
 │  GATE 5     │ No  │ Rate limit       │
 │  Rate OK?   │────→│ ≤3 updates/hour  │→ OBSERVE
 └──────┬──────┘     └──────────────────┘
        │ Yes
        ▼
 ┌─────────────┐     ┌──────────────────┐
 │  GATE 6     │ No  │ Embedding outside│
 │  Within 2σ? │────→│ profile variance │→ OBSERVE
 └──────┬──────┘     └──────────────────┘
        │ Yes
        ▼
 ┌─────────────┐     ┌──────────────────┐
 │  GATE 7     │ No  │ Drift too severe │
 │  No hi-drift│────→│ during session   │→ OBSERVE
 └──────┬──────┘     └──────────────────┘
        │ Yes
        ▼
 ┌──────────────────────────────────────┐
 │  ALL GATES PASSED → UPDATE PROFILE   │
 │  • EMA update (adaptive decay)       │
 │  • Version incremented               │
 │  • Thresholds re-computed            │
 │  • Confidence updated                │
 │  • Previous version preserved        │
 └──────────────────────────────────────┘
```

### 13.2 BehaviorProfile Structure

The `BehaviorProfile` replaces the single 384-dim embedding with a complete identity model:

| Component | Description | Dimensions |
|---|---|---|
| `composite_baseline` | Primary behavioral identity centroid | 384-dim, L2-normalized |
| `typing_baseline` | Keystroke dynamics sub-profile | 384-dim |
| `touch_baseline` | Touch/swipe dynamics sub-profile | 384-dim |
| `navigation_baseline` | Navigation pattern centroid | 384-dim |
| `voice_embedding` | Voice print (future) | 512-dim |
| `face_embedding` | Face template (future) | 128-dim |
| `embedding_mean` | Running mean of all trusted embeddings | 384-dim |
| `embedding_std` | Running std dev (Welford's algorithm) | 384-dim |
| `adaptive_thresholds` | Per-user personalized decision thresholds | 4 params |
| `trust_history` | Aggregated trust score statistics | mean/min/variance |
| `confidence` | Profile quality confidence | [0, 1] |
| `maturity_score` | Profile stability metric | [0, 1] |
| `version` | Monotonically increasing version number | integer |

### 13.3 Confidence-Based Learning Policy

| Trust Score | Decision | Action |
|---|---|---|
| > 90% | **LEARN** | Update profile gradually via weighted EMA |
| 70–90% | **OBSERVE** | Record session, do not update profile |
| < 70% | **REJECT** | Store separately for audit, never touch baseline |

### 13.4 Adaptive EMA Decay (Anti-Stale Protection)

The EMA decay factor adapts to profile maturity:

| Profile Maturity | Decay | Learning Rate | Meaning |
|---|---|---|---|
| < 5 sessions | 0.85 | 0.15 | Fast convergence for new users |
| 5–15 sessions | 0.90 | 0.10 | Moderate learning |
| 15–30 sessions | 0.93 | 0.07 | Careful adaptation |
| 30+ sessions | 0.96 | 0.04 | Highly stable, slow drift |

Formula: `new_baseline = decay × old_baseline + (1 − decay) × session_embedding`

### 13.5 Personalized Adaptive Thresholds

Global fixed thresholds penalize users with natural behavioral variance. AEGIS-X v4.0 computes per-user thresholds based on:

- **Historical consistency**: Users with tight behavioral distributions get tighter thresholds
- **Behavioral variance**: Users with natural variance (elderly, disability, device changes) get looser thresholds
- **Profile maturity**: Young profiles use conservative defaults; mature profiles use learned thresholds

```python
# Adaptive similarity threshold: [0.70, 0.88] based on user consistency
similarity_allow = 0.70 + consistency_factor × 0.18

# Drift sensitivity adapts proportionally
drift_sensitivity = 0.5 + consistency_factor × 1.0
```

This ensures:
- A fast typist isn't flagged because they differ from the average
- An elderly user isn't blocked because their touch patterns have higher variance
- A user switching devices sees a natural re-convergence, not a BLOCK

### 13.6 Anti-Poisoning Protections

| Protection | Mechanism | Why |
|---|---|---|
| Trust gate | Profile only updates when T(t) > 90% | Attacker can't update during compromised sessions |
| Rate limiting | Max 3 updates/hour | Prevents rapid baseline shifting via replay attacks |
| Consistency gate | New embedding must be within 2σ of profile distribution | Catches dramatic behavioral shifts even at high trust |
| Drift gate | No update during high-severity CUSUM drift | Behavioral instability = potential transition period |
| Version history | Every update creates a new version, old preserved | Full rollback capability |
| Minimum length | Session must have ≥5 windows | Short injected sessions can't poison |

### 13.7 Versioned Storage (No Overwrites)

Every profile update creates a new version. Previous versions are never deleted:

```
embeddings/profiles/
  user_42/
    v1.npz    ← initial enrollment
    v2.npz    ← first adaptation
    v3.npz    ← second adaptation
    ...
    v17.npz   ← current
    latest.npz ← symlink to v17
```

Rollback is always possible:
```python
service.rollback_profile("user_42", target_version=15)
```

### 13.8 Explainability

Every learning decision produces a human-readable explanation:

**LEARN example:**
> "Profile updated: v12 → v13. Trust 94.2%, similarity 0.9812. EMA decay=0.04. Profile maturity: 0.93."

**OBSERVE example:**
> "Session observed but not learned. Trust score 78.5% in observation zone (70%–90%). Profile unchanged at version 12."

**REJECT example:**
> "Session rejected for learning. Trust score 42.1% below minimum threshold (70%). Cognitive state: panicked. Profile remains at version 12."

### 13.9 Database Schema

```sql
CREATE TABLE behavior_profiles (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id),
    version INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    composite_baseline_blob TEXT,
    typing_baseline_blob TEXT,
    touch_baseline_blob TEXT,
    navigation_baseline_blob TEXT,
    embedding_mean_blob TEXT,
    embedding_std_blob TEXT,
    embedding_samples INTEGER DEFAULT 0,
    confidence FLOAT DEFAULT 0.0,
    maturity_score FLOAT DEFAULT 0.0,
    mean_trust_score FLOAT DEFAULT 0.95,
    adaptive_thresholds JSON DEFAULT '{}',
    total_sessions INTEGER DEFAULT 0,
    trusted_sessions INTEGER DEFAULT 0,
    rejected_sessions INTEGER DEFAULT 0,
    update_count INTEGER DEFAULT 0,
    learning_decision VARCHAR(16),
    learning_reason TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE (user_id, version)
);

CREATE TABLE learning_audit_logs (
    id VARCHAR(64) PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT now(),
    user_id VARCHAR(64) NOT NULL REFERENCES users(id),
    session_id VARCHAR(64) NOT NULL,
    decision VARCHAR(16) NOT NULL,
    reason TEXT NOT NULL,
    explanation TEXT,
    trust_score FLOAT NOT NULL,
    similarity FLOAT NOT NULL,
    drift_detected BOOLEAN DEFAULT FALSE,
    consistency_check_passed BOOLEAN DEFAULT TRUE,
    rate_limit_ok BOOLEAN DEFAULT TRUE,
    session_windows INTEGER DEFAULT 0,
    old_version INTEGER,
    new_version INTEGER,
    profile_updated BOOLEAN DEFAULT FALSE
);
```

### 13.10 SDK Learning Signal

The SDK marks each behavioral window with a `is_learning_candidate` boolean:

- **`true`**: SDK is in OBSERVING or LEARNING state, user is active (not idle)
- **`false`**: SDK is in TRANSACTION/VERIFYING/FINISHED state, or user is idle

The SDK **never modifies the behavioral profile directly**. This flag is advisory only — the backend's AdaptiveLearningService makes all final learning decisions based on its 7-gate evaluation pipeline.

### 13.11 Dashboard: Adaptive Learning Section

The Cognitive tab in the AEGIS-X Console now includes an "Adaptive Learning" section showing:

- **Profile Version**: Current version number (e.g., v17)
- **Learning Confidence**: How well the behavioral baseline is established (0–100%)
- **Learning Status**: ENROLLING / LEARNING / STABLE
- **Adaptive Threshold**: Current per-user similarity threshold (0.70–0.88)
- **Session Learning**: Whether the current session will LEARN / OBSERVE / REJECT

### 13.12 API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/profile/{user_id}` | Get full adaptive profile metadata |
| `POST` | `/api/v1/profile/{user_id}/rollback` | Roll back to previous version |

---

*AEGIS-X v4.0 — Adaptive Behavioral Learning with Anti-Poisoning Guarantees*  
*Production-grade continuous authentication for enterprise banking.*
