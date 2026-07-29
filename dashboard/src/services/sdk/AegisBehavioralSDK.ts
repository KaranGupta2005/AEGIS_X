/**
 * AEGIS-X Continuous Behavioral Monitoring SDK
 * =============================================
 * Enterprise-grade, session-level behavioral intelligence platform.
 *
 * Architecture:
 *   Application Launch → SDK Initialization → Session Creation
 *   → Continuous Monitoring → Behavior Learning → Transaction Monitoring
 *   → Adaptive Verification → Session End → Session Summary
 *
 * Internal State Machine:
 *   INITIALIZING → OBSERVING → LEARNING → TRANSACTION → VERIFYING → FINISHED
 *
 * Feature Windows: Generated every 2 seconds, aggregated from raw events.
 * Trust Timeline:  Evolves through every screen, not only at payment.
 */

// ─── SDK STATE MACHINE ───────────────────────────────────────────────────────

export type SDKState =
  | 'INITIALIZING'
  | 'OBSERVING'
  | 'LEARNING'
  | 'TRANSACTION'
  | 'VERIFYING'
  | 'FINISHED'

export type AppScreen =
  | 'launch'
  | 'home'
  | 'history'
  | 'bills'
  | 'transfer'
  | 'pin'
  | 'success'
  | 'profile'
  | 'scan'
  | 'mobile'
  | 'electricity'
  | 'fasttag'
  | 'insurance'
  | 'credit'
  | string


// ─── SESSION CONTEXT ─────────────────────────────────────────────────────────

export interface SessionContext {
  sessionId: string
  userId: string
  startTime: number              // ms epoch
  activeTimeMs: number           // accumulated active (non-idle) ms
  idleTimeMs: number             // accumulated idle ms
  lastActivityTime: number       // ms epoch of last event
  currentScreen: AppScreen
  previousScreen: AppScreen
  navigationPath: AppScreen[]    // full navigation history this session
  timePerScreen: Record<string, number>  // screen → total ms
  screenEnteredAt: number        // when current screen was entered
}

export interface DeviceContext {
  userAgent: string
  screenWidth: number
  screenHeight: number
  orientation: 'portrait' | 'landscape'
  language: string
  timezone: string
  platform: string
  hardwareConcurrency: number
  deviceMemoryGB: number
}

export interface TransactionContext {
  amount: number
  beneficiary: string
  category: string               // transfer | bill | recharge | qr | etc.
  paymentMethod: string
  isNewBeneficiary: boolean
  frequency: number              // transactions attempted this session
}


// ─── BEHAVIORAL FEATURE WINDOW ───────────────────────────────────────────────

export interface BehaviorWindow {
  windowId: number
  timestamp: number
  sdkState: SDKState

  // Interaction features
  typing_speed_cps: number
  typing_rhythm_variance: number
  typing_pressure_mean: number
  correction_rate: number
  hesitation_ratio: number
  hesitation_count: number
  backspace_rate: number

  // Touch / pointer
  swipe_velocity_mean: number
  swipe_velocity_variance: number
  swipe_straightness: number
  touch_duration_mean: number
  touch_duration_variance: number
  touch_area_mean: number

  // Scroll
  scroll_speed_mean: number
  scroll_direction_changes: number

  // Pointer (web)
  pointer_velocity: number
  pointer_straightness: number

  // Motion / device
  gyroscope_variance: number

  // Derived session signals
  session_time_elapsed: number
  interaction_intensity: number
  idle_ratio: number             // idleTime / totalTime since session start

  // Navigation context
  current_screen: AppScreen
  navigation_depth: number       // how many screens deep in the session
  time_on_current_screen: number // seconds

  // Time-of-day
  hour_of_day: number
  day_of_week: number

  // Transaction context (0 / defaults when not in transaction)
  transaction_amount: number
  is_new_beneficiary: boolean
  transaction_category: string
  transaction_count: number      // this session

  // Learning signal (SDK never modifies profile — backend decides)
  is_learning_candidate: boolean // true = trusted window, false = do not learn
}


// ─── RAW EVENT ACCUMULATORS ──────────────────────────────────────────────────

interface RawAccumulators {
  keyTimes: number[]
  keyHolds: number[]
  keyHoldStart: number
  corrections: number
  totalKeys: number
  pauses: number
  lastKeyTime: number
  scrollEvents: number[]
  scrollDirectionChanges: number
  lastScrollDir: number
  mousePositions: { x: number; y: number; t: number }[]
  touchEvents: { duration: number; area: number }[]
}

function emptyAccumulators(): RawAccumulators {
  return {
    keyTimes: [],
    keyHolds: [],
    keyHoldStart: 0,
    corrections: 0,
    totalKeys: 0,
    pauses: 0,
    lastKeyTime: 0,
    scrollEvents: [],
    scrollDirectionChanges: 0,
    lastScrollDir: 0,
    mousePositions: [],
    touchEvents: [],
  }
}

// ─── STATE TRANSITION MAP ────────────────────────────────────────────────────

const VALID_TRANSITIONS: Record<SDKState, SDKState[]> = {
  INITIALIZING: ['OBSERVING'],
  OBSERVING:    ['LEARNING', 'TRANSACTION', 'FINISHED'],
  LEARNING:     ['OBSERVING', 'TRANSACTION', 'FINISHED'],
  TRANSACTION:  ['OBSERVING', 'VERIFYING', 'FINISHED'],
  VERIFYING:    ['OBSERVING', 'TRANSACTION', 'FINISHED'],
  FINISHED:     [],
}

// ─── IDLE DETECTION ──────────────────────────────────────────────────────────

const IDLE_THRESHOLD_MS = 5000  // 5s of no events → idle
const WINDOW_INTERVAL_MS = 2000 // behavioral windows every 2 seconds


// ─── MAIN SDK CLASS ──────────────────────────────────────────────────────────

export type SDKStateChangeCallback = (state: SDKState, prev: SDKState) => void
export type WindowCallback = (window: BehaviorWindow) => void

export class AegisBehavioralSDK {
  private _state: SDKState = 'INITIALIZING'
  private _session: SessionContext | null = null
  private _device: DeviceContext | null = null
  private _transaction: TransactionContext = {
    amount: 0,
    beneficiary: '',
    category: 'idle',
    paymentMethod: 'none',
    isNewBeneficiary: false,
    frequency: 0,
  }

  private _accumulators: RawAccumulators = emptyAccumulators()
  private _windowId: number = 0
  private _windowTimer: ReturnType<typeof setInterval> | null = null
  private _idleTimer: ReturnType<typeof setTimeout> | null = null
  private _isIdle: boolean = false

  // Listeners
  private _onStateChange: SDKStateChangeCallback | null = null
  private _onWindow: WindowCallback | null = null

  // Bound DOM handlers (stored for removal)
  private _onKeyDown = this._handleKeyDown.bind(this)
  private _onKeyUp = this._handleKeyUp.bind(this)
  private _onScroll = this._handleScroll.bind(this)
  private _onMouseMove = this._handleMouseMove.bind(this)
  private _onTouchStart = this._handleTouchStart.bind(this)
  private _onTouchEnd = this._handleTouchEnd.bind(this)
  private _onVisibilityChange = this._handleVisibilityChange.bind(this)
  private _onDeviceOrientation = this._handleDeviceOrientation.bind(this)
  private _touchStartTime: number = 0
  private _touchArea: number = 0
  private _orientationSamples: number[] = []

  // ── LIFECYCLE ────────────────────────────────────────────────────────────

  /**
   * Initialize the SDK immediately on application launch.
   * This is called ONCE when the app mounts — before any screen renders.
   */
  initialize(userId: string, sessionId: string): void {
    if (this._state !== 'INITIALIZING') return

    const now = Date.now()
    this._device = this._collectDeviceContext()

    this._session = {
      sessionId,
      userId,
      startTime: now,
      activeTimeMs: 0,
      idleTimeMs: 0,
      lastActivityTime: now,
      currentScreen: 'launch',
      previousScreen: 'launch',
      navigationPath: ['launch'],
      timePerScreen: { launch: 0 },
      screenEnteredAt: now,
    }

    // Attach DOM listeners immediately — before any transaction begins
    document.addEventListener('keydown', this._onKeyDown, { passive: true })
    document.addEventListener('keyup', this._onKeyUp, { passive: true })
    document.addEventListener('scroll', this._onScroll, { passive: true, capture: true })
    document.addEventListener('mousemove', this._onMouseMove, { passive: true })
    document.addEventListener('touchstart', this._onTouchStart, { passive: true })
    document.addEventListener('touchend', this._onTouchEnd, { passive: true })
    document.addEventListener('visibilitychange', this._onVisibilityChange)

    // Mobile-specific: device orientation for real gyroscope data
    if (typeof DeviceOrientationEvent !== 'undefined') {
      window.addEventListener('deviceorientation', this._onDeviceOrientation as any, { passive: true })
    }

    // Start 2-second window emitter
    this._windowTimer = setInterval(() => this._flushWindow(), WINDOW_INTERVAL_MS)

    this._transition('OBSERVING')
  }

  /**
   * Notify the SDK of a screen navigation event.
   * Called by the banking app on every route/screen change.
   */
  notifyScreenChange(screen: AppScreen): void {
    if (!this._session) return

    const now = Date.now()
    const prev = this._session.currentScreen
    if (prev === screen) return

    // Accumulate time spent on previous screen
    const timeOnPrev = now - this._session.screenEnteredAt
    this._session.timePerScreen[prev] = (this._session.timePerScreen[prev] ?? 0) + timeOnPrev

    this._session.previousScreen = prev
    this._session.currentScreen = screen
    this._session.screenEnteredAt = now
    this._session.navigationPath.push(screen)

    // State transitions based on screen
    const isTransactionScreen = ['transfer', 'send', 'review', 'amount', 'pin'].includes(screen)
    const isVerifyScreen = ['pin', 'otp', 'biometric'].includes(screen)

    if (isVerifyScreen && this._state === 'TRANSACTION') {
      this._transition('VERIFYING')
    } else if (isTransactionScreen && (this._state === 'OBSERVING' || this._state === 'LEARNING')) {
      this._transition('TRANSACTION')
    } else if (screen === 'success' || screen === 'home') {
      if (this._state === 'TRANSACTION' || this._state === 'VERIFYING') {
        this._transition('OBSERVING')
      }
    }
  }


  /**
   * Update transaction context.
   * Called when amount/beneficiary/category changes in the payment flow.
   */
  setTransactionContext(ctx: Partial<TransactionContext>): void {
    this._transaction = { ...this._transaction, ...ctx }
    if ((ctx.amount ?? 0) > 0 || ctx.beneficiary) {
      if (this._state === 'OBSERVING' || this._state === 'LEARNING') {
        this._transition('TRANSACTION')
      }
    }
  }

  /**
   * Mark that learning phase has started (enough windows collected).
   * The host app can call this after N windows, or the SDK auto-transitions.
   */
  markLearning(): void {
    if (this._state === 'OBSERVING') this._transition('LEARNING')
  }

  /**
   * End the session. Detaches all listeners, stops window emission,
   * and transitions to FINISHED.
   */
  endSession(): SessionSummary | null {
    if (this._state === 'FINISHED' || !this._session) return null
    this._transition('FINISHED')
    this._cleanup()

    const now = Date.now()
    const totalMs = now - this._session.startTime
    const summary: SessionSummary = {
      sessionId: this._session.sessionId,
      userId: this._session.userId,
      startTime: this._session.startTime,
      endTime: now,
      totalDurationMs: totalMs,
      activeTimeMs: this._session.activeTimeMs,
      idleTimeMs: totalMs - this._session.activeTimeMs,
      totalWindows: this._windowId,
      navigationPath: this._session.navigationPath,
      timePerScreen: this._session.timePerScreen,
      device: this._device!,
      transactionCount: this._transaction.frequency,
    }
    return summary
  }

  // ── CALLBACKS ────────────────────────────────────────────────────────────

  onStateChange(cb: SDKStateChangeCallback): void { this._onStateChange = cb }
  onWindow(cb: WindowCallback): void { this._onWindow = cb }

  // ── GETTERS ──────────────────────────────────────────────────────────────

  get state(): SDKState { return this._state }
  get session(): SessionContext | null { return this._session }
  get device(): DeviceContext | null { return this._device }
  get windowCount(): number { return this._windowId }
  get currentScreen(): AppScreen { return this._session?.currentScreen ?? 'launch' }

  // ── STATE MACHINE ────────────────────────────────────────────────────────

  private _transition(next: SDKState): void {
    const allowed = VALID_TRANSITIONS[this._state]
    if (!allowed.includes(next)) {
      console.warn(`[AEGIS-X SDK] Invalid transition ${this._state} → ${next}`)
      return
    }
    const prev = this._state
    this._state = next
    this._onStateChange?.(next, prev)
  }


  // ── DOM EVENT HANDLERS ───────────────────────────────────────────────────

  private _handleKeyDown(e: KeyboardEvent): void {
    const now = performance.now()
    this._markActivity()
    if (e.key === 'Backspace') this._accumulators.corrections++
    this._accumulators.totalKeys++
    if (this._accumulators.lastKeyTime > 0 && now - this._accumulators.lastKeyTime > 2000) {
      this._accumulators.pauses++
    }
    this._accumulators.keyTimes.push(now)
    this._accumulators.keyHoldStart = now
    this._accumulators.lastKeyTime = now
  }

  private _handleKeyUp(): void {
    if (this._accumulators.keyHoldStart > 0) {
      this._accumulators.keyHolds.push(performance.now() - this._accumulators.keyHoldStart)
      this._accumulators.keyHoldStart = 0
    }
  }

  private _handleScroll(e: Event): void {
    const now = performance.now()
    this._markActivity()
    this._accumulators.scrollEvents.push(now)
    const dir = (e as WheelEvent).deltaY > 0 ? 1 : -1
    if (this._accumulators.lastScrollDir !== 0 && dir !== this._accumulators.lastScrollDir) {
      this._accumulators.scrollDirectionChanges++
    }
    this._accumulators.lastScrollDir = dir
  }

  private _handleMouseMove(e: MouseEvent): void {
    const now = performance.now()
    const pts = this._accumulators.mousePositions
    if (pts.length === 0 || now - pts[pts.length - 1].t > 50) {
      this._markActivity()
      pts.push({ x: e.clientX, y: e.clientY, t: now })
    }
  }

  private _handleTouchStart(e: TouchEvent): void {
    this._markActivity()
    this._touchStartTime = performance.now()
    if (e.touches.length > 0) {
      const t = e.touches[0]
      // radiusX/radiusY give contact ellipse size, normalize to [0,1]
      const rx = (t as any).radiusX ?? 10
      const ry = (t as any).radiusY ?? 10
      this._touchArea = Math.min(1, (rx * ry * Math.PI) / 3000)
    }
  }

  private _handleTouchEnd(): void {
    const duration = performance.now() - this._touchStartTime
    if (duration > 0) {
      this._accumulators.touchEvents.push({ duration, area: this._touchArea })
    }
  }

  private _handleVisibilityChange(): void {
    if (document.hidden) {
      this._isIdle = true
    } else {
      this._markActivity()
    }
  }

  private _handleDeviceOrientation(e: DeviceOrientationEvent): void {
    // Capture real gyroscope data on mobile devices
    // Filter out orientation FLIPS (portrait↔landscape transitions)
    // which produce large spikes that are NOT behavioral indicators
    if (e.alpha !== null && e.beta !== null && e.gamma !== null) {
      const magnitude = Math.sqrt((e.beta ?? 0) ** 2 + (e.gamma ?? 0) ** 2)
      // Ignore extreme values (>80) which indicate device rotation, not hand tremor
      if (magnitude < 80) {
        this._orientationSamples.push(magnitude)
        if (this._orientationSamples.length > 50) {
          this._orientationSamples = this._orientationSamples.slice(-50)
        }
      }
    }
  }

  // ── IDLE MANAGEMENT ──────────────────────────────────────────────────────

  private _markActivity(): void {
    const now = Date.now()
    if (!this._session) return

    if (this._isIdle) {
      // Coming back from idle — account for idle gap
      const idleGap = now - this._session.lastActivityTime
      this._session.idleTimeMs += idleGap
      this._isIdle = false
    }
    this._session.lastActivityTime = now
    this._session.activeTimeMs += WINDOW_INTERVAL_MS / 1000 // approximate

    // Reset idle detection timer
    if (this._idleTimer) clearTimeout(this._idleTimer)
    this._idleTimer = setTimeout(() => { this._isIdle = true }, IDLE_THRESHOLD_MS)
  }


  // ── FEATURE WINDOW COMPUTATION ───────────────────────────────────────────

  private _flushWindow(): void {
    if (!this._session || this._state === 'INITIALIZING' || this._state === 'FINISHED') return

    const acc = this._accumulators
    const now = Date.now()
    const elapsedS = WINDOW_INTERVAL_MS / 1000
    const sessionElapsedS = (now - this._session.startTime) / 1000

    // If user is idle (no activity for 5s+), emit a neutral "idle" window
    // that won't trigger false alarms. Idle = reading, thinking, away from device.
    if (this._isIdle && acc.totalKeys === 0 && acc.mousePositions.length === 0 && acc.touchEvents.length === 0) {
      this._accumulators = emptyAccumulators()
      const idleWindow: BehaviorWindow = {
        windowId: ++this._windowId, timestamp: now, sdkState: this._state,
        typing_speed_cps: 0, typing_rhythm_variance: 35,
        typing_pressure_mean: 0.5, correction_rate: 0,
        hesitation_ratio: 0.15, hesitation_count: 0, backspace_rate: 0,
        swipe_velocity_mean: 0, swipe_velocity_variance: 0,
        swipe_straightness: 0.82, touch_duration_mean: 120,
        touch_duration_variance: 500, touch_area_mean: 0.4,
        scroll_speed_mean: 0, scroll_direction_changes: 0,
        pointer_velocity: 0, pointer_straightness: 0.85,
        gyroscope_variance: 0.012,
        session_time_elapsed: sessionElapsedS % 3600,
        interaction_intensity: 0, idle_ratio: 1.0,
        current_screen: this._session.currentScreen,
        navigation_depth: this._session.navigationPath.length,
        time_on_current_screen: (now - this._session.screenEnteredAt) / 1000,
        hour_of_day: new Date(now).getHours(), day_of_week: new Date(now).getDay(),
        transaction_amount: this._transaction.amount,
        is_new_beneficiary: this._transaction.isNewBeneficiary,
        transaction_category: this._transaction.category,
        transaction_count: this._transaction.frequency,
        is_learning_candidate: false,  // NEVER learn from idle windows
      }
      this._onWindow?.(idleWindow)
      return
    }

    // Typing features
    const typingSpeed = Math.min(12, acc.totalKeys / Math.max(elapsedS, 0.1))
    const correctionRate = acc.totalKeys > 0 ? acc.corrections / acc.totalKeys : 0
    const backspaceRate = acc.totalKeys > 0 ? acc.corrections / acc.totalKeys : 0
    const hesitationRatio = acc.totalKeys > 0 ? acc.pauses / acc.totalKeys : 0

    let keyFlightMean = 120
    let keyFlightVariance = 35
    if (acc.keyTimes.length > 1) {
      const flights: number[] = []
      for (let i = 1; i < acc.keyTimes.length; i++) {
        flights.push(acc.keyTimes[i] - acc.keyTimes[i - 1])
      }
      keyFlightMean = flights.reduce((a, b) => a + b, 0) / flights.length
      const mean = keyFlightMean
      // ACTUAL statistical variance of inter-key timings
      // Low variance = consistent/rhythmic (natural or robotic)
      // High variance = erratic/irregular (stressed or distracted)
      keyFlightVariance = flights.length > 1
        ? flights.reduce((sum, f) => sum + (f - mean) ** 2, 0) / flights.length
        : 35
    }

    const keyHoldMean = acc.keyHolds.length > 0
      ? acc.keyHolds.reduce((a, b) => a + b, 0) / acc.keyHolds.length
      : 90
    const keyHoldVariance = acc.keyHolds.length > 1
      ? acc.keyHolds.reduce((s, h) => s + (h - keyHoldMean) ** 2, 0) / acc.keyHolds.length
      : 500

    // Touch features
    const touchMean = acc.touchEvents.length > 0
      ? acc.touchEvents.reduce((s, t) => s + t.duration, 0) / acc.touchEvents.length
      : keyHoldMean
    const touchAreaMean = acc.touchEvents.length > 0
      ? acc.touchEvents.reduce((s, t) => s + t.area, 0) / acc.touchEvents.length
      : 0.4

    // Pointer / mouse
    const { velocity: pointerVelocity, straightness: pointerStraightness } =
      this._computePointerMetrics(acc.mousePositions)

    // Scroll
    const scrollSpeed = Math.min(3, (acc.scrollEvents.length * 40) / 100)

    // Idle ratio
    const totalElapsed = now - this._session.startTime
    const idleRatio = totalElapsed > 0 ? this._session.idleTimeMs / totalElapsed : 0

    // Time on current screen (seconds)
    const timeOnScreen = (now - this._session.screenEnteredAt) / 1000

    // Time-of-day
    const nowDate = new Date(now)
    const hourOfDay = nowDate.getHours()
    const dayOfWeek = nowDate.getDay()

    // Gyroscope: use real device orientation on mobile, approximate from pointer on web
    let gyroVariance: number
    if (this._orientationSamples.length > 3) {
      const mean = this._orientationSamples.reduce((a, b) => a + b, 0) / this._orientationSamples.length
      gyroVariance = this._orientationSamples.reduce((s, v) => s + (v - mean) ** 2, 0) / this._orientationSamples.length / 10000
      gyroVariance = Math.min(0.5, gyroVariance)
      this._orientationSamples = []
    } else {
      gyroVariance = pointerVelocity > 2 ? 0.04 + Math.random() * 0.02 : 0.01 + Math.random() * 0.01
    }

    // Interaction intensity
    const interactionIntensity = Math.min(50,
      acc.totalKeys + acc.mousePositions.length + acc.scrollEvents.length + acc.touchEvents.length
    )

    // Spam/rapid activity detection: compute effective hesitation accounting
    // for impossible human rates. If > 24 keys in 2s (12 CPS) and rhythm
    // variance is < 500ms², hesitation should be forced to 0 (no human pauses)
    let effectiveHesitation = hesitationRatio
    if (typingSpeed > 7 && keyFlightVariance < 500) {
      effectiveHesitation = Math.min(hesitationRatio, 0.02) // suppress false hesitation
    }

    const window: BehaviorWindow = {
      windowId: ++this._windowId,
      timestamp: now,
      sdkState: this._state,

      typing_speed_cps: typingSpeed,
      // Use actual inter-key timing variance (ms²)
      // Low (<10) = very consistent (robotic signature)
      // Normal (20-60) = natural human rhythm
      // High (>100) = erratic (stressed/distracted)
      typing_rhythm_variance: Math.min(350, keyFlightVariance),
      typing_pressure_mean: Math.min(1, 0.5 + (typingSpeed / 12) * 0.3),
      correction_rate: correctionRate,
      hesitation_ratio: effectiveHesitation,
      hesitation_count: acc.pauses,
      backspace_rate: backspaceRate,

      swipe_velocity_mean: pointerVelocity,
      swipe_velocity_variance: Math.abs(pointerVelocity - 1.0) * 0.3,
      swipe_straightness: pointerStraightness,
      touch_duration_mean: acc.touchEvents.length > 0 ? touchMean : keyHoldMean,
      touch_duration_variance: Math.min(6000, keyHoldVariance),
      touch_area_mean: touchAreaMean,

      scroll_speed_mean: scrollSpeed,
      scroll_direction_changes: acc.scrollDirectionChanges,

      pointer_velocity: pointerVelocity,
      pointer_straightness: pointerStraightness,

      gyroscope_variance: gyroVariance,

      session_time_elapsed: sessionElapsedS % 3600,
      interaction_intensity: interactionIntensity,
      idle_ratio: idleRatio,

      current_screen: this._session.currentScreen,
      navigation_depth: this._session.navigationPath.length,
      time_on_current_screen: timeOnScreen,

      hour_of_day: hourOfDay,
      day_of_week: dayOfWeek,

      transaction_amount: this._transaction.amount,
      is_new_beneficiary: this._transaction.isNewBeneficiary,
      transaction_category: this._transaction.category,
      transaction_count: this._transaction.frequency,

      // Learning candidate: true if SDK is in a trusted state (OBSERVING/LEARNING)
      // and not idle. The backend makes the final decision.
      is_learning_candidate: (this._state === 'OBSERVING' || this._state === 'LEARNING') && !this._isIdle,
    }

    // Reset raw accumulators for next window
    this._accumulators = emptyAccumulators()

    // Auto-transition: after 5 OBSERVING windows → LEARNING
    if (this._state === 'OBSERVING' && this._windowId >= 5) {
      this._transition('LEARNING')
    }

    this._onWindow?.(window)
  }

  private _computePointerMetrics(pts: { x: number; y: number; t: number }[]): {
    velocity: number
    straightness: number
  } {
    if (pts.length < 3) return { velocity: 1.0, straightness: 0.85 }
    let totalDist = 0, totalTime = 0
    for (let i = 1; i < pts.length; i++) {
      const dx = pts[i].x - pts[i - 1].x, dy = pts[i].y - pts[i - 1].y
      totalDist += Math.sqrt(dx * dx + dy * dy)
      totalTime += pts[i].t - pts[i - 1].t
    }
    const first = pts[0], last = pts[pts.length - 1]
    const directDist = Math.sqrt((last.x - first.x) ** 2 + (last.y - first.y) ** 2)
    const velocity = totalTime > 0 ? Math.min(5, (totalDist / totalTime) * 1000 / 500) : 1.0
    const straightness = totalDist > 0 ? Math.min(1, directDist / totalDist) : 0.85
    return { velocity, straightness }
  }


  // ── DEVICE CONTEXT ───────────────────────────────────────────────────────

  private _collectDeviceContext(): DeviceContext {
    const nav = navigator
    return {
      userAgent: nav.userAgent,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      orientation: window.screen.width > window.screen.height ? 'landscape' : 'portrait',
      language: nav.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      platform: nav.platform,
      hardwareConcurrency: nav.hardwareConcurrency ?? 4,
      deviceMemoryGB: (nav as any).deviceMemory ?? 4,
    }
  }

  // ── CLEANUP ──────────────────────────────────────────────────────────────

  private _cleanup(): void {
    if (this._windowTimer) { clearInterval(this._windowTimer); this._windowTimer = null }
    if (this._idleTimer) { clearTimeout(this._idleTimer); this._idleTimer = null }
    document.removeEventListener('keydown', this._onKeyDown)
    document.removeEventListener('keyup', this._onKeyUp)
    document.removeEventListener('scroll', this._onScroll, true)
    document.removeEventListener('mousemove', this._onMouseMove)
    document.removeEventListener('touchstart', this._onTouchStart)
    document.removeEventListener('touchend', this._onTouchEnd)
    document.removeEventListener('visibilitychange', this._onVisibilityChange)
    window.removeEventListener('deviceorientation', this._onDeviceOrientation as any)

    // Finalize time on current screen
    if (this._session) {
      const now = Date.now()
      const timeOnLast = now - this._session.screenEnteredAt
      this._session.timePerScreen[this._session.currentScreen] =
        (this._session.timePerScreen[this._session.currentScreen] ?? 0) + timeOnLast
    }
  }
}

// ─── SESSION SUMMARY ─────────────────────────────────────────────────────────

export interface SessionSummary {
  sessionId: string
  userId: string
  startTime: number
  endTime: number
  totalDurationMs: number
  activeTimeMs: number
  idleTimeMs: number
  totalWindows: number
  navigationPath: AppScreen[]
  timePerScreen: Record<string, number>
  device: DeviceContext
  transactionCount: number
}

// ─── WINDOW → BACKEND EVENT CONVERTER ────────────────────────────────────────

/**
 * Converts a BehaviorWindow into the legacy 16-feature event format
 * that the existing backend pipeline expects. This ensures full
 * backward compatibility while carrying richer context fields.
 */
export function windowToBackendEvent(w: BehaviorWindow): Record<string, number | boolean | string> {
  return {
    typing_speed_cps: w.typing_speed_cps,
    typing_rhythm_variance: w.typing_rhythm_variance,
    typing_pressure_mean: w.typing_pressure_mean,
    swipe_velocity_mean: w.swipe_velocity_mean,
    swipe_velocity_variance: w.swipe_velocity_variance,
    swipe_straightness: w.swipe_straightness,
    touch_duration_mean: w.touch_duration_mean,
    touch_duration_variance: w.touch_duration_variance,
    touch_area_mean: w.touch_area_mean,
    hesitation_ratio: w.hesitation_ratio,
    hesitation_count: w.hesitation_count,
    correction_rate: w.correction_rate,
    scroll_speed_mean: w.scroll_speed_mean,
    gyroscope_variance: w.gyroscope_variance,
    session_time_elapsed: w.session_time_elapsed,
    interaction_intensity: w.interaction_intensity,
  }
}

// ─── SINGLETON EXPORT ─────────────────────────────────────────────────────────

export const aegisSDK = new AegisBehavioralSDK()
