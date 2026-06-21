import { BehavioralFeatures } from '../processors/FeatureExtractor'

interface BufferedEvent {
  features: BehavioralFeatures
  timestamp: number
  transactionAmount: number
  isNewBeneficiary: boolean
}

export class EventBuffer {
  private buffer: BufferedEvent[] = []
  private maxSize: number

  constructor(maxSize: number = 50) {
    this.maxSize = maxSize
  }

  push(features: BehavioralFeatures, transactionAmount: number = 0, isNewBeneficiary: boolean = false) {
    this.buffer.push({
      features,
      timestamp: Date.now(),
      transactionAmount,
      isNewBeneficiary,
    })
    if (this.buffer.length > this.maxSize) {
      this.buffer.shift()
    }
  }

  drain(): BufferedEvent[] {
    const items = [...this.buffer]
    this.buffer = []
    return items
  }

  peek(): BufferedEvent | null {
    return this.buffer.length > 0 ? this.buffer[this.buffer.length - 1] : null
  }

  get length(): number {
    return this.buffer.length
  }

  clear() {
    this.buffer = []
  }
}
