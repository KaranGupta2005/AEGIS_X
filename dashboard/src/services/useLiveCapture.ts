import { useEffect, useRef } from 'react'

const WS_BASE = `ws://${window.location.hostname}:8000`

interface SDKFeatures {
  typing_speed_cps: number
  key_hold_mean_ms: number
  key_flight_mean_ms: number
  typing_burst_ratio: number
  correction_rate: number
  pause_frequency: number
  hesitation_ratio: number
  long_pause_count: number
  tap_interval_mean_ms: number
  tap_duration_mean_ms: number
  swipe_velocity_mean: number
  swipe_straightness: number
  scroll_speed_mean: number
  scroll_reversals: number
  gyroscope_variance: number
  accelerometer_jerk: number
  [key: string]: number
}

class BrowserCollector {
  private _intervalMs: number
  private _keyTimes: number[] = []
  private _corrections: number = 0
  private _totalKeys: number = 0
  private _pauses: number = 0
  private _lastKeyTime: number = 0
  private _scrollEvents: number[] = []
  private _mouseEvents: number[] = []
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
    this._lastKeyTime = now
  }

  private _onKeyUp = () => {}

  private _onScroll = () => {
    this._scrollEvents.push(performance.now())
  }

  private _onMouseMove = () => {
    this._mouseEvents.push(performance.now())
  }

  private _flush() {
    const elapsed = this._intervalMs / 1000
    const typingSpeed = this._totalKeys / Math.max(elapsed, 0.1)
    const correctionRate = this._totalKeys > 0 ? this._corrections / this._totalKeys : 0
    const hesitationRatio = this._totalKeys > 0 ? this._pauses / this._totalKeys : 0

    let keyFlightMean = 120
    if (this._keyTimes.length > 1) {
      const flights: number[] = []
      for (let i = 1; i < this._keyTimes.length; i++) {
        flights.push(this._keyTimes[i] - this._keyTimes[i - 1])
      }
      keyFlightMean = flights.reduce((a, b) => a + b, 0) / flights.length
    }

    const features: SDKFeatures = {
      typing_speed_cps: Math.min(12, typingSpeed),
      key_hold_mean_ms: 80 + Math.random() * 40,
      key_flight_mean_ms: keyFlightMean,
      typing_burst_ratio: Math.min(1, this._totalKeys / 20),
      correction_rate: correctionRate,
      pause_frequency: Math.min(1, this._pauses / Math.max(this._totalKeys, 1)),
      hesitation_ratio: hesitationRatio,
      long_pause_count: this._pauses,
      tap_interval_mean_ms: 200 + Math.random() * 100,
      tap_duration_mean_ms: 100 + Math.random() * 50,
      swipe_velocity_mean: 1.0 + Math.random() * 0.5,
      swipe_straightness: 0.8 + Math.random() * 0.15,
      scroll_speed_mean: this._scrollEvents.length * 50,
      scroll_reversals: Math.floor(Math.random() * 3),
      gyroscope_variance: 0.01 + Math.random() * 0.02,
      accelerometer_jerk: 0.5 + Math.random() * 1.0,
    }

    this._keyTimes = []
    this._corrections = 0
    this._totalKeys = 0
    this._pauses = 0
    this._scrollEvents = []
    this._mouseEvents = []

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
