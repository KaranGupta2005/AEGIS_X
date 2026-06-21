import { useEffect, useRef } from 'react'
import { BrowserSDK } from '../../sdk/browser/BrowserSDK'

const WS_BASE = `ws://${window.location.hostname}:8000`

export function useLiveCapture(userId: string, enabled: boolean = false) {
  const sdkRef = useRef<BrowserSDK | null>(null)
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    if (!enabled) return

    const sdk = new BrowserSDK(2000)
    sdkRef.current = sdk

    const ws = new WebSocket(`${WS_BASE}/ws/${userId}`)
    wsRef.current = ws

    ws.onopen = () => {
      sdk.onFlush((features) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'behavioral_event',
            event: features,
            transaction_amount: 0,
            is_new_beneficiary: false,
          }))
        }
      })
      sdk.start()
    }

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.trust_score !== undefined) {
        console.log('[AEGIS-X Live]', `Trust: ${(data.trust_score * 100).toFixed(0)}%`, `State: ${data.cognitive_state}`, `Decision: ${data.decision}`)
      }
    }

    return () => {
      sdk.stop()
      ws.close()
    }
  }, [userId, enabled])

  return {
    sdk: sdkRef.current,
    isCapturing: enabled,
  }
}
