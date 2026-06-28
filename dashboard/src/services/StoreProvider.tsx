import React, { useReducer, useRef, useCallback } from 'react'
import { StoreContext, initialState, reducer, Action } from './store'
import { createWebSocket, createSimulator, SimulatorScenario, TrustUpdate } from './api'

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState)
  const wsRef = useRef<ReturnType<typeof createWebSocket> | null>(null)
  const simRef = useRef<ReturnType<typeof createSimulator> | null>(null)

  const disconnect = useCallback(() => {
    simRef.current?.stop()
    simRef.current = null
    wsRef.current?.close()
    wsRef.current = null
    dispatch({ type: 'SET_CONNECTED', payload: false })
  }, [])

  const connect = useCallback((scenario: SimulatorScenario) => {
    disconnect()
    dispatch({ type: 'SET_SCENARIO', payload: scenario })

    const userId = `demo_${scenario}_${Date.now()}`

    const ws = createWebSocket(
      userId,
      (data: TrustUpdate) => {
        // Handle blocked session — stop simulator, don't freeze
        if ((data as any).error === 'session_blocked' || (data as any).action === 'BLOCK') {
          simRef.current?.stop()
          simRef.current = null
        }
        // Only dispatch trust updates (not error responses)
        if (data.type === 'trust_update' || data.trust_score !== undefined) {
          dispatch({ type: 'TRUST_UPDATE', payload: data })
        }
      },
      () => {
        dispatch({ type: 'SET_CONNECTED', payload: false })
      }
    )

    wsRef.current = ws

    ws.ws.onopen = () => {
      dispatch({ type: 'SET_CONNECTED', payload: true })
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
