import { FeatureExtractor, BehavioralFeatures } from '../core/processors/FeatureExtractor'

export type FlushCallback = (features: BehavioralFeatures) => void

export class BrowserSDK {
  private extractor: FeatureExtractor
  private flushInterval: number
  private intervalId: ReturnType<typeof setInterval> | null = null
  private isRunning: boolean = false
  private onFlushCallbacks: FlushCallback[] = []

  constructor(flushIntervalMs: number = 2000) {
    this.extractor = new FeatureExtractor()
    this.flushInterval = flushIntervalMs
  }

  start() {
    if (this.isRunning) return
    this.isRunning = true
    this.extractor.start()

    document.addEventListener('keydown', this.handleKeyDown)
    document.addEventListener('mousedown', this.handleMouseDown)
    document.addEventListener('mouseup', this.handleMouseUp)
    document.addEventListener('click', this.handleClick)

    this.intervalId = setInterval(() => this.flush(), this.flushInterval)
  }

  stop() {
    this.isRunning = false
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    this.extractor.stop()
    document.removeEventListener('keydown', this.handleKeyDown)
    document.removeEventListener('mousedown', this.handleMouseDown)
    document.removeEventListener('mouseup', this.handleMouseUp)
    document.removeEventListener('click', this.handleClick)
  }

  onFlush(callback: FlushCallback) {
    this.onFlushCallbacks.push(callback)
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    this.extractor.recordKey(e.key)
  }

  private handleMouseDown = (e: MouseEvent) => {
    this.extractor.recordTouchStart(e.clientX, e.clientY)
  }

  private handleMouseUp = (e: MouseEvent) => {
    this.extractor.recordTouchEnd(e.clientX, e.clientY)
  }

  private handleClick = () => {
    this.extractor.recordScreenChange(window.location.pathname)
  }

  private flush() {
    if (!this.isRunning) return
    const features = this.extractor.extract()
    this.onFlushCallbacks.forEach(cb => cb(features))
    this.extractor.resetWindow()
  }
}
