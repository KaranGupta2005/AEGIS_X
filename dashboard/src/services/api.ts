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
      // NORMAL: Realistic multi-phase banking session
      // Phase 1 (steps 1-3): Open app, browse dashboard
      // Phase 2 (steps 4-6): Navigate to transfer, pick beneficiary
      // Phase 3 (steps 7-9): Type amount, review
      // Phase 4 (steps 10+): Confirm, success, browse more
      event = generateNormalEvent()

      if (step <= 3) {
        // Browsing — light scrolling, no typing
        event.typing_speed_cps = 0.5 + Math.random() * 0.5
        event.interaction_intensity = Math.round(3 + Math.random() * 2)
        event.scroll_speed_mean = 0.8 + Math.random() * 0.4
      } else if (step <= 6) {
        // Navigating — tapping beneficiaries, some scrolling
        event.interaction_intensity = Math.round(6 + Math.random() * 3)
        event.touch_duration_mean = 100 + Math.random() * 30
        txAmount = 0
      } else if (step <= 9) {
        // Typing amount — focused typing burst
        event.typing_speed_cps = 4.0 + Math.random() * 1.0
        event.interaction_intensity = Math.round(10 + Math.random() * 4)
        event.hesitation_ratio = 0.05 + Math.random() * 0.03
        txAmount = Math.round(2000 + Math.random() * 3000)
      } else {
        // Confirmed — relaxed post-transaction browsing
        event.typing_speed_cps = 1.0 + Math.random() * 1.0
        event.interaction_intensity = Math.round(4 + Math.random() * 2)
        event.hesitation_ratio = 0.03 + Math.random() * 0.03
        txAmount = Math.round(1500 + Math.random() * 2000)
      }

    } else if (scenario === 'scam') {
      // SCAM: Dramatic 5-phase escalation with realistic emotional arc
      // Phase 1 (steps 1-2):  Normal browsing (before the call)
      // Phase 2 (steps 3-5):  Call received — confusion, slight hesitation
      // Phase 3 (steps 6-8):  Pressure builds — distressed, typing dictated numbers
      // Phase 4 (steps 9-11): Panic — high corrections, trembling, extreme hesitation
      // Phase 5 (steps 12+):  Full coercion — reading instructions, frozen

      if (step <= 2) {
        // PRE-CALL: Completely normal
        event = generateNormalEvent()
        txAmount = 0
      } else if (step <= 5) {
        // CALL RECEIVED: Confusion sets in, hesitation rises
        const confusion = (step - 2) / 3  // 0.33 → 1.0
        event = generateScamEvent(confusion * 0.3)
        // Specific: slower typing as they listen, more pauses
        event.typing_speed_cps = Math.max(0.8, 2.5 - confusion * 1.5)
        event.hesitation_ratio = 0.15 + confusion * 0.2
        event.hesitation_count = Math.round(3 + confusion * 4)
        event.gyroscope_variance = 0.02 + confusion * 0.015  // Hand slightly shaking
        txAmount = step > 4 ? 50000 : 0
        isNewBen = step > 4
      } else if (step <= 8) {
        // PRESSURE BUILDS: Being told their account is compromised
        const pressure = (step - 5) / 3  // 0.33 → 1.0
        event = generateScamEvent(0.3 + pressure * 0.35)
        // Typing what the caller dictates — slow, uncertain
        event.typing_speed_cps = Math.max(0.6, 1.5 - pressure * 0.8)
        event.correction_rate = 0.15 + pressure * 0.2  // Many mistakes
        event.hesitation_ratio = 0.35 + pressure * 0.2
        event.hesitation_count = Math.round(6 + pressure * 5)
        event.gyroscope_variance = 0.03 + pressure * 0.025  // Noticeable tremor
        event.touch_duration_mean = 180 + pressure * 120  // Pressing hard, freezing
        txAmount = Math.round(100000 + pressure * 100000)
        isNewBen = true
      } else if (step <= 11) {
        // PANIC: "Transfer NOW or police will arrest you"
        const panic = (step - 8) / 3
        event = generateScamEvent(0.65 + panic * 0.25)
        event.typing_speed_cps = Math.max(0.4, 1.0 - panic * 0.5)
        event.typing_rhythm_variance = 150 + panic * 200  // Extremely erratic
        event.correction_rate = 0.35 + panic * 0.25  // Constant mistakes
        event.hesitation_ratio = 0.55 + panic * 0.2  // Frozen between actions
        event.hesitation_count = Math.round(10 + panic * 8)
        event.gyroscope_variance = 0.05 + panic * 0.04  // Hands shaking badly
        event.touch_duration_mean = 250 + panic * 150  // Pressing and holding
        event.interaction_intensity = Math.max(1, Math.round(2 - panic))
        txAmount = Math.round(200000 + panic * 150000)
        isNewBen = true
      } else {
        // FULL COERCION: Frozen, obeying commands
        event = generateScamEvent(0.95)
        event.typing_speed_cps = 0.4 + Math.random() * 0.3  // Dictation speed
        event.typing_rhythm_variance = 300 + Math.random() * 100
        event.correction_rate = 0.5 + Math.random() * 0.15
        event.hesitation_ratio = 0.75 + Math.random() * 0.15
        event.hesitation_count = Math.round(15 + Math.random() * 5)
        event.gyroscope_variance = 0.08 + Math.random() * 0.04
        event.interaction_intensity = 1
        event.scroll_speed_mean = 0.02
        txAmount = Math.round(350000 + Math.random() * 150000)
        isNewBen = true
      }

    } else {
      // MALWARE: Instant flip from human to machine
      // Phase 1 (step 1):    Normal (user just opened app)
      // Phase 2 (steps 2-3): RAT activating — brief glitch, behavior shifts
      // Phase 3 (steps 4+):  Full bot control — inhuman precision

      if (step <= 1) {
        // User just opened the app normally
        event = generateNormalEvent()
        txAmount = 0
      } else if (step <= 3) {
        // RAT ACTIVATING: Behavior flickers between human and machine
        const botMix = (step - 1) / 2  // 0.5 → 1.0
        const normalPart = generateNormalEvent()
        const botPart = generateMalwareEvent()
        // Blend between normal and bot (uncanny valley)
        event = {} as Record<string, any>
        for (const key of Object.keys(normalPart)) {
          const nv = (normalPart as any)[key]
          const bv = (botPart as any)[key]
          if (typeof nv === 'number' && typeof bv === 'number') {
            (event as any)[key] = nv * (1 - botMix) + bv * botMix
          } else {
            (event as any)[key] = botMix > 0.5 ? bv : nv
          }
        }
        event.gyroscope_variance = 0.003 * (1 - botMix) + 0.0001 * botMix  // Device going flat
        txAmount = step === 3 ? 200000 : 0
        isNewBen = step === 3
      } else {
        // FULL BOT: Inhuman speed, zero variance, perfect geometry
        event = generateMalwareEvent()
        // Add subtle variations to show it's "trying" to look human but failing
        if (Math.random() < 0.1) {
          // Occasional micro-glitch (bot recalibrating)
          event.typing_speed_cps = 6.0 + Math.random() * 2
          event.typing_rhythm_variance = 3 + Math.random() * 2
        }
        txAmount = Math.round(400000 + Math.random() * 100000 + step * 10000)
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
