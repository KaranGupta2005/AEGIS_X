/**
 * useAegisSDK — React integration hook for the AEGIS-X Continuous Behavioral SDK.
 *
 * Initializes the SDK on application mount (not transaction start).
 * Streams BehaviorWindows over WebSocket to the backend every 2 seconds.
 * Notifies the store of SDK state changes, screen changes, and trust updates.
 */

import { useEffect, useRef, useCallback } from 'react'
import { aegisSDK, windowToBackendEvent, SDKState, AppScreen, BehaviorWindow } from './AegisBehavioralSDK'

const WS_PROTOCOL = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
const WS_HOST = import.meta.env.VITE_BACKEND_URL
  ? new URL(import.meta.env.VITE_BACKEND_URL).host
  : `${window.location.hostname}:8000`
const WS_BASE = `${WS_PROTOCOL}//${WS_HOST}`

export interface AegisSDKHookOptions {
  userId: string
  sessionId: string
  enabled?: boolean
  onTrustUpdate?: (data: any) => void
  onSDKStateChange?: (state: SDKState, prev: SDKState) => void
  onSessionEnd?: (summary: any) => void
}

export function useAegisSDK({
  userId,
  sessionId,
  enabled = true,
  onTrustUpdate,
  onSDKStateChange,
  onSessionEnd,
}: AegisSDKHookOptions) {
  const wsRef = useRef<WebSocket | null>(null)
  const initializedRef = useRef(false)

  // Transmit a behavior window over the WebSocket
  const sendWindow = useCallback((w: BehaviorWindow) => {
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) return

    const event = windowToBackendEvent(w)
    ws.send(JSON.stringify({
      type: 'behavioral_event',
      event,
      transaction_amount: w.transaction_amount,
      is_new_beneficiary: w.is_new_beneficiary,
      // Extended context fields for future backend enrichment
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
  }, [])

  useEffect(() => {
    if (!enabled || initializedRef.current) return
    initializedRef.current = true

    // 1. Open WebSocket FIRST (before SDK init, so WS is ready when first window fires)
    const ws = new WebSocket(`${WS_BASE}/ws/${userId}?session_id=${sessionId}`)
    wsRef.current = ws

    ws.onopen = () => {
      console.log(`[AEGIS-X SDK] Session WebSocket open for ${userId}`)

      // 2. Initialize the SDK — starts DOM listeners and 2s window timer
      aegisSDK.initialize(userId, sessionId)

      // 3. Register window callback — streams windows as they're generated
      aegisSDK.onWindow(sendWindow)

      // 4. Register state change callback
      aegisSDK.onStateChange((state, prev) => {
        console.log(`[AEGIS-X SDK] ${prev} → ${state}`)
        onSDKStateChange?.(state, prev)
      })
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'trust_update' || data.trust_score !== undefined) {
          onTrustUpdate?.(data)
        }
      } catch { /* ignore parse errors */ }
    }

    ws.onclose = () => {
      console.log(`[AEGIS-X SDK] WebSocket closed for ${userId}`)
    }

    ws.onerror = (err) => {
      console.error(`[AEGIS-X SDK] WebSocket error`, err)
    }

    // Cleanup on unmount
    return () => {
      const summary = aegisSDK.endSession()
      if (summary) onSessionEnd?.(summary)
      ws.close()
      wsRef.current = null
      initializedRef.current = false
    }
  }, [userId, sessionId, enabled])

  const notifyScreenChange = useCallback((screen: AppScreen) => {
    aegisSDK.notifyScreenChange(screen)
  }, [])

  const setTransactionContext = useCallback((ctx: Parameters<typeof aegisSDK.setTransactionContext>[0]) => {
    aegisSDK.setTransactionContext(ctx)
  }, [])

  return {
    notifyScreenChange,
    setTransactionContext,
    sdkState: aegisSDK.state,
    windowCount: aegisSDK.windowCount,
    currentScreen: aegisSDK.currentScreen,
  }
}
