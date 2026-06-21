interface ScreenVisit {
  screen: string
  timestamp: number
  duration: number
}

export class NavigationCollector {
  private history: ScreenVisit[] = []
  private currentScreen: string = ''
  private screenEnterTime: number = 0
  private isActive: boolean = false

  start() {
    this.history = []
    this.currentScreen = ''
    this.screenEnterTime = 0
    this.isActive = true
  }

  stop() {
    this.isActive = false
  }

  recordScreenChange(screen: string) {
    if (!this.isActive) return
    const now = Date.now()
    if (this.currentScreen && this.screenEnterTime > 0) {
      this.history.push({
        screen: this.currentScreen,
        timestamp: this.screenEnterTime,
        duration: now - this.screenEnterTime,
      })
    }
    this.currentScreen = screen
    this.screenEnterTime = now
  }

  extract(): { scroll_speed_mean: number; swipe_velocity_mean: number; swipe_velocity_variance: number; swipe_straightness: number } {
    const screenChanges = this.history.length

    const avgDuration = this.history.length > 0
      ? this.history.reduce((s, h) => s + h.duration, 0) / this.history.length
      : 5000

    const volatility = screenChanges > 5 ? 0.6 : screenChanges > 3 ? 0.8 : 1.0

    return {
      scroll_speed_mean: Math.min(2.5, screenChanges * 0.15 + 0.5),
      swipe_velocity_mean: 1.2 * volatility,
      swipe_velocity_variance: screenChanges > 4 ? 0.3 : 0.14,
      swipe_straightness: volatility > 0.7 ? 0.82 : 0.65,
    }
  }

  reset() {
    this.history = []
    this.currentScreen = ''
    this.screenEnterTime = 0
  }
}
