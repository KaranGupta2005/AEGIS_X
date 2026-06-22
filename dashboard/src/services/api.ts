const API_BASE = '/api/v1'
const WS_BASE = `ws://${window.location.hostname}:8000`

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
    if (data.type === 'trust_update' || data.trust_score !== undefined) {
      onMessage(data as TrustUpdate)
    }
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

  const tick = () => {
    step++
    let event: Record<string, any>
    let txAmount = 0
    let isNewBen = false

    if (scenario === 'normal') {
      event = generateNormalEvent()
      txAmount = step > 5 ? Math.round(1000 + Math.sin(step * 0.3) * 800 + Math.random() * 500) : 0
    } else if (scenario === 'scam') {
      // Evolving stress: oscillates, has spikes, never flat
      const baseStress = Math.min(0.85, step / 12)
      const oscillation = Math.sin(step * 0.4) * 0.15
      const spike = Math.random() < 0.12 ? 0.2 : 0
      const stress = Math.min(1, Math.max(0, baseStress + oscillation + spike))
      event = step <= 2 ? generateNormalEvent() : generateScamEvent(stress)
      txAmount = step > 3 ? Math.round(100000 + Math.random() * 200000 + step * 5000) : 0
      isNewBen = step > 3
    } else {
      // Malware: occasional "glitch" back to normal (trying to evade detection)
      const isEvasion = Math.random() < 0.08
      event = step <= 1 ? generateNormalEvent() : (isEvasion ? generateNormalEvent() : generateMalwareEvent())
      txAmount = step > 2 ? Math.round(300000 + Math.random() * 400000) : 0
      isNewBen = step > 2
    }

    wsConnection.send(event, txAmount, isNewBen)
  }

  return {
    start: () => {
      step = 0
      intervalId = setInterval(tick, intervalMs)
      tick()
    },
    stop: () => {
      if (intervalId) clearInterval(intervalId)
      intervalId = null
    },
    getStep: () => step,
  }
}
