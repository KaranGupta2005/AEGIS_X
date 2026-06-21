export class HesitationCollector {
  private lastActionTime: number = 0
  private pauses: number[] = []
  private totalActions: number = 0
  private isActive: boolean = false
  private pauseThresholdMs: number = 1500

  start() {
    this.lastActionTime = Date.now()
    this.pauses = []
    this.totalActions = 0
    this.isActive = true
  }

  stop() {
    this.isActive = false
  }

  recordAction() {
    if (!this.isActive) return
    const now = Date.now()
    const gap = now - this.lastActionTime
    if (gap > this.pauseThresholdMs) {
      this.pauses.push(gap)
    }
    this.totalActions++
    this.lastActionTime = now
  }

  extract(): { hesitation_ratio: number; hesitation_count: number; session_time_elapsed: number } {
    const now = Date.now()
    const totalTime = this.lastActionTime > 0 ? (now - (this.lastActionTime - (this.totalActions > 0 ? 0 : 0))) : 1

    const totalPauseTime = this.pauses.reduce((s, p) => s + p, 0)
    const sessionDuration = this.totalActions > 0 ? totalPauseTime + (this.totalActions * 200) : 1

    const hesitation_ratio = sessionDuration > 0 ? Math.min(1, totalPauseTime / Math.max(sessionDuration, 1000)) : 0
    const hesitation_count = this.pauses.length

    return {
      hesitation_ratio,
      hesitation_count,
      session_time_elapsed: (now - this.lastActionTime) / 1000 + this.totalActions * 2,
    }
  }

  reset() {
    this.lastActionTime = Date.now()
    this.pauses = []
    this.totalActions = 0
  }
}
