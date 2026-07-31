/**
 * StoreProvider — Application root context.
 *
 * Integrates the AEGIS-X Continuous Behavioral SDK so monitoring begins
 * at application launch, not just at transaction time.
 *
 * Lifecycle:
 *   Component mount → SDK initialized → WS opened → session created
 *   → 2s behavioral windows stream → trust updates dispatch to store
 *   → Component unmount → session summary → SDK finished
 */
import React, { useReducer, useRef, useCallback, useEffect } from 'react'
import { StoreContext, initialState, reducer, Action } from './store'
import { createWebSocket, createSimulator, SimulatorScenario, TrustUpdate } from './api'
import { aegisSDK, windowToBackendEvent, BehaviorWindow, setVerificationFailureInjector } from './sdk/AegisBehavioralSDK'

const WS_PROTOCOL = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
const WS_HOST = import.meta.env.VITE_BACKEND_URL
  ? new URL(import.meta.env.VITE_BACKEND_URL).host
  : `${window.location.hostname}:8000`
const WS_BASE = `${WS_PROTOCOL}//${WS_HOST}`

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState)
  const wsRef = useRef<ReturnType<typeof createWebSocket> | null>(null)
  const simRef = useRef<ReturnType<typeof createSimulator> | null>(null)

  // ── CONTINUOUS SDK SESSION (initialized on app mount) ───────────────────
  const continuousWsRef = useRef<WebSocket | null>(null)
  const continuousSessionRef = useRef<{ userId: string; sessionId: string } | null>(null)
  const sessionStartTimeRef = useRef<number>(Date.now())
  const sdkInitializedRef = useRef(false)

  useEffect(() => {
    // Start the continuous monitoring session on mount
    // Persist session across page refreshes using sessionStorage
    let userId = sessionStorage.getItem('aegisx_live_userId')
    let sessionId = sessionStorage.getItem('aegisx_live_sessionId')
    if (!userId || !sessionId) {
      userId = `live_session_${Date.now()}`
      sessionId = `sess_${Math.random().toString(36).slice(2, 14)}`
      sessionStorage.setItem('aegisx_live_userId', userId)
      sessionStorage.setItem('aegisx_live_sessionId', sessionId)
    }
    continuousSessionRef.current = { userId, sessionId }
    sessionStartTimeRef.current = Date.now()

    const ws = new WebSocket(`${WS_BASE}/ws/${userId}?session_id=${sessionId}`)
    continuousWsRef.current = ws

    ws.onopen = () => {
      // Initialize SDK — attaches DOM listeners immediately
      // Guard against double-init on reconnect
      if (!sdkInitializedRef.current) {
        aegisSDK.initialize(userId, sessionId)
        sdkInitializedRef.current = true
      }

      dispatch({ type: 'SET_CONNECTED', payload: true })
      dispatch({ type: 'SET_SESSION', payload: { userId, sessionId } })
      dispatch({ type: 'SDK_STATE_CHANGE', payload: { sdkState: 'OBSERVING', currentScreen: 'home' } })

      // Wire verification failure injector — lets SendMoneyFlow push
      // stressed events through the live trust pipeline on biometric failure
      setVerificationFailureInjector((event, txAmount = 0) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'behavioral_event',
            event,
            transaction_amount: txAmount,
            is_new_beneficiary: false,
            sdk_context: { sdk_state: 'VERIFYING', current_screen: 'pin' },
          }))
        }
      })

      // Wire window callback: aggregate → transmit (with buffer for reconnect)
      const windowBuffer: BehaviorWindow[] = []
      const MAX_BUFFER = 5

      aegisSDK.onWindow((w: BehaviorWindow) => {
        const msg = JSON.stringify({
          type: 'behavioral_event',
          event: windowToBackendEvent(w),
          transaction_amount: w.transaction_amount,
          is_new_beneficiary: w.is_new_beneficiary,
          sdk_context: {
            sdk_state: w.sdkState,
            current_screen: w.current_screen,
            navigation_depth: w.navigation_depth,
            time_on_screen: w.time_on_current_screen,
            idle_ratio: w.idle_ratio,
            hour_of_day: w.hour_of_day,
            day_of_week: w.day_of_week,
            transaction_category: w.transaction_category,
            transaction_count: w.transaction_count,
            window_id: w.windowId,
          },
        })

        if (ws.readyState === WebSocket.OPEN) {
          // Flush any buffered windows first (from reconnect gap)
          while (windowBuffer.length > 0) {
            const buffered = windowBuffer.shift()!
            ws.send(JSON.stringify({
              type: 'behavioral_event',
              event: windowToBackendEvent(buffered),
              transaction_amount: buffered.transaction_amount,
              is_new_beneficiary: buffered.is_new_beneficiary,
              sdk_context: { sdk_state: buffered.sdkState, current_screen: buffered.current_screen },
            }))
          }
          ws.send(msg)
        } else {
          // WebSocket not open — buffer the window for later
          windowBuffer.push(w)
          if (windowBuffer.length > MAX_BUFFER) windowBuffer.shift()
        }

        // Keep liveActivity duration in sync
        const now = Date.now()
        dispatch({
          type: 'LIVE_ACTIVITY_UPDATE',
          payload: {
            sessionDurationMs: now - sessionStartTimeRef.current,
            collectedWindows: aegisSDK.windowCount,
          },
        })
      })

      aegisSDK.onStateChange((sdkState, _prev) => {
        dispatch({
          type: 'SDK_STATE_CHANGE',
          payload: { sdkState, currentScreen: aegisSDK.currentScreen },
        })
      })
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'trust_update' || data.trust_score !== undefined) {
          dispatch({ type: 'TRUST_UPDATE', payload: data as TrustUpdate })
        }
      } catch { /* ignore */ }
    }

    ws.onclose = () => {
      dispatch({ type: 'SET_CONNECTED', payload: false })
      // Reconnect with exponential backoff (max 5 attempts — covers Render cold start)
      let attempts = 0
      const reconnect = () => {
        if (attempts >= 5) return
        attempts++
        const delay = Math.min(3000 * Math.pow(1.5, attempts - 1), 15000)
        setTimeout(() => {
          if (continuousWsRef.current?.readyState === WebSocket.OPEN) return
          try {
            const newWs = new WebSocket(`${WS_BASE}/ws/${userId}?session_id=${sessionId}`)
            continuousWsRef.current = newWs
            newWs.onopen = () => { dispatch({ type: 'SET_CONNECTED', payload: true }); attempts = 0 }
            newWs.onmessage = ws.onmessage
            newWs.onclose = () => { dispatch({ type: 'SET_CONNECTED', payload: false }); reconnect() }
          } catch { /* give up */ }
        }, delay)
      }
      reconnect()
    }

    return () => {
      aegisSDK.endSession()
      ws.close()
      continuousWsRef.current = null
      sdkInitializedRef.current = false
    }
  }, [])

  // ── HONEYPOT WATCH: disconnect WS when honeypot triggers, reconnect after 30s ──
  const honeypotTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (state.honeypotTriggered && continuousWsRef.current) {
      // Close the WebSocket — backend appears "offline" to the attacker
      continuousWsRef.current.close()
      dispatch({ type: 'SET_CONNECTED', payload: false })

      // Reconnect after 30 seconds (suitable condition = time passed)
      if (honeypotTimerRef.current) clearTimeout(honeypotTimerRef.current)
      honeypotTimerRef.current = setTimeout(() => {
        const session = continuousSessionRef.current
        if (!session) return
        try {
          const newWs = new WebSocket(`${WS_BASE}/ws/${session.userId}?session_id=${session.sessionId}`)
          continuousWsRef.current = newWs
          newWs.onopen = () => {
            dispatch({ type: 'SET_CONNECTED', payload: true })
            dispatch({ type: 'HONEYPOT_RESET' })
          }
          newWs.onmessage = (event) => {
            try {
              const data = JSON.parse(event.data)
              if (data.type === 'trust_update' || data.trust_score !== undefined) {
                dispatch({ type: 'TRUST_UPDATE', payload: data as TrustUpdate })
              }
            } catch { /* ignore */ }
          }
          newWs.onclose = () => { dispatch({ type: 'SET_CONNECTED', payload: false }) }
        } catch { /* give up */ }
      }, 30000)
    }
    return () => {
      if (honeypotTimerRef.current) clearTimeout(honeypotTimerRef.current)
    }
  }, [state.honeypotTriggered])

  // ── SIMULATOR SCENARIO (for demo/testing mode) ───────────────────────────

  const disconnect = useCallback(() => {
    simRef.current?.stop()
    simRef.current = null
    wsRef.current?.close()
    wsRef.current = null
  }, [])

  const connect = useCallback((scenario: SimulatorScenario) => {
    disconnect()
    dispatch({ type: 'SET_SCENARIO', payload: scenario })

    // CRITICAL DESIGN: For demo, the simulator sends events through the
    // SAME continuous session WebSocket that the real SDK uses.
    // This ensures:
    // 1. Trust score drops are visible on the same timeline
    // 2. The backend processes simulated attacks against the REAL user's baseline
    // 3. Containment triggers for the active session (not a separate demo session)
    //
    // The real SDK behavioral data still flows through the same WebSocket at 2s
    // intervals. When simulator is active, both real + simulated events arrive.
    // The backend processes them in order — simulated attack events will cause
    // trust drops that the dashboard immediately reflects.
    //
    // PRIORITY: Real SDK events have natural human variance that the pipeline
    // trusts. Simulated attack events have extreme signatures that trigger
    // BLOCK/STEP_UP. If a user is genuinely interacting normally while the
    // simulator is also sending attack events, the attack events dominate
    // because they produce lower similarity scores against the baseline.

    const continuousWs = continuousWsRef.current
    if (!continuousWs || continuousWs.readyState !== WebSocket.OPEN) {
      // Fallback: create a separate demo WebSocket if continuous isn't available
      const userId = `demo_${scenario}_${Date.now()}`
      const ws = createWebSocket(
        userId,
        (data: TrustUpdate) => {
          if (data.type === 'trust_update' || data.trust_score !== undefined) {
            dispatch({ type: 'TRUST_UPDATE_SIMULATED' as any, payload: data })
          }
        },
        () => {},
      )
      wsRef.current = ws
      ws.ws.onopen = () => {
        dispatch({ type: 'SET_SESSION', payload: { userId, sessionId: '' } })
        setTimeout(() => {
          const sim = createSimulator(scenario, ws, 2000)
          simRef.current = sim
          sim.start()
        }, 500)
      }
      return
    }

    // PRIMARY PATH: Use the continuous WebSocket for simulator events
    // This makes the simulated attacks hit the SAME session as real SDK data
    const wrapperWs = {
      send: (event: Record<string, any>, txAmount = 0, isNewBen = false) => {
        if (continuousWs.readyState === WebSocket.OPEN) {
          continuousWs.send(JSON.stringify({
            type: 'behavioral_event',
            event,
            transaction_amount: txAmount,
            is_new_beneficiary: isNewBen,
            sdk_context: {
              sdk_state: 'TRANSACTION',
              current_screen: 'transfer',
              source: 'simulator',
              scenario,
            },
          }))
        }
      },
      close: () => { /* don't close the continuous WS */ },
      ws: continuousWs,
    }

    wsRef.current = wrapperWs as any
    const sim = createSimulator(scenario, wrapperWs as any, 2000)
    simRef.current = sim
    sim.start()
  }, [disconnect])

  const switchScenario = useCallback((scenario: SimulatorScenario) => {
    connect(scenario)
  }, [connect])

  return (
    <StoreContext.Provider value={{ state, dispatch, connect, disconnect, switchScenario }}>
      {children}
    </StoreContext.Provider>
  )
}
