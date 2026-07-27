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
import { aegisSDK, windowToBackendEvent, BehaviorWindow } from './sdk/AegisBehavioralSDK'

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
    // Prevent double-initialization in React StrictMode
    if (sdkInitializedRef.current) return
    sdkInitializedRef.current = true

    // Start the continuous monitoring session immediately on mount
    const userId = `live_session_${Date.now()}`
    const sessionId = `sess_${Math.random().toString(36).slice(2, 14)}`
    continuousSessionRef.current = { userId, sessionId }
    sessionStartTimeRef.current = Date.now()

    const ws = new WebSocket(`${WS_BASE}/ws/${userId}?session_id=${sessionId}`)
    continuousWsRef.current = ws

    ws.onopen = () => {
      // Initialize SDK — attaches DOM listeners immediately
      aegisSDK.initialize(userId, sessionId)

      dispatch({ type: 'SET_CONNECTED', payload: true })
      dispatch({ type: 'SET_SESSION', payload: { userId, sessionId } })
      dispatch({ type: 'SDK_STATE_CHANGE', payload: { sdkState: 'OBSERVING', currentScreen: 'home' } })

      // Wire window callback: aggregate → transmit (no raw events sent)
      aegisSDK.onWindow((w: BehaviorWindow) => {
        if (ws.readyState !== WebSocket.OPEN) return
        ws.send(JSON.stringify({
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
        }))

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
      // Reconnect with exponential backoff (max 3 attempts)
      let attempts = 0
      const reconnect = () => {
        if (attempts >= 3) return
        attempts++
        const delay = Math.min(2000 * Math.pow(2, attempts - 1), 10000)
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
    }
  }, [])

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

    const userId = `demo_${scenario}_${Date.now()}`

    const ws = createWebSocket(
      userId,
      (data: TrustUpdate) => {
        if (data.type === 'trust_update' || data.trust_score !== undefined) {
          dispatch({ type: 'TRUST_UPDATE', payload: data })
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
