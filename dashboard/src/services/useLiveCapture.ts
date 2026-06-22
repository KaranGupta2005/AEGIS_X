import { useEffect, useRef } from 'react'

const WS_BASE = `ws://${window.location.hostname}:8000`

interface SDKFeatures {
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
  [key: string]: number
}

class BrowserCollector {
  private _intervalMs: number
  private _keyTimes: number[] = []
  private _keyHoldStart: number = 0
  private _keyHolds: number[] = []
  private _corrections: number = 0
  private _totalKeys: number = 0
  private _pauses: number = 0
  private _lastKeyTime: number = 0
  private _scrollEvents: number[] = []
  private _scrollDirectionChanges: number = 0
  private _lastScrollDir: number = 0
  private _mousePositions: { x: number; y: number; t: number }[] = []
  private _isRunning: boolean = false
  private _timerId: ReturnType<typeof setInterval> | null = null
  private _flushCallback: ((features: SDKFeatures) => void) | null = null

  constructor(intervalMs: number = 2000) {
    this._intervalMs = intervalMs
  }

  onFlush(cb: (features: SDKFeatures) => void) {
    this._flushCallback = cb
  }

  start() {
    if (this._isRunning) return
    this._isRunning = true
    document.addEventListener('keydown', this._onKeyDown)
    document.addEventListener('keyup', this._onKeyUp)
    document.addEventListener('scroll', this._onScroll)
    document.addEventListener('mousemove', this._onMouseMove)
    this._timerId = setInterval(() => this._flush(), this._intervalMs)
  }

  stop() {
    this._isRunning = false
    document.removeEventListener('keydown', this._onKeyDown)
    document.removeEventListener('keyup', this._onKeyUp)
    document.removeEventListener('scroll', this._onScroll)
    document.removeEventListener('mousemove', this._onMouseMove)
    if (this._timerId) clearInterval(this._timerId)
    this._timerId = null
  }

  private _onKeyDown = (e: KeyboardEvent) => {
    const now = performance.now()
    if (e.key === 'Backspace') this._corrections++
    this._totalKeys++
    if (this._lastKeyTime > 0 && now - this._lastKeyTime > 2000) this._pauses++
    this._keyTimes.push(now)
    this._keyHoldStart = now
    this._lastKeyTime = now
  }

  private _onKeyUp = () => {
    if (this._keyHoldStart > 0) {
      this._keyHolds.push(performance.now() - this._keyHoldStart)
      this._keyHoldStart = 0
    }
  }

  private _onScroll = (e: Event) => {
    const now = performance.now()
    this._scrollEvents.push(now)
    const dir = (e as WheelEvent).deltaY > 0 ? 1 : -1
    if (this._lastScrollDir !== 0 && dir !== this._lastScrollDir) this._scrollDirectionChanges++
    this._lastScrollDir = dir
  }

  private _onMouseMove = (e: MouseEvent) => {
    const now = performance.now()
    if (this._mousePositions.length === 0 || now - this._mousePositions[this._mousePositions.length - 1].t > 50) {
      this._mousePositions.push({ x: e.clientX, y: e.clientY, t: now })
    }
  }

  private _computeMouseVelocity(): { velocity: number; straightness: number } {
    if (this._mousePositions.length < 3) return { velocity: 1.0, straightness: 0.85 }
    let totalDist = 0, totalTime = 0, directDist = 0
    const pts = this._mousePositions
    for (let i = 1; i < pts.length; i++) {
      const dx = pts[i].x - pts[i - 1].x, dy = pts[i].y - pts[i - 1].y
      totalDist += Math.sqrt(dx * dx + dy * dy)
      totalTime += pts[i].t - pts[i - 1].t
    }
    const first = pts[0], last = pts[pts.length - 1]
    directDist = Math.sqrt((last.x - first.x) ** 2 + (last.y - first.y) ** 2)
    const velocity = totalTime > 0 ? (totalDist / totalTime) * 1000 : 1.0
    const straightness = totalDist > 0 ? Math.min(1, directDist / totalDist) : 0.85
    return { velocity: Math.min(5, velocity / 500), straightness }
  }

  private _flush() {
    const elapsed = this._intervalMs / 1000
    const typingSpeed = this._totalKeys / Math.max(elapsed, 0.1)
    const correctionRate = this._totalKeys > 0 ? this._corrections / this._totalKeys : 0
    const hesitationRatio = this._totalKeys > 0 ? this._pauses / this._totalKeys : 0

    let keyFlightMean = 120
    if (this._keyTimes.length > 1) {
      const flights: number[] = []
      for (let i = 1; i < this._keyTimes.length; i++) flights.push(this._keyTimes[i] - this._keyTimes[i - 1])
      keyFlightMean = flights.reduce((a, b) => a + b, 0) / flights.length
    }

    const keyHoldMean = this._keyHolds.length > 0 ? this._keyHolds.reduce((a, b) => a + b, 0) / this._keyHolds.length : 90
    const mouse = this._computeMouseVelocity()
    const scrollSpeed = this._scrollEvents.length * 40

    const features: SDKFeatures = {
      typing_speed_cps: Math.min(12, typingSpeed),
      typing_rhythm_variance: keyFlightMean > 0 ? Math.min(350, Math.abs(keyFlightMean - 120) * 2) : 35,
      typing_pressure_mean: Math.min(1, 0.5 + (typingSpeed / 12) * 0.3),
      swipe_velocity_mean: mouse.velocity,
      swipe_velocity_variance: Math.abs(mouse.velocity - 1.0) * 0.3,
      swipe_straightness: mouse.straightness,
      touch_duration_mean: keyHoldMean,
      touch_duration_variance: this._keyHolds.length > 1 ? Math.min(6000, this._keyHolds.reduce((sum, h) => sum + (h - keyHoldMean) ** 2, 0) / this._keyHolds.length) : 500,
      touch_area_mean: Math.min(1, 0.4 + mouse.velocity * 0.1),
      hesitation_ratio: hesitationRatio,
      hesitation_count: this._pauses,
      correction_rate: correctionRate,
      scroll_speed_mean: Math.min(3, scrollSpeed / 100),
      gyroscope_variance: mouse.velocity > 2 ? 0.04 + Math.random() * 0.02 : 0.01 + Math.random() * 0.01,
      session_time_elapsed: (performance.now() / 1000) % 3600,
      interaction_intensity: Math.min(50, this._totalKeys + this._mousePositions.length + this._scrollEvents.length),
    }

    this._keyTimes = []
    this._keyHolds = []
    this._corrections = 0
    this._totalKeys = 0
    this._pauses = 0
    this._scrollEvents = []
    this._scrollDirectionChanges = 0
    this._mousePositions = []

    if (this._flushCallback) this._flushCallback(features)
  }
}

export function useLiveCapture(userId: string, enabled: boolean = false) {
  const sdkRef = useRef<BrowserCollector | null>(null)
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    if (!enabled) return

    const sdk = new BrowserCollector(2000)
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
