import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { RotateCcw, Play, Circle, AlertTriangle, Shield, Brain, TrendingDown, Ban } from 'lucide-react'

const TIMELINE_EVENTS = [
  { time: '10:30:00', label: 'Session Started', type: 'info', trust: 95, state: 'calm', icon: <Shield size={14} />, detail: 'User authenticated via biometric. Baseline loaded.' },
  { time: '10:30:12', label: 'Normal Browsing', type: 'info', trust: 96, state: 'calm', icon: <Circle size={14} />, detail: 'Behavioral signals within baseline parameters. Trust stable.' },
  { time: '10:31:04', label: 'Transaction Initiated', type: 'info', trust: 94, state: 'focused', icon: <Circle size={14} />, detail: 'User navigates to payment screen. ₹2,00,000 to unknown account.' },
  { time: '10:31:18', label: 'Hesitation Spike', type: 'warning', trust: 87, state: 'distressed', icon: <AlertTriangle size={14} />, detail: 'Hesitation ratio jumped to 0.42. Typing rhythm variance increased 3x.' },
  { time: '10:31:32', label: 'Behavioral Drift Detected', type: 'warning', trust: 78, state: 'distressed', icon: <TrendingDown size={14} />, detail: 'CUSUM triggered. Cumulative deviation exceeded threshold.' },
  { time: '10:31:48', label: 'Cognitive State: PANICKED', type: 'danger', trust: 68, state: 'panicked', icon: <Brain size={14} />, detail: 'Random Forest classified state as PANICKED. Correction rate 4x baseline.' },
  { time: '10:32:02', label: 'Trust Velocity Critical', type: 'danger', trust: 55, state: 'panicked', icon: <TrendingDown size={14} />, detail: 'dT/dt = -0.06. Trust accelerating downward. Step-up requested.' },
  { time: '10:32:16', label: 'Cognitive State: COERCED', type: 'critical', trust: 42, state: 'coerced', icon: <Brain size={14} />, detail: 'External coercion indicators detected. Extreme hesitation + forced actions.' },
  { time: '10:32:28', label: 'TRANSACTION BLOCKED', type: 'critical', trust: 38, state: 'coerced', icon: <Ban size={14} />, detail: 'Trust below 0.60 + coercion state. Session terminated. Fraud review initiated.' },
]

const TYPE_COLORS: Record<string, string> = {
  info: '#3b82f6',
  warning: '#f59e0b',
  danger: '#f97316',
  critical: '#ef4444',
}

const SessionReplay: React.FC = () => {
  const [visibleCount, setVisibleCount] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)

  useEffect(() => {
    if (!isPlaying) return
    if (visibleCount >= TIMELINE_EVENTS.length) {
      setIsPlaying(false)
      return
    }
    const id = setTimeout(() => setVisibleCount(c => c + 1), 1200)
    return () => clearTimeout(id)
  }, [isPlaying, visibleCount])

  const handlePlay = () => {
    setVisibleCount(0)
    setIsPlaying(true)
  }

  const currentEvent = visibleCount > 0 ? TIMELINE_EVENTS[visibleCount - 1] : null

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, fontFamily: 'Space Grotesk', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <RotateCcw size={20} color="#8b5cf6" /> Session Replay
          </h1>
          <p style={{ color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', fontSize: 12, marginTop: 4 }}>
            Watch the attack progression unfold step by step
          </p>
        </div>
        <motion.button
          onClick={handlePlay}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          style={{
            padding: '10px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600,
            fontFamily: 'JetBrains Mono', cursor: 'pointer',
            background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', border: 'none',
            color: 'white', display: 'flex', alignItems: 'center', gap: 8,
            boxShadow: '0 0 20px rgba(139,92,246,0.3)',
          }}
        >
          <Play size={14} /> {isPlaying ? 'Replaying...' : 'Replay Attack'}
        </motion.button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24 }}>
        {/* Timeline */}
        <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-light)', borderRadius: 16, padding: 24 }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', marginBottom: 16, letterSpacing: '0.08em' }}>
            ATTACK TIMELINE — Social Engineering Scenario
          </div>

          <div style={{ position: 'relative', paddingLeft: 24 }}>
            {/* Vertical line */}
            <div style={{ position: 'absolute', left: 7, top: 0, bottom: 0, width: 2, background: 'rgba(255,255,255,0.05)' }} />

            <AnimatePresence>
              {TIMELINE_EVENTS.slice(0, visibleCount).map((event, i) => {
                const color = TYPE_COLORS[event.type]
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4 }}
                    style={{ marginBottom: 16, position: 'relative' }}
                  >
                    {/* Dot on timeline */}
                    <div style={{
                      position: 'absolute', left: -20, top: 6, width: 12, height: 12,
                      borderRadius: '50%', background: color, border: '2px solid var(--bg-panel)',
                      boxShadow: `0 0 8px ${color}60`,
                    }} />

                    <div style={{
                      background: `${color}08`, border: `1px solid ${color}25`,
                      borderRadius: 10, padding: '12px 16px',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ color }}>{event.icon}</span>
                          <span style={{ fontSize: 13, fontWeight: 600, color, fontFamily: 'Space Grotesk' }}>{event.label}</span>
                        </div>
                        <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>{event.time}</span>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-sub)', lineHeight: 1.5, marginLeft: 22 }}>{event.detail}</div>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>

            {visibleCount === 0 && (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, fontFamily: 'JetBrains Mono' }}>
                Press "Replay Attack" to watch the timeline unfold
              </div>
            )}
          </div>
        </div>

        {/* Side panel: Current state */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-light)', borderRadius: 12, padding: 20 }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', marginBottom: 10, letterSpacing: '0.08em' }}>CURRENT STATE</div>
            {currentEvent ? (
              <div>
                <div style={{ fontSize: 32, fontWeight: 700, fontFamily: 'Space Grotesk', color: currentEvent.trust > 85 ? '#10b981' : currentEvent.trust > 60 ? '#f59e0b' : '#ef4444' }}>
                  {currentEvent.trust}%
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', marginTop: 4 }}>Trust Score</div>
                <div style={{ marginTop: 12, padding: '8px 12px', borderRadius: 6, background: `${TYPE_COLORS[currentEvent.type]}15`, border: `1px solid ${TYPE_COLORS[currentEvent.type]}30` }}>
                  <span style={{ fontSize: 12, fontWeight: 600, fontFamily: 'JetBrains Mono', color: TYPE_COLORS[currentEvent.type] }}>
                    {currentEvent.state.toUpperCase()}
                  </span>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Waiting for replay...</div>
            )}
          </div>

          <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-light)', borderRadius: 12, padding: 20 }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', marginBottom: 10, letterSpacing: '0.08em' }}>PROGRESS</div>
            <div style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
              <motion.div
                animate={{ width: `${(visibleCount / TIMELINE_EVENTS.length) * 100}%` }}
                style={{ height: '100%', background: 'linear-gradient(to right, #10b981, #ef4444)', borderRadius: 3 }}
              />
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', marginTop: 8 }}>
              {visibleCount} / {TIMELINE_EVENTS.length} events
            </div>
          </div>

          <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-light)', borderRadius: 12, padding: 20, fontSize: 11, color: 'var(--text-sub)', lineHeight: 1.7 }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', marginBottom: 8, letterSpacing: '0.08em' }}>SCENARIO</div>
            This replay demonstrates a social engineering attack where a scam caller coerces the victim into transferring ₹2,00,000.
            AEGIS-X detects the cognitive state progression and blocks the transaction within 2.5 minutes.
          </div>
        </div>
      </div>
    </div>
  )
}

export default SessionReplay
