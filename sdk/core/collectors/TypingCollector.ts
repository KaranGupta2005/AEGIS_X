interface KeyEvent {
  key: string
  timestamp: number
  isBackspace: boolean
}

export class TypingCollector {
  private events: KeyEvent[] = []
  private sessionStart: number = 0
  private isActive: boolean = false

  start() {
    this.events = []
    this.sessionStart = Date.now()
    this.isActive = true
  }

  stop() {
    this.isActive = false
  }

  recordKey(key: string) {
    if (!this.isActive) return
    this.events.push({
      key,
      timestamp: Date.now(),
      isBackspace: key === 'Backspace' || key === 'Delete',
    })
  }

  extract(): { typing_speed_cps: number; correction_rate: number; typing_rhythm_variance: number; typing_pressure_mean: number } {
    if (this.events.length < 2) {
      return { typing_speed_cps: 0, correction_rate: 0, typing_rhythm_variance: 0, typing_pressure_mean: 0.5 }
    }

    const duration = (this.events[this.events.length - 1].timestamp - this.events[0].timestamp) / 1000
    const totalKeys = this.events.length
    const backspaces = this.events.filter(e => e.isBackspace).length
    const chars = totalKeys - backspaces

    const typing_speed_cps = duration > 0 ? chars / duration : 0

    const correction_rate = totalKeys > 0 ? backspaces / totalKeys : 0

    const intervals: number[] = []
    for (let i = 1; i < this.events.length; i++) {
      intervals.push(this.events[i].timestamp - this.events[i - 1].timestamp)
    }

    let typing_rhythm_variance = 0
    if (intervals.length > 1) {
      const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length
      const variance = intervals.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / intervals.length
      typing_rhythm_variance = variance
    }

    const typing_pressure_mean = 0.55

    return { typing_speed_cps, correction_rate, typing_rhythm_variance, typing_pressure_mean }
  }

  reset() {
    this.events = []
    this.sessionStart = Date.now()
  }
}
