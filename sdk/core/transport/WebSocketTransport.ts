import { BehavioralFeatures } from '../processors/FeatureExtractor'

export type TrustDecision = 'ALLOW' | 'STEP_UP' | 'BLOCK'

export interface TrustResponse {
  trust_score: number
  decision: TrustDecision
  cognitive_state: string
  drift_detected: boolean
}

type DecisionCallback = (response: TrustResponse) => void
type AlertCallback = (alert: { severity: string; message: string }) => void

export class WebSocketTransport {
  private ws: WebSocket | null = null
  private url: string
  private queue: string[] = []
  private isConnected: boolean = false
  private onDecisionCallbacks: DecisionCallback[] = []
  private onAlertCallbacks: AlertCallback[] = []
  private reconnectAttempts: number = 0
  private maxReconnects: number = 5

  constructor(baseUrl: string, userId: string) {
    this.url = `${baseUrl}/ws/${userId}`
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url)
      } catch (e) {
        reject(e)
        return
      }

      this.ws.onopen = () => {
        this.isConnected = true
        this.reconnectAttempts = 0
        this.flushQueue()
        resolve()
      }

      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data)
        if (data.trust_score !== undefined) {
          const response: TrustResponse = {
            trust_score: data.trust_score,
            decision: data.decision || data.trust_state?.action || 'ALLOW',
            cognitive_state: data.cognitive_state || data.trust_state?.cognitive_state || 'calm',
            drift_detected: data.drift_detected || data.drift?.detected || false,
          }
          this.onDecisionCallbacks.forEach(cb => cb(response))
        }
        if (data.alerts && data.alerts.length > 0) {
          data.alerts.forEach((a: any) => {
            this.onAlertCallbacks.forEach(cb => cb({ severity: a.severity, message: a.message }))
          })
        }
      }

      this.ws.onclose = () => {
        this.isConnected = false
        if (this.reconnectAttempts < this.maxReconnects) {
          this.reconnectAttempts++
          setTimeout(() => this.connect(), 2000 * this.reconnectAttempts)
        }
      }

      this.ws.onerror = () => {
        reject(new Error('WebSocket connection failed'))
      }
    })
  }

  send(features: BehavioralFeatures, transactionAmount: number = 0, isNewBeneficiary: boolean = false) {
    const payload = JSON.stringify({
      type: 'behavioral_event',
      event: features,
      transaction_amount: transactionAmount,
      is_new_beneficiary: isNewBeneficiary,
    })

    if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(payload)
    } else {
      this.queue.push(payload)
    }
  }

  onDecision(callback: DecisionCallback) {
    this.onDecisionCallbacks.push(callback)
  }

  onAlert(callback: AlertCallback) {
    this.onAlertCallbacks.push(callback)
  }

  disconnect() {
    this.isConnected = false
    this.ws?.close()
    this.ws = null
  }

  private flushQueue() {
    while (this.queue.length > 0 && this.isConnected) {
      const msg = this.queue.shift()
      if (msg && this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(msg)
      }
    }
  }
}
