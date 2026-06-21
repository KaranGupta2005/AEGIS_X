import { FeatureExtractor, BehavioralFeatures } from './processors/FeatureExtractor'
import { WebSocketTransport, TrustResponse, TrustDecision } from './transport/WebSocketTransport'
import { EventBuffer } from './storage/EventBuffer'

export interface AegisXConfig {
  apiUrl: string
  userId: string
  flushIntervalMs?: number
  bufferSize?: number
}

export class AegisX {
  private extractor: FeatureExtractor
  private transport: WebSocketTransport
  private buffer: EventBuffer
  private flushInterval: number
  private intervalId: ReturnType<typeof setInterval> | null = null
  private isRunning: boolean = false
  private config: AegisXConfig
  private transactionAmount: number = 0
  private isNewBeneficiary: boolean = false

  constructor(config: AegisXConfig) {
    this.config = config
    this.flushInterval = config.flushIntervalMs || 2000
    this.extractor = new FeatureExtractor()
    this.transport = new WebSocketTransport(config.apiUrl, config.userId)
    this.buffer = new EventBuffer(config.bufferSize || 50)
  }

  async start(): Promise<void> {
    if (this.isRunning) return
    await this.transport.connect()
    this.extractor.start()
    this.isRunning = true
    this.intervalId = setInterval(() => this.flush(), this.flushInterval)
  }

  stop() {
    this.isRunning = false
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    this.extractor.stop()
    this.transport.disconnect()
  }

  recordKey(key: string) {
    if (!this.isRunning) return
    this.extractor.recordKey(key)
  }

  recordTouchStart(x: number, y: number) {
    if (!this.isRunning) return
    this.extractor.recordTouchStart(x, y)
  }

  recordTouchEnd(x: number, y: number) {
    if (!this.isRunning) return
    this.extractor.recordTouchEnd(x, y)
  }

  recordScreenChange(screen: string) {
    if (!this.isRunning) return
    this.extractor.recordScreenChange(screen)
  }

  setTransaction(amount: number, isNew: boolean = false) {
    this.transactionAmount = amount
    this.isNewBeneficiary = isNew
  }

  onDecision(callback: (response: TrustResponse) => void) {
    this.transport.onDecision(callback)
  }

  onAlert(callback: (alert: { severity: string; message: string }) => void) {
    this.transport.onAlert(callback)
  }

  getTrustScore(): Promise<number> {
    return new Promise((resolve) => {
      const unsub = (response: TrustResponse) => {
        resolve(response.trust_score)
      }
      this.transport.onDecision(unsub)
    })
  }

  private flush() {
    if (!this.isRunning) return
    const features = this.extractor.extract()
    this.buffer.push(features, this.transactionAmount, this.isNewBeneficiary)
    this.transport.send(features, this.transactionAmount, this.isNewBeneficiary)
    this.extractor.resetWindow()
  }
}
