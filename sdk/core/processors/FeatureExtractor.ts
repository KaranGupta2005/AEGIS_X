import { TypingCollector } from '../collectors/TypingCollector'
import { TouchCollector } from '../collectors/TouchCollector'
import { NavigationCollector } from '../collectors/NavigationCollector'
import { HesitationCollector } from '../collectors/HesitationCollector'

export interface BehavioralFeatures {
  typing_speed_cps: number
  typing_rhythm_variance: number
  typing_pressure_mean: number
  swipe_velocity_mean: number
  swipe_velocity_variance: number
  swipe_straightness: number
  touch_duration_mean: number
  touch_duration_variance: number
  touch_area_mean: number
  hesitation_ratio: number
  hesitation_count: number
  correction_rate: number
  scroll_speed_mean: number
  gyroscope_variance: number
  session_time_elapsed: number
  interaction_intensity: number
}

export class FeatureExtractor {
  private typing: TypingCollector
  private touch: TouchCollector
  private navigation: NavigationCollector
  private hesitation: HesitationCollector
  private sessionStart: number = 0

  constructor() {
    this.typing = new TypingCollector()
    this.touch = new TouchCollector()
    this.navigation = new NavigationCollector()
    this.hesitation = new HesitationCollector()
  }

  start() {
    this.sessionStart = Date.now()
    this.typing.start()
    this.touch.start()
    this.navigation.start()
    this.hesitation.start()
  }

  stop() {
    this.typing.stop()
    this.touch.stop()
    this.navigation.stop()
    this.hesitation.stop()
  }

  recordKey(key: string) {
    this.typing.recordKey(key)
    this.hesitation.recordAction()
  }

  recordTouchStart(x: number, y: number) {
    this.touch.recordTouchStart(x, y)
    this.hesitation.recordAction()
  }

  recordTouchEnd(x: number, y: number) {
    this.touch.recordTouchEnd(x, y)
  }

  recordScreenChange(screen: string) {
    this.navigation.recordScreenChange(screen)
    this.hesitation.recordAction()
  }

  extract(): BehavioralFeatures {
    const typingFeatures = this.typing.extract()
    const touchFeatures = this.touch.extract()
    const navFeatures = this.navigation.extract()
    const hesFeatures = this.hesitation.extract()

    return {
      typing_speed_cps: typingFeatures.typing_speed_cps,
      typing_rhythm_variance: typingFeatures.typing_rhythm_variance,
      typing_pressure_mean: typingFeatures.typing_pressure_mean,
      correction_rate: typingFeatures.correction_rate,
      touch_duration_mean: touchFeatures.touch_duration_mean,
      touch_duration_variance: touchFeatures.touch_duration_variance,
      touch_area_mean: touchFeatures.touch_area_mean,
      interaction_intensity: touchFeatures.interaction_intensity,
      swipe_velocity_mean: navFeatures.swipe_velocity_mean,
      swipe_velocity_variance: navFeatures.swipe_velocity_variance,
      swipe_straightness: navFeatures.swipe_straightness,
      scroll_speed_mean: navFeatures.scroll_speed_mean,
      hesitation_ratio: hesFeatures.hesitation_ratio,
      hesitation_count: hesFeatures.hesitation_count,
      session_time_elapsed: hesFeatures.session_time_elapsed,
      gyroscope_variance: 0.015,
    }
  }

  resetWindow() {
    this.typing.reset()
    this.touch.reset()
    this.navigation.reset()
    this.hesitation.reset()
  }
}
