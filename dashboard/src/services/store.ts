import React, { createContext, useContext, useReducer, useCallback, useRef, useEffect } from 'react'
import { TrustUpdate, createWebSocket, createSimulator, SimulatorScenario } from './api'

export interface TimelineEntry {
  time: string
  trust: number
  similarity: number
  cognitive_state: string
  decision: string
  drift_detected: boolean
  event_number: number
}

export interface AlertEntry {
  severity: string
  message: string
  timestamp: string
  trust_score: number
  cognitive_state: string
}

export interface SessionState {
  isConnected: boolean
  userId: string
  sessionId: string
  scenario: SimulatorScenario
  trustScore: number
  effectiveTrust: number
  decision: string
  trustLevel: string
  similarity: number
  cognitiveState: string
  cognitiveStability: number
  driftDetected: boolean
  driftSeverity: string
  velocity: number
  acceleration: number
  trend: string
  entropy: number
  eventCount: number
  latencyMs: number
  confidence: number
  reasons: string[]
  explanation: string
  alerts: AlertEntry[]
  timeline: TimelineEntry[]
  cognitiveHistory: string[]
}

const initialState: SessionState = {
  isConnected: false,
  userId: 'demo_user',
  sessionId: '',
  scenario: 'normal',
  trustScore: 95,
  effectiveTrust: 95,
  decision: 'ALLOW',
  trustLevel: 'high',
  similarity: 0.994,
  cognitiveState: 'calm',
  cognitiveStability: 1.0,
  driftDetected: false,
  driftSeverity: 'none',
  velocity: 0,
  acceleration: 0,
  trend: 'stable',
  entropy: 0,
  eventCount: 0,
  latencyMs: 0,
  confidence: 1,
  reasons: [],
  explanation: '',
  alerts: [],
  timeline: [],
  cognitiveHistory: [],
}

type Action =
  | { type: 'SET_CONNECTED'; payload: boolean }
  | { type: 'SET_SESSION'; payload: { userId: string; sessionId: string } }
  | { type: 'SET_SCENARIO'; payload: SimulatorScenario }
  | { type: 'TRUST_UPDATE'; payload: TrustUpdate }
  | { type: 'RESET' }

function reducer(state: SessionState, action: Action): SessionState {
  switch (action.type) {
    case 'SET_CONNECTED':
      return { ...state, isConnected: action.payload }
    case 'SET_SESSION':
      return { ...state, userId: action.payload.userId, sessionId: action.payload.sessionId }
    case 'SET_SCENARIO':
      return { ...initialState, scenario: action.payload, isConnected: state.isConnected }
    case 'TRUST_UPDATE': {
      const d = action.payload
      const ts = d.trust_score ?? d.effective_trust ?? state.trustScore
      const newEntry: TimelineEntry = {
        time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        trust: ts * 100,
        similarity: d.similarity ?? state.similarity,
        cognitive_state: d.cognitive_state ?? state.cognitiveState,
        decision: d.decision ?? state.decision,
        drift_detected: d.drift_detected ?? state.driftDetected,
        event_number: d.event_number ?? state.eventCount + 1,
      }
      const newAlerts: AlertEntry[] = (d.alerts || []).map((a: any) => ({
        severity: a.severity,
        message: a.message,
        timestamp: a.timestamp || new Date().toISOString(),
        trust_score: a.trust_score ?? ts,
        cognitive_state: a.cognitive_state ?? d.cognitive_state,
      }))
      return {
        ...state,
        trustScore: ts * 100,
        effectiveTrust: (d.effective_trust ?? ts) * 100,
        decision: d.decision ?? state.decision,
        trustLevel: d.trust_level ?? state.trustLevel,
        similarity: d.similarity ?? state.similarity,
        cognitiveState: d.cognitive_state ?? state.cognitiveState,
        cognitiveStability: d.cognitive_stability ?? state.cognitiveStability,
        driftDetected: d.drift_detected ?? state.driftDetected,
        driftSeverity: d.drift_severity ?? state.driftSeverity,
        velocity: d.temporal?.velocity ?? state.velocity,
        acceleration: d.temporal?.acceleration ?? state.acceleration,
        trend: d.temporal?.trend ?? state.trend,
        entropy: d.temporal?.entropy ?? state.entropy,
        eventCount: d.event_number ?? state.eventCount + 1,
        latencyMs: d.latency_ms ?? state.latencyMs,
        confidence: d.confidence ?? state.confidence,
        reasons: d.reasons ?? state.reasons,
        explanation: d.explanation ?? state.explanation,
        alerts: [...state.alerts, ...newAlerts].slice(-50),
        timeline: [...state.timeline, newEntry].slice(-100),
        cognitiveHistory: [...state.cognitiveHistory, d.cognitive_state ?? state.cognitiveState].slice(-50),
      }
    }
    case 'RESET':
      return { ...initialState, isConnected: state.isConnected }
    default:
      return state
  }
}

interface StoreContextType {
  state: SessionState
  dispatch: React.Dispatch<Action>
  connect: (scenario: SimulatorScenario) => void
  disconnect: () => void
  switchScenario: (scenario: SimulatorScenario) => void
}

export const StoreContext = createContext<StoreContextType>(null as any)

export function useStore() {
  return useContext(StoreContext)
}

export { initialState, reducer }
export type { Action }
