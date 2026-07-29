import React, { createContext, useContext, useReducer, useCallback, useRef, useEffect } from 'react'
import { TrustUpdate, createWebSocket, createSimulator, SimulatorScenario } from './api'
import { SDKState, AppScreen } from './sdk/AegisBehavioralSDK'

export interface TimelineEntry {
  time: string
  trust: number
  similarity: number
  cognitive_state: string
  decision: string
  drift_detected: boolean
  event_number: number
  anomaly_score: number
  fraud_probability: number
  entropy: number
  velocity: number
  // Continuous monitoring additions
  sdk_state: SDKState
  current_screen: AppScreen
}

export interface AlertEntry {
  severity: string
  message: string
  timestamp: string
  trust_score: number
  cognitive_state: string
}

// ─── CONTINUOUS MONITORING STATE ────────────────────────────────────────────

export interface LiveSessionActivity {
  currentActivity: string          // human-readable description of what user is doing
  currentPage: AppScreen
  sessionDurationMs: number
  activeTimeMs: number
  idleTimeMs: number
  collectedWindows: number
  behaviorConfidence: number       // 0–1: how well the behavioral baseline is established
}

export interface SessionState {
  isConnected: boolean
  userId: string
  sessionId: string
  scenario: SimulatorScenario

  // ── Continuous monitoring (NEW) ──────────────────────────────────────
  sdkState: SDKState
  liveActivity: LiveSessionActivity
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
  anomalyScore: number
  isAnomaly: boolean
  fraudProbability: number
  fraudTrajectory: string
  intentVector: { coercion_probability: number; takeover_probability: number; anomaly_severity: number; robotic_probability: number }

  // Security containment
  securityState: string
  sandboxActive: boolean
  threatScore: number
}

const initialState: SessionState = {
  isConnected: false,
  userId: 'demo_user',
  sessionId: '',
  scenario: 'normal',

  // Continuous monitoring defaults
  sdkState: 'INITIALIZING',
  liveActivity: {
    currentActivity: 'Initializing',
    currentPage: 'launch',
    sessionDurationMs: 0,
    activeTimeMs: 0,
    idleTimeMs: 0,
    collectedWindows: 0,
    behaviorConfidence: 0,
  },

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
  anomalyScore: 0,
  isAnomaly: false,
  fraudProbability: 0,
  fraudTrajectory: 'stable',
  intentVector: { coercion_probability: 0, takeover_probability: 0, anomaly_severity: 0, robotic_probability: 0 },

  // Security containment defaults
  securityState: 'NORMAL',
  sandboxActive: false,
  threatScore: 0,
}

type Action =
  | { type: 'SET_CONNECTED'; payload: boolean }
  | { type: 'SET_SESSION'; payload: { userId: string; sessionId: string } }
  | { type: 'SET_SCENARIO'; payload: SimulatorScenario }
  | { type: 'TRUST_UPDATE'; payload: TrustUpdate }
  | { type: 'TRUST_UPDATE_SIMULATED'; payload: TrustUpdate }
  | { type: 'SDK_STATE_CHANGE'; payload: { sdkState: SDKState; currentScreen: AppScreen } }
  | { type: 'LIVE_ACTIVITY_UPDATE'; payload: Partial<LiveSessionActivity> }
  | { type: 'RESET' }

function reducer(state: SessionState, action: Action): SessionState {
  switch (action.type) {
    case 'SET_CONNECTED':
      return { ...state, isConnected: action.payload }
    case 'SET_SESSION':
      return { ...state, userId: action.payload.userId, sessionId: action.payload.sessionId }
    case 'SET_SCENARIO':
      return {
        ...initialState,
        scenario: action.payload,
        isConnected: state.isConnected,
        sdkState: state.sdkState,
        liveActivity: state.liveActivity,
      }
    case 'SDK_STATE_CHANGE':
      return {
        ...state,
        sdkState: action.payload.sdkState,
        liveActivity: {
          ...state.liveActivity,
          currentPage: action.payload.currentScreen,
          currentActivity: _describeActivity(action.payload.sdkState, action.payload.currentScreen),
        },
      }
    case 'LIVE_ACTIVITY_UPDATE':
      return {
        ...state,
        liveActivity: { ...state.liveActivity, ...action.payload },
      }
    case 'TRUST_UPDATE_SIMULATED': {
      // Simulated data adds to timeline AND updates security/containment state
      // (needed for sandbox overlay), but does NOT override behavioral trust values
      // from the live SDK. This ensures the console reflects real behavior while
      // still showing containment activation from simulator scenarios.
      const d = action.payload
      const ts = d.trust_score ?? d.effective_trust ?? state.trustScore / 100
      const newEntry: TimelineEntry = {
        time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        trust: ts * 100,
        similarity: d.similarity ?? state.similarity,
        cognitive_state: d.cognitive_state ?? state.cognitiveState,
        decision: d.decision ?? state.decision,
        drift_detected: d.drift_detected ?? state.driftDetected,
        event_number: d.event_number ?? state.eventCount + 1,
        anomaly_score: d.anomaly?.score ?? state.anomalyScore,
        fraud_probability: d.fraud?.probability ?? state.fraudProbability,
        entropy: d.temporal?.entropy ?? state.entropy,
        velocity: d.temporal?.velocity ?? state.velocity,
        sdk_state: state.sdkState,
        current_screen: state.liveActivity.currentPage,
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
        // Update trust score and key indicators from simulator (for demo visibility)
        trustScore: ts * 100,
        effectiveTrust: (d.effective_trust ?? ts) * 100,
        decision: d.decision ?? state.decision,
        cognitiveState: d.cognitive_state ?? state.cognitiveState,
        driftDetected: d.drift_detected ?? state.driftDetected,
        velocity: d.temporal?.velocity ?? state.velocity,
        // Security state ALWAYS updated (needed for containment overlay)
        securityState: d.security?.security_state ?? state.securityState,
        sandboxActive: d.security?.sandbox_active ?? state.sandboxActive,
        threatScore: d.security?.threat_score ?? state.threatScore,
        // Timeline and alerts
        alerts: [...state.alerts, ...newAlerts].slice(-50),
        timeline: [...state.timeline, newEntry].slice(-100),
        eventCount: d.event_number ?? state.eventCount + 1,
      }
    }
    case 'TRUST_UPDATE': {
      const d = action.payload
      const ts = d.trust_score ?? d.effective_trust ?? state.trustScore
      // Sync SDK state / screen from backend session_context if present
      const backendScreen = d.session_context?.current_screen ?? state.liveActivity.currentPage
      const backendSdkState = (d.session_context?.sdk_state as SDKState) ?? state.sdkState
      const newEntry: TimelineEntry = {
        time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        trust: ts * 100,
        similarity: d.similarity ?? state.similarity,
        cognitive_state: d.cognitive_state ?? state.cognitiveState,
        decision: d.decision ?? state.decision,
        drift_detected: d.drift_detected ?? state.driftDetected,
        event_number: d.event_number ?? state.eventCount + 1,
        anomaly_score: d.anomaly?.score ?? state.anomalyScore,
        fraud_probability: d.fraud?.probability ?? state.fraudProbability,
        entropy: d.temporal?.entropy ?? state.entropy,
        velocity: d.temporal?.velocity ?? state.velocity,
        sdk_state: backendSdkState,
        current_screen: backendScreen,
      }
      const newAlerts: AlertEntry[] = (d.alerts || []).map((a: any) => ({
        severity: a.severity,
        message: a.message,
        timestamp: a.timestamp || new Date().toISOString(),
        trust_score: a.trust_score ?? ts,
        cognitive_state: a.cognitive_state ?? d.cognitive_state,
      }))
      const newWindowCount = (d.event_number ?? state.eventCount + 1)
      const behaviorConfidence = Math.min(1, newWindowCount / 15)
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
        eventCount: newWindowCount,
        latencyMs: d.latency_ms ?? state.latencyMs,
        confidence: d.confidence ?? state.confidence,
        reasons: d.reasons ?? state.reasons,
        explanation: d.explanation ?? state.explanation,
        alerts: [...state.alerts, ...newAlerts].slice(-50),
        timeline: [...state.timeline, newEntry].slice(-100),
        cognitiveHistory: [...state.cognitiveHistory, d.cognitive_state ?? state.cognitiveState].slice(-50),
        anomalyScore: d.anomaly?.score ?? state.anomalyScore,
        isAnomaly: d.anomaly?.is_anomaly ?? state.isAnomaly,
        fraudProbability: d.fraud?.probability ?? state.fraudProbability,
        fraudTrajectory: d.fraud?.trajectory ?? state.fraudTrajectory,
        intentVector: d.fraud?.intent_vector ?? state.intentVector,
        securityState: d.security?.security_state ?? state.securityState,
        sandboxActive: d.security?.sandbox_active ?? state.sandboxActive,
        threatScore: d.security?.threat_score ?? state.threatScore,
        liveActivity: {
          ...state.liveActivity,
          collectedWindows: newWindowCount,
          behaviorConfidence,
          currentPage: backendScreen,
          sessionDurationMs: d.session_context
            ? (d.session_context.session_duration_s * 1000)
            : state.liveActivity.sessionDurationMs,
        },
        sdkState: backendSdkState,
      }
    }
    case 'RESET':
      return { ...initialState, isConnected: state.isConnected }
    default:
      return state
  }
}

// ─── ACTIVITY DESCRIPTION HELPER ────────────────────────────────────────────

function _describeActivity(sdkState: SDKState, screen: AppScreen): string {
  const screenLabels: Record<string, string> = {
    launch: 'Launching app',
    home: 'Browsing home',
    history: 'Viewing transaction history',
    bills: 'Viewing bills',
    transfer: 'Initiating transfer',
    send: 'Initiating transfer',
    amount: 'Entering amount',
    review: 'Reviewing transaction',
    pin: 'Entering PIN',
    success: 'Transaction complete',
    profile: 'Viewing profile',
    scan: 'Scanning QR code',
    qr: 'Scanning QR code',
    mobile: 'Mobile recharge',
    electricity: 'Paying electricity bill',
    fasttag: 'FASTag recharge',
    insurance: 'Insurance payment',
    credit: 'Credit card payment',
  }

  const statePrefix: Record<SDKState, string> = {
    INITIALIZING: 'Starting up',
    OBSERVING: 'Observing',
    LEARNING: 'Learning baseline',
    TRANSACTION: 'In transaction',
    VERIFYING: 'Verifying identity',
    FINISHED: 'Session ended',
  }

  const screenLabel = screenLabels[screen] ?? `On ${screen}`
  if (sdkState === 'INITIALIZING') return 'Initializing SDK'
  if (sdkState === 'TRANSACTION') return `Transaction — ${screenLabel}`
  if (sdkState === 'VERIFYING') return `Verifying — ${screenLabel}`
  if (sdkState === 'FINISHED') return 'Session ended'
  return `${statePrefix[sdkState]} — ${screenLabel}`
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
