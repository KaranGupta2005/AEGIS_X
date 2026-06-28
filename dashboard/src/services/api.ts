const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || ''
const API_BASE = `${BACKEND_URL}/api/v1`
const WS_PROTOCOL = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
const WS_HOST = import.meta.env.VITE_BACKEND_URL
  ? new URL(import.meta.env.VITE_BACKEND_URL).host
  : `${window.location.hostname}:8000`
const WS_BASE = `${WS_PROTOCOL}//${WS_HOST}`

// Wake up Render backend on page load (free tier sleeps after 15 min)
if (BACKEND_URL) {
  fetch(`${BACKEND_URL}/`).catch(() => {})
}

export interface TrustUpdate {
  type: string
  user_id: string
  session_id: string
  timestamp: string
  trust_score: number
  effective_trust: number
  decision: string
  trust_level: string
  similarity: number
  cognitive_state: string
  cognitive_stability: number
  drift_detected: boolean
  drift_severity: string
  anomaly: {
    score: number
    is_anomaly: boolean
  }
  fraud: {
    probability: number
    trajectory: string
    intent_vector: {
      coercion_probability: number
      takeover_probability: number
      anomaly_severity: number
      robotic_probability: number
    }
  }
  temporal: {
    velocity: number
    acceleration: number
    trend: string
    entropy: number
  }
  reasons: string[]
  explanation: string
  alerts: Array<{
    severity: string
    message: string
    cognitive_state: string
    trust_score: number
    decision: string
    timestamp: string
  }>
  event_number: number
  latency_ms: number
  confidence: number
}

export interface SessionInfo {
  user_id: string
  session_id: string
  has_baseline: boolean
  status: string
}

export async function startSession(userId: string): Promise<SessionInfo> {
  const res = await fetch(`${API_BASE}/session/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId }),
  })
  return res.json()
}

export async function endSession(userId: string) {
  const res = await fetch(`${API_BASE}/session/end`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId }),
  })
  return res.json()
}

export async function getSessionStatus(userId: string) {
  const res = await fetch(`${API_BASE}/session/${userId}`)
  if (!res.ok) return null
  return res.json()
}

export async function getTrustHistory(userId: string) {
  const res = await fetch(`${API_BASE}/session/${userId}/history`)
  if (!res.ok) return null
  return res.json()
}

export async function getSessionAlerts(userId: string) {
  const res = await fetch(`${API_BASE}/session/${userId}/alerts`)
  if (!res.ok) return null
  return res.json()
}

export async function getActiveSessions() {
  const res = await fetch(`${API_BASE}/sessions`)
  return res.json()
}

export async function getExplanation(params: {
  trust_score: number
  similarity: number
  cognitive_state: string
  cognitive_stability: number
  drift_detected?: boolean
  drift_severity?: string
  transaction_score?: number
  velocity?: number
  entropy?: number
  decision?: string
}) {
  const query = new URLSearchParams(
    Object.entries(params).map(([k, v]) => [k, String(v)])
  ).toString()
  const res = await fetch(`${API_BASE}/audit/explain?${query}`, { method: 'POST' })
  return res.json()
}

export async function getSessionSummary(userId: string) {
  const res = await fetch(`${API_BASE}/audit/session/${userId}/summary`)
  if (!res.ok) return null
  return res.json()
}

export type SimulatorScenario = 'normal' | 'scam' | 'malware'

export function createWebSocket(userId: string, onMessage: (data: TrustUpdate) => void, onClose?: () => void) {
  const ws = new WebSocket(`${WS_BASE}/ws/${userId}`)

  ws.onopen = () => {
    console.log(`[AEGIS-X] WebSocket connected for ${userId}`)
  }

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data)
    // Pass through all responses — let the store handle filtering
    onMessage(data as TrustUpdate)
  }

  ws.onclose = () => {
    console.log(`[AEGIS-X] WebSocket closed for ${userId}`)
    onClose?.()
  }

  ws.onerror = (err) => {
    console.error(`[AEGIS-X] WebSocket error:`, err)
  }

  return {
    send: (event: Record<string, any>, txAmount = 0, isNewBeneficiary = false) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'behavioral_event',
          event,
          transaction_amount: txAmount,
          is_new_beneficiary: isNewBeneficiary,
        }))
      }
    },
    close: () => ws.close(),
    ws,
  }
}

function generateNormalEvent() {
  const t = Date.now() / 1000
  const wave1 = Math.sin(t * 0.3) * 0.15
  const wave2 = Math.cos(t * 0.7) * 0.08
  const jitter = () => (Math.random() - 0.5)
  return {
    typing_speed_cps: 3.6 + wave1 + jitter() * 0.8,
    typing_rhythm_variance: 35 + wave2 * 20 + jitter() * 12,
    typing_pressure_mean: 0.54 + jitter() * 0.08,
    swipe_velocity_mean: 1.1 + wave1 * 0.3 + jitter() * 0.2,
    swipe_velocity_variance: 0.13 + Math.abs(jitter()) * 0.06,
    swipe_straightness: 0.80 + jitter() * 0.06,
    touch_duration_mean: 115 + wave2 * 30 + jitter() * 20,
    touch_duration_variance: 550 + jitter() * 100,
    touch_area_mean: 0.44 + jitter() * 0.05,
    hesitation_ratio: Math.max(0, 0.07 + wave1 * 0.03 + jitter() * 0.04),
    hesitation_count: Math.max(0, Math.round(1 + jitter() * 1.5)),
    correction_rate: Math.max(0, 0.03 + Math.abs(wave2) * 0.02 + jitter() * 0.02),
    scroll_speed_mean: 0.75 + wave1 * 0.2 + jitter() * 0.15,
    gyroscope_variance: Math.max(0.001, 0.014 + jitter() * 0.006),
    session_time_elapsed: 80 + Math.random() * 60,
    interaction_intensity: Math.max(1, Math.round(7 + wave1 * 3 + jitter() * 3)),
  }
}

function generateScamEvent(stress: number) {
  const t = Date.now() / 1000
  const panic = Math.sin(t * 1.2) * 0.2
  const surge = Math.random() < 0.15 ? 0.3 : 0
  const s = Math.min(1, stress + panic * 0.3 + surge)
  return {
    typing_speed_cps: Math.max(0.3, 1.8 - s * 1.0 + Math.sin(t * 0.8) * 0.3),
    typing_rhythm_variance: 60 + s * 250 + Math.random() * 50,
    typing_pressure_mean: 0.65 + s * 0.25 + (Math.random() - 0.5) * 0.08,
    swipe_velocity_mean: Math.max(0.05, 0.45 - s * 0.35 + Math.random() * 0.1),
    swipe_velocity_variance: 0.18 + s * 0.4 + Math.random() * 0.1,
    swipe_straightness: Math.max(0.2, 0.65 - s * 0.3 + (Math.random() - 0.5) * 0.1),
    touch_duration_mean: 160 + s * 200 + Math.sin(t * 1.5) * 30,
    touch_duration_variance: 700 + s * 3500 + Math.random() * 500,
    touch_area_mean: 0.50 + s * 0.15 + (Math.random() - 0.5) * 0.04,
    hesitation_ratio: Math.min(0.95, 0.25 + s * 0.55 + panic * 0.15),
    hesitation_count: Math.round(3 + s * 10 + Math.random() * 3),
    correction_rate: Math.min(0.7, 0.12 + s * 0.45 + surge * 0.2),
    scroll_speed_mean: Math.max(0.02, 0.25 - s * 0.2 + Math.random() * 0.05),
    gyroscope_variance: 0.02 + s * 0.08 + Math.random() * 0.02,
    session_time_elapsed: 200 + s * 300 + Math.random() * 60,
    interaction_intensity: Math.max(1, Math.round(3.5 - s * 2 + Math.random() * 1.5)),
  }
}

function generateMalwareEvent() {
  const t = Date.now() / 1000
  const glitch = Math.random() < 0.08 ? (Math.random() - 0.5) * 0.5 : 0
  const micro = () => (Math.random() - 0.5) * 0.003
  return {
    typing_speed_cps: 9.2 + Math.sin(t * 0.4) * 0.4 + micro() * 10 + glitch,
    typing_rhythm_variance: 1.0 + Math.abs(micro()) * 100 + Math.random() * 0.8,
    typing_pressure_mean: 0.50 + micro() * 5,
    swipe_velocity_mean: 2.35 + Math.cos(t * 0.3) * 0.1 + micro() * 10,
    swipe_velocity_variance: Math.max(0.0001, micro() * 2 + 0.003),
    swipe_straightness: Math.min(1, 0.992 + micro()),
    touch_duration_mean: 46 + Math.sin(t * 0.6) * 3 + micro() * 200,
    touch_duration_variance: 3 + Math.random() * 2.5,
    touch_area_mean: 0.40 + micro() * 3,
    hesitation_ratio: Math.max(0, micro() * 2 + 0.002),
    hesitation_count: Math.random() < 0.05 ? 1 : 0,
    correction_rate: Math.max(0, micro() + 0.001),
    scroll_speed_mean: 1.75 + Math.sin(t * 0.5) * 0.08,
    gyroscope_variance: Math.max(0.00005, Math.abs(micro()) * 0.5),
    session_time_elapsed: 15 + Math.random() * 8 + Math.sin(t * 0.2) * 3,
    interaction_intensity: Math.round(17 + Math.sin(t * 0.8) * 3 + Math.random() * 2),
  }
}

export function createSimulator(
  scenario: SimulatorScenario,
  wsConnection: ReturnType<typeof createWebSocket>,
  intervalMs = 2000
) {
  let step = 0
  let intervalId: ReturnType<typeof setInterval> | null = null
  let stopped = false

  const tick = () => {
    if (stopped) return
    step++
    let event: Record<string, any>
    let txAmount = 0
    let isNewBen = false

    if (scenario === 'normal') {
      // NORMAL: Infinite loop through realistic banking activities
      // Cycles through phases every ~20 steps to keep the demo lively
      const phase = step % 20

      event = generateNormalEvent()
      const t = Date.now() / 1000

      if (phase <= 3) {
        // Idle browsing — checking balance, reading notifications
        event.typing_speed_cps = 0.5 + Math.random() * 0.8
        event.interaction_intensity = Math.round(2 + Math.random() * 3)
        event.scroll_speed_mean = 0.6 + Math.sin(t * 0.5) * 0.3 + Math.random() * 0.3
        event.hesitation_ratio = 0.04 + Math.random() * 0.04
        event.touch_duration_mean = 90 + Math.random() * 25
        txAmount = 0
      } else if (phase <= 6) {
        // Active navigation — opening menus, selecting options
        event.interaction_intensity = Math.round(8 + Math.random() * 5)
        event.touch_duration_mean = 85 + Math.random() * 30
        event.swipe_velocity_mean = 1.3 + Math.random() * 0.4
        event.scroll_speed_mean = 1.0 + Math.random() * 0.5
        event.hesitation_ratio = 0.05 + Math.random() * 0.03
        txAmount = 0
      } else if (phase <= 10) {
        // Typing session — entering amount, searching contacts
        event.typing_speed_cps = 3.5 + Math.sin(t * 0.8) * 0.8 + Math.random() * 1.0
        event.typing_rhythm_variance = 30 + Math.random() * 20
        event.interaction_intensity = Math.round(10 + Math.random() * 5)
        event.correction_rate = 0.02 + Math.random() * 0.03
        event.hesitation_ratio = 0.06 + Math.random() * 0.04
        txAmount = Math.round(1000 + Math.random() * 4000)
      } else if (phase <= 13) {
        // Review + confirm — slower, reading carefully
        event.typing_speed_cps = 1.0 + Math.random() * 0.5
        event.interaction_intensity = Math.round(4 + Math.random() * 3)
        event.scroll_speed_mean = 0.3 + Math.random() * 0.2
        event.hesitation_ratio = 0.08 + Math.random() * 0.04
        event.touch_duration_mean = 130 + Math.random() * 30
        txAmount = Math.round(2000 + Math.random() * 3000)
      } else if (phase <= 16) {
        // Post-transaction — checking confirmation, balance
        event.typing_speed_cps = 0.8 + Math.random() * 0.5
        event.interaction_intensity = Math.round(3 + Math.random() * 2)
        event.scroll_speed_mean = 0.5 + Math.random() * 0.3
        event.hesitation_ratio = 0.03 + Math.random() * 0.02
        txAmount = 0
      } else {
        // Casual browsing — mini statement, offers
        event.scroll_speed_mean = 0.9 + Math.sin(t * 0.3) * 0.3 + Math.random() * 0.3
        event.interaction_intensity = Math.round(5 + Math.random() * 3)
        event.typing_speed_cps = 0.3 + Math.random() * 0.5
        event.hesitation_ratio = 0.04 + Math.random() * 0.03
        txAmount = 0
      }

    } else if (scenario === 'scam') {
      // SCAM: Slow dramatic 7-phase escalation (more events before BLOCK)
      // Total ~18-20 events before full coercion — gives judges time to SEE the story
      //
      // Phase 1 (steps 1-3):   Normal calm usage (before the call comes)
      // Phase 2 (steps 4-6):   Phone rings — distraction, pauses
      // Phase 3 (steps 7-9):   "I'm calling from your bank" — confusion, hesitation
      // Phase 4 (steps 10-12): "Your account is compromised" — anxiety builds
      // Phase 5 (steps 13-15): "Transfer to safe account NOW" — panic, trembling
      // Phase 6 (steps 16-18): "Police will arrest you" — full panic, corrections
      // Phase 7 (steps 19+):   Coerced obedience — dictation speed, frozen

      if (step <= 3) {
        // PHASE 1: Calm normal usage
        event = generateNormalEvent()
        event.session_time_elapsed = step * 30
        txAmount = 0
      } else if (step <= 6) {
        // PHASE 2: Phone rings — attention splits, slight pauses
        const distraction = (step - 3) / 3 // 0.33 → 1.0
        event = generateNormalEvent()
        event.hesitation_ratio = 0.10 + distraction * 0.10
        event.hesitation_count = Math.round(2 + distraction * 2)
        event.interaction_intensity = Math.max(2, Math.round(6 - distraction * 3))
        event.typing_speed_cps = Math.max(1.5, 3.0 - distraction * 1.2)
        event.session_time_elapsed = step * 30
        txAmount = 0
      } else if (step <= 9) {
        // PHASE 3: "I'm from SBI Fraud Dept" — confusion, uncertainty
        const confusion = (step - 6) / 3
        event = generateScamEvent(confusion * 0.2)
        event.typing_speed_cps = Math.max(1.0, 2.2 - confusion * 0.8)
        event.hesitation_ratio = 0.18 + confusion * 0.12
        event.hesitation_count = Math.round(4 + confusion * 3)
        event.correction_rate = 0.05 + confusion * 0.08
        event.gyroscope_variance = 0.016 + confusion * 0.008
        event.session_time_elapsed = step * 30
        txAmount = 0
      } else if (step <= 12) {
        // PHASE 4: "Your account has suspicious activity" — anxiety
        const anxiety = (step - 9) / 3
        event = generateScamEvent(0.2 + anxiety * 0.2)
        event.typing_speed_cps = Math.max(0.8, 1.8 - anxiety * 0.7)
        event.hesitation_ratio = 0.28 + anxiety * 0.12
        event.hesitation_count = Math.round(5 + anxiety * 4)
        event.correction_rate = 0.10 + anxiety * 0.12
        event.gyroscope_variance = 0.025 + anxiety * 0.015
        event.touch_duration_mean = 150 + anxiety * 60
        event.typing_rhythm_variance = 55 + anxiety * 60
        event.session_time_elapsed = step * 30
        txAmount = step >= 11 ? Math.round(50000 + anxiety * 50000) : 0
        isNewBen = step >= 11
      } else if (step <= 15) {
        // PHASE 5: "Transfer ₹2L to this safe account immediately" — panic onset
        const panic = (step - 12) / 3
        event = generateScamEvent(0.4 + panic * 0.25)
        event.typing_speed_cps = Math.max(0.5, 1.2 - panic * 0.5)
        event.typing_rhythm_variance = 100 + panic * 120
        event.correction_rate = 0.20 + panic * 0.18
        event.hesitation_ratio = 0.40 + panic * 0.15
        event.hesitation_count = Math.round(8 + panic * 5)
        event.gyroscope_variance = 0.035 + panic * 0.025
        event.touch_duration_mean = 200 + panic * 80
        event.interaction_intensity = Math.max(1, Math.round(3 - panic * 1.5))
        event.session_time_elapsed = step * 30
        txAmount = Math.round(150000 + panic * 100000)
        isNewBen = true
      } else if (step <= 18) {
        // PHASE 6: "Police case filed, transfer or arrested" — full panic
        const terror = (step - 15) / 3
        event = generateScamEvent(0.65 + terror * 0.2)
        event.typing_speed_cps = Math.max(0.3, 0.8 - terror * 0.4)
        event.typing_rhythm_variance = 200 + terror * 150
        event.correction_rate = 0.35 + terror * 0.2
        event.hesitation_ratio = 0.55 + terror * 0.15
        event.hesitation_count = Math.round(12 + terror * 6)
        event.gyroscope_variance = 0.06 + terror * 0.03
        event.touch_duration_mean = 280 + terror * 100
        event.touch_duration_variance = 2500 + terror * 2000
        event.interaction_intensity = 1
        event.scroll_speed_mean = 0.05
        event.session_time_elapsed = step * 30
        txAmount = Math.round(250000 + terror * 100000)
        isNewBen = true
      } else {
        // PHASE 7: Full coercion — robotic obedience under duress
        const depth = Math.min(1, (step - 18) / 4)
        event = generateScamEvent(0.85 + depth * 0.1)
        event.typing_speed_cps = 0.3 + Math.random() * 0.2
        event.typing_rhythm_variance = 320 + Math.random() * 80
        event.correction_rate = 0.5 + Math.random() * 0.15
        event.hesitation_ratio = 0.75 + Math.random() * 0.15
        event.hesitation_count = Math.round(16 + Math.random() * 4)
        event.gyroscope_variance = 0.09 + Math.random() * 0.04
        event.interaction_intensity = 1
        event.scroll_speed_mean = 0.01
        event.swipe_velocity_mean = 0.05
        event.touch_duration_mean = 400 + Math.random() * 100
        event.session_time_elapsed = step * 30
        txAmount = Math.round(400000 + Math.random() * 100000)
        isNewBen = true
      }

    } else {
      // MALWARE: Quick but visible transition from human to bot
      // Phase 1 (steps 1-2):   Normal user (genuine session start)
      // Phase 2 (steps 3-4):   RAT injection — behavior flickers
      // Phase 3 (steps 5-6):   Bot stabilizing — near-zero variance emerges
      // Phase 4 (steps 7+):    Full automated control — inhuman precision

      if (step <= 2) {
        // Genuine user just logged in
        event = generateNormalEvent()
        event.session_time_elapsed = step * 15
        txAmount = 0
      } else if (step <= 4) {
        // RAT INJECTING: Sudden behavioral glitches — uncanny valley
        const injection = (step - 2) / 2 // 0.5 → 1.0
        const human = generateNormalEvent()
        const bot = generateMalwareEvent()
        event = {} as Record<string, any>
        for (const key of Object.keys(human)) {
          const hv = (human as any)[key]
          const bv = (bot as any)[key]
          if (typeof hv === 'number' && typeof bv === 'number') {
            // Jerky transition — not smooth, with random flickers
            const flicker = Math.random() < 0.3 ? 1.0 : injection
            ;(event as any)[key] = hv * (1 - flicker) + bv * flicker
          } else {
            ;(event as any)[key] = injection > 0.5 ? bv : hv
          }
        }
        event.gyroscope_variance = 0.012 * (1 - injection) + 0.0005 * injection
        event.typing_rhythm_variance = 35 * (1 - injection) + 1.5 * injection
        event.session_time_elapsed = step * 15
        txAmount = step === 4 ? 150000 : 0
        isNewBen = step === 4
      } else if (step <= 6) {
        // BOT STABILIZING: Almost fully machine, tiny human remnants
        event = generateMalwareEvent()
        const remnant = (7 - step) / 4 // small human trace fading
        event.typing_rhythm_variance = 1.5 + remnant * 8
        event.gyroscope_variance = 0.0003 + remnant * 0.002
        event.hesitation_ratio = remnant * 0.02
        event.session_time_elapsed = step * 15
        txAmount = Math.round(250000 + Math.random() * 100000)
        isNewBen = true
      } else {
        // FULL BOT: Inhuman precision, repeating pattern
        event = generateMalwareEvent()
        // Subtle periodic pattern (bot script cycling)
        const cycle = Math.sin(step * 0.5) * 0.1
        event.typing_speed_cps = 9.5 + cycle
        event.swipe_velocity_mean = 2.4 + cycle * 0.5
        event.touch_duration_mean = 44 + cycle * 5
        // Occasional recalibration glitch (10% chance)
        if (Math.random() < 0.1) {
          event.typing_speed_cps = 7.0 + Math.random() * 1.5
          event.typing_rhythm_variance = 4 + Math.random() * 3
          event.hesitation_ratio = 0.01
        }
        event.session_time_elapsed = step * 15
        txAmount = Math.round(450000 + Math.random() * 50000 + step * 5000)
        isNewBen = true
      }
    }

    wsConnection.send(event, txAmount, isNewBen)
  }

  return {
    start: () => {
      step = 0
      stopped = false
      intervalId = setInterval(tick, intervalMs)
      tick()
    },
    stop: () => {
      stopped = true
      if (intervalId) clearInterval(intervalId)
      intervalId = null
    },
    getStep: () => step,
  }
}
