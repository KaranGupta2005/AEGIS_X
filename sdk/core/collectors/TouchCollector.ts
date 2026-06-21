interface TouchEvent {
  timestamp: number
  duration: number
  x: number
  y: number
}

export class TouchCollector {
  private events: TouchEvent[] = []
  private touchStart: number = 0
  private isActive: boolean = false

  start() {
    this.events = []
    this.isActive = true
  }

  stop() {
    this.isActive = false
  }

  recordTouchStart(x: number, y: number) {
    if (!this.isActive) return
    this.touchStart = Date.now()
  }

  recordTouchEnd(x: number, y: number) {
    if (!this.isActive || this.touchStart === 0) return
    this.events.push({
      timestamp: Date.now(),
      duration: Date.now() - this.touchStart,
      x,
      y,
    })
    this.touchStart = 0
  }

  extract(): { touch_duration_mean: number; touch_duration_variance: number; touch_area_mean: number; interaction_intensity: number } {
    if (this.events.length === 0) {
      return { touch_duration_mean: 120, touch_duration_variance: 500, touch_area_mean: 0.45, interaction_intensity: 0 }
    }

    const durations = this.events.map(e => e.duration)
    const mean = durations.reduce((a, b) => a + b, 0) / durations.length

    let variance = 0
    if (durations.length > 1) {
      variance = durations.reduce((sum, d) => sum + Math.pow(d - mean, 2), 0) / durations.length
    }

    return {
      touch_duration_mean: mean,
      touch_duration_variance: variance,
      touch_area_mean: 0.45,
      interaction_intensity: this.events.length,
    }
  }

  reset() {
    this.events = []
    this.touchStart = 0
  }
}
