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
    // Pass through all responses â€” let the store handle filtering
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
  const SCAM_CYCLE = 22
  const MALWARE_CYCLE = 12

  const tick = () => {
    if (stopped) return
    step++
    let event: Record<string, any>
    let txAmount = 0
    let isNewBen = false
    const t = Date.now() / 1000

    if (scenario === 'normal') {
      const phase = step % 24
      event = generateNormalEvent()
      if (phase <= 3) {
        event.typing_speed_cps = 0.5 + Math.sin(t * 0.2) * 0.3 + Math.random() * 0.5
        event.interaction_intensity = Math.round(2 + Math.random() * 3)
        event.scroll_speed_mean = 0.6 + Math.sin(t * 0.4) * 0.3
      } else if (phase <= 7) {
        event.interaction_intensity = Math.round(7 + Math.sin(t * 0.6) * 3 + Math.random() * 3)
        event.touch_duration_mean = 80 + Math.random() * 30
        event.swipe_velocity_mean = 1.2 + Math.sin(t * 0.3) * 0.3
      } else if (phase <= 11) {
        event.typing_speed_cps = 3.2 + Math.sin(t * 1.1) * 0.8 + Math.random() * 0.8
        event.typing_rhythm_variance = 28 + Math.sin(t * 0.7) * 10
        event.interaction_intensity = Math.round(9 + Math.random() * 4)
        txAmount = Math.round(1500 + Math.sin(step * 0.2) * 1000 + Math.random() * 2000)
      } else if (phase <= 14) {
        event.typing_speed_cps = 0.8 + Math.random() * 0.4
        event.scroll_speed_mean = 0.25 + Math.random() * 0.15
        event.touch_duration_mean = 135 + Math.random() * 30
        txAmount = Math.round(2000 + Math.random() * 2500)
      } else if (phase <= 18) {
        event.scroll_speed_mean = 0.7 + Math.sin(t * 0.5) * 0.3
        event.interaction_intensity = Math.round(4 + Math.random() * 3)
      } else {
        event.interaction_intensity = Math.round(1 + Math.random() * 2)
        event.gyroscope_variance = 0.01 + Math.sin(t * 0.2) * 0.005
      }

    } else if (scenario === 'scam') {
      const cs = ((step - 1) % SCAM_CYCLE) + 1
      const cycleVar = Math.sin(Math.floor(step / SCAM_CYCLE) * 1.7) * 0.04

      if (cs <= 4) {
        event = generateNormalEvent()
        event.interaction_intensity = Math.round(5 + Math.sin(t * 0.3) * 2 + Math.random() * 2)
        txAmount = 0
      } else if (cs <= 7) {
        const confusion = (cs - 4) / 3 + cycleVar
        event = generateScamEvent(Math.max(0, confusion * 0.25))
        event.typing_speed_cps = Math.max(0.8, 2.8 - confusion * 1.5 + Math.sin(t * 0.9) * 0.3)
        event.hesitation_ratio = 0.12 + confusion * 0.15 + Math.random() * 0.05
        event.hesitation_count = Math.round(2 + confusion * 4)
        event.gyroscope_variance = 0.018 + confusion * 0.012
        txAmount = cs >= 7 ? 30000 : 0
        isNewBen = cs >= 7
      } else if (cs <= 10) {
        const anxiety = (cs - 7) / 3 + cycleVar
        event = generateScamEvent(0.25 + anxiety * 0.2)
        event.typing_speed_cps = Math.max(0.6, 1.6 - anxiety * 0.6)
        event.correction_rate = 0.08 + anxiety * 0.15
        event.hesitation_ratio = 0.25 + anxiety * 0.15
        event.hesitation_count = Math.round(5 + anxiety * 4)
        event.gyroscope_variance = 0.025 + anxiety * 0.018
        event.touch_duration_mean = 155 + anxiety * 70
        event.typing_rhythm_variance = 50 + anxiety * 70
        txAmount = Math.round(80000 + anxiety * 70000)
        isNewBen = true
      } else if (cs <= 14) {
        const panic = (cs - 10) / 4 + cycleVar
        event = generateScamEvent(0.45 + panic * 0.3)
        event.typing_speed_cps = Math.max(0.3, 0.9 - panic * 0.4)
        event.typing_rhythm_variance = 120 + panic * 180 + Math.sin(t * 1.5) * 30
        event.correction_rate = 0.25 + panic * 0.25
        event.hesitation_ratio = 0.45 + panic * 0.2
        event.hesitation_count = Math.round(9 + panic * 7)
        event.gyroscope_variance = 0.045 + panic * 0.035
        event.touch_duration_mean = 230 + panic * 120
        event.interaction_intensity = Math.max(1, Math.round(2 - panic))
        txAmount = Math.round(200000 + panic * 150000)
        isNewBen = true
      } else if (cs <= 18) {
        const coercion = (cs - 14) / 4
        event = generateScamEvent(0.8 + coercion * 0.15)
        event.typing_speed_cps = 0.3 + Math.random() * 0.15
        event.typing_rhythm_variance = 280 + Math.random() * 100
        event.correction_rate = 0.45 + Math.random() * 0.15
        event.hesitation_ratio = 0.7 + coercion * 0.15
        event.hesitation_count = Math.round(14 + Math.random() * 5)
        event.gyroscope_variance = 0.08 + Math.random() * 0.04
        event.interaction_intensity = 1
        event.scroll_speed_mean = 0.01
        txAmount = Math.round(350000 + Math.random() * 100000)
        isNewBen = true
      } else {
        const recovery = (cs - 18) / (SCAM_CYCLE - 18)
        event = generateNormalEvent()
        event.hesitation_ratio = 0.3 * (1 - recovery) + 0.06 * recovery
        event.correction_rate = 0.15 * (1 - recovery) + 0.03 * recovery
        event.gyroscope_variance = 0.04 * (1 - recovery) + 0.014 * recovery
        event.typing_speed_cps = 1.5 * (1 - recovery) + 3.5 * recovery
        event.typing_rhythm_variance = 80 * (1 - recovery) + 35 * recovery
        txAmount = 0
      }

    } else {
      const cs = ((step - 1) % MALWARE_CYCLE) + 1

      if (cs <= 3) {
        event = generateNormalEvent()
        event.interaction_intensity = Math.round(5 + Math.sin(t * 0.4) * 2 + Math.random() * 2)
        txAmount = 0
      } else if (cs <= 5) {
        const injection = (cs - 3) / 2
        const human = generateNormalEvent()
        const bot = generateMalwareEvent()
        event = {} as Record<string, any>
        for (const key of Object.keys(human)) {
          const hv = (human as any)[key]; const bv = (bot as any)[key]
          if (typeof hv === 'number' && typeof bv === 'number') {
            const flicker = Math.random() < 0.35 ? 1.0 : injection
            ;(event as any)[key] = hv * (1 - flicker) + bv * flicker
          } else { (event as any)[key] = injection > 0.5 ? bv : hv }
        }
        event.gyroscope_variance = 0.01 * (1 - injection) + 0.0002 * injection
        txAmount = cs === 5 ? 180000 : 0
        isNewBen = cs === 5
      } else if (cs <= 9) {
        event = generateMalwareEvent()
        const cycle = Math.sin(cs * 0.8 + t * 0.3)
        event.typing_speed_cps = 9.2 + cycle * 0.5
        event.swipe_velocity_mean = 2.35 + cycle * 0.15
        if (Math.random() < 0.12) {
          event.typing_speed_cps = 6.5 + Math.random() * 1.5
          event.typing_rhythm_variance = 4 + Math.random() * 3
        }
        txAmount = Math.round(400000 + Math.random() * 100000)
        isNewBen = true
      } else {
        const recovery = (cs - 9) / (MALWARE_CYCLE - 9)
        const human = generateNormalEvent()
        const bot = generateMalwareEvent()
        event = {} as Record<string, any>
        for (const key of Object.keys(human)) {
          const hv = (human as any)[key]; const bv = (bot as any)[key]
          if (typeof hv === 'number' && typeof bv === 'number') {
            ;(event as any)[key] = bv * (1 - recovery) + hv * recovery
          } else { (event as any)[key] = recovery > 0.5 ? hv : bv }
        }
        event.gyroscope_variance = 0.0002 * (1 - recovery) + 0.014 * recovery
        txAmount = 0
      }
    }

    wsConnection.send(event, txAmount, isNewBen)
  }

  return {
    start: () => { step = 0; stopped = false; intervalId = setInterval(tick, intervalMs); tick() },
    stop: () => { stopped = true; if (intervalId) clearInterval(intervalId); intervalId = null },
    getStep: () => step,
  }
}
