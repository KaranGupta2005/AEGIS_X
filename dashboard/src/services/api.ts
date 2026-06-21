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
  return {
    typing_speed_cps: 3.8 + (Math.random() - 0.5) * 0.6,
    typing_rhythm_variance: 38 + (Math.random() - 0.5) * 8,
    typing_pressure_mean: 0.55 + (Math.random() - 0.5) * 0.06,
    swipe_velocity_mean: 1.2 + (Math.random() - 0.5) * 0.16,
    swipe_velocity_variance: 0.14 + (Math.random() - 0.5) * 0.04,
    swipe_straightness: 0.82 + (Math.random() - 0.5) * 0.04,
    touch_duration_mean: 120 + (Math.random() - 0.5) * 16,
    touch_duration_variance: 580 + (Math.random() - 0.5) * 70,
    touch_area_mean: 0.45 + (Math.random() - 0.5) * 0.04,
    hesitation_ratio: Math.max(0, 0.08 + (Math.random() - 0.5) * 0.03),
    hesitation_count: Math.max(0, Math.round(1 + (Math.random() - 0.5) * 0.8)),
    correction_rate: Math.max(0, 0.04 + (Math.random() - 0.5) * 0.015),
    scroll_speed_mean: 0.8 + (Math.random() - 0.5) * 0.12,
    gyroscope_variance: Math.max(0.001, 0.015 + (Math.random() - 0.5) * 0.004),
    session_time_elapsed: 90 + (Math.random() - 0.5) * 30,
    interaction_intensity: Math.max(1, Math.round(8 + (Math.random() - 0.5) * 2)),
  }
}

function generateScamEvent(stress: number) {
  return {
    typing_speed_cps: Math.max(0.5, 1.5 - stress * 0.6),
    typing_rhythm_variance: 55 + stress * 200,
    typing_pressure_mean: 0.68 + stress * 0.2,
    swipe_velocity_mean: Math.max(0.1, 0.5 - stress * 0.3),
    swipe_velocity_variance: 0.2 + stress * 0.35,
    swipe_straightness: Math.max(0.3, 0.68 - stress * 0.25),
    touch_duration_mean: 180 + stress * 150,
    touch_duration_variance: 800 + stress * 3000,
    touch_area_mean: 0.52 + stress * 0.12,
    hesitation_ratio: Math.min(0.9, 0.3 + stress * 0.5),
    hesitation_count: Math.round(4 + stress * 8),
    correction_rate: Math.min(0.6, 0.15 + stress * 0.4),
    scroll_speed_mean: Math.max(0.05, 0.3 - stress * 0.2),
    gyroscope_variance: 0.025 + stress * 0.06,
    session_time_elapsed: 250 + stress * 200,
    interaction_intensity: Math.max(1, Math.round(4 - stress * 2)),
  }
}

function generateMalwareEvent() {
  return {
    typing_speed_cps: 9.5 + (Math.random() - 0.5) * 0.15,
    typing_rhythm_variance: 1.2 + Math.random() * 0.5,
    typing_pressure_mean: 0.50 + (Math.random() - 0.5) * 0.01,
    swipe_velocity_mean: 2.4 + (Math.random() - 0.5) * 0.06,
    swipe_velocity_variance: Math.max(0.001, Math.random() * 0.005),
    swipe_straightness: Math.min(1, 0.99 + (Math.random() - 0.5) * 0.005),
    touch_duration_mean: 48 + (Math.random() - 0.5) * 4,
    touch_duration_variance: 4 + Math.random() * 2,
    touch_area_mean: 0.40 + (Math.random() - 0.5) * 0.006,
    hesitation_ratio: Math.max(0, Math.random() * 0.005),
    hesitation_count: 0,
    correction_rate: Math.max(0, Math.random() * 0.002),
    scroll_speed_mean: 1.8 + (Math.random() - 0.5) * 0.04,
    gyroscope_variance: Math.max(0.0001, Math.random() * 0.0006),
    session_time_elapsed: 20 + (Math.random() - 0.5) * 4,
    interaction_intensity: Math.round(18 + Math.random() * 4),
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
      txAmount = step > 8 ? 2000 : 0
    } else if (scenario === 'scam') {
      const stress = Math.min(1, step / 10)
      event = step <= 3 ? generateNormalEvent() : generateScamEvent(stress)
      txAmount = step > 3 ? 200000 : 0
      isNewBen = step > 3
    } else {
      event = step <= 2 ? generateNormalEvent() : generateMalwareEvent()
      txAmount = step > 2 ? 500000 : 0
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
