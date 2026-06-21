import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Shield, Activity, Brain, Fingerprint, AlertTriangle, Zap, Radio } from 'lucide-react'

const SCENARIOS = {
  normal: { label: 'Normal User', color: '#10b981' },
  scam: { label: 'Scam Victim', color: '#f59e0b' },
  malware: { label: 'Malware Bot', color: '#ef4444' },
}

type Scenario = keyof typeof SCENARIOS

function getTrustColor(score: number) {
  if (score > 85) return '#10b981'
  if (score > 60) return '#f59e0b'
  if (score > 40) return '#f97316'
  return '#ef4444'
}

function getDecision(score: number) {
  if (score > 85) return { label: 'ALLOW', color: '#10b981', bg: 'rgba(16,185,129,0.1)' }
  if (score > 60) return { label: 'STEP-UP', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' }
  return { label: 'BLOCK', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' }
}

const COGNITIVE_STATES: Record<string, { color: string; label: string }> = {
  calm: { color: '#10b981', label: 'CALM' },
  focused: { color: '#3b82f6', label: 'FOCUSED' },
  distressed: { color: '#f59e0b', label: 'DISTRESSED' },
  panicked: { color: '#f97316', label: 'PANICKED' },
  coerced: { color: '#ef4444', label: 'COERCED' },
  robotic: { color: '#8b5cf6', label: 'ROBOTIC' },
}

const LiveMonitor: React.FC = () => {
  const [scenario, setScenario] = useState<Scenario>('normal')
  const [trustScore, setTrustScore] = useState(95)
  const [similarity, setSimilarity] = useState(0.994)
  const [cognitiveState, setCognitiveState] = useState('calm')
  const [driftDetected, setDriftDetected] = useState(false)
  const [eventCount, setEventCount] = useState(0)
  const [velocity, setVelocity] = useState(0)

  const simulateTick = useCallback(() => {
    setEventCount(c => c + 1)
    if (scenario === 'normal') {
      setTrustScore(p => Math.min(99, Math.max(90, p + (Math.random() * 4 - 2))))
      setSimilarity(p => Math.min(1, Math.max(0.96, p + (Math.random() * 0.01 - 0.005))))
      setCognitiveState(Math.random() > 0.3 ? 'calm' : 'focused')
      setDriftDetected(false)
      setVelocity(v => +(Math.random() * 0.004 - 0.002).toFixed(4))
    } else if (scenario === 'scam') {
      setTrustScore(p => Math.max(25, p - (Math.random() * 8 + 2)))
      setSimilarity(p => Math.max(0.55, p - (Math.random() * 0.04 + 0.01)))
      const states = ['distressed', 'panicked', 'panicked', 'coerced']
      setCognitiveState(states[Math.min(Math.floor(eventCount / 3), states.length - 1)])
      setDriftDetected(eventCount > 2)
      setVelocity(v => +(-(Math.random() * 0.06 + 0.02)).toFixed(4))
    } else {
      setTrustScore(p => Math.max(20, p - (Math.random() * 12 + 5)))
      setSimilarity(p => Math.max(0.4, p - (Math.random() * 0.06 + 0.02)))
      setCognitiveState('robotic')
      setDriftDetected(true)
      setVelocity(v => +(-(Math.random() * 0.1 + 0.04)).toFixed(4))
    }
  }, [scenario, eventCount])

  useEffect(() => {
    const id = setInterval(simulateTick, 2000)
    return () => clearInterval(id)
  }, [simulateTick])

  useEffect(() => {
    setTrustScore(95)
    setSimilarity(0.994)
    setCognitiveState('calm')
    setDriftDetected(false)
    setEventCount(0)
    setVelocity(0)
  }, [scenario])

  const decision = getDecision(trustScore)
  const trustColor = getTrustColor(trustScore)
  const cogState = COGNITIVE_STATES[cognitiveState] || COGNITIVE_STATES.calm

  const radius = 80
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (trustScore / 100) * circumference

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, fontFamily: 'Space Grotesk', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Radio size={20} color="#10b981" /> Live Session Monitor
          </h1>
          <p style={{ color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', fontSize: 12, marginTop: 4 }}>
            Real-time continuous trust scoring • Updates every 2 seconds
          </p>
        </div>
        {/* Demo Mode Panel */}
        <div style={{ display: 'flex', gap: 8 }}>
          {(Object.keys(SCENARIOS) as Scenario[]).map(key => (
            <button
              key={key}
              onClick={() => setScenario(key)}
              style={{
                padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                fontFamily: 'JetBrains Mono', cursor: 'pointer', transition: 'all 0.2s',
                background: scenario === key ? `${SCENARIOS[key].color}20` : 'var(--bg-card)',
                border: `1px solid ${scenario === key ? SCENARIOS[key].color : 'var(--border-light)'}`,
                color: scenario === key ? SCENARIOS[key].color : 'var(--text-sub)',
              }}
            >
              {SCENARIOS[key].label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, marginBottom: 24 }}>

        {/* Trust Gauge — Hero */}
        <div style={{
          background: 'var(--bg-panel)', border: '1px solid var(--border-light)',
          borderRadius: 16, padding: 32, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(to right, ${trustColor}, transparent)` }} />
          <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', marginBottom: 16, letterSpacing: '0.1em' }}>TRUST SCORE</div>
          <div style={{ position: 'relative', width: 200, height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="200" height="200" style={{ transform: 'rotate(-90deg)', position: 'absolute' }}>
              <circle cx="100" cy="100" r={radius} stroke="rgba(255,255,255,0.05)" strokeWidth="12" fill="none" />
              <motion.circle
                cx="100" cy="100" r={radius} fill="none"
                stroke={trustColor} strokeWidth="12" strokeLinecap="round"
                strokeDasharray={circumference}
                animate={{ strokeDashoffset }}
                transition={{ duration: 1, ease: 'easeInOut' }}
                style={{ filter: `drop-shadow(0 0 8px ${trustColor}50)` }}
              />
            </svg>
            <motion.div
              key={trustScore}
              initial={{ scale: 0.9, opacity: 0.5 }}
              animate={{ scale: 1, opacity: 1 }}
              style={{ fontSize: 56, fontWeight: 700, fontFamily: 'Space Grotesk', color: trustColor }}
            >
              {Math.round(trustScore)}
            </motion.div>
          </div>
          <div style={{ marginTop: 12, fontSize: 11, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>
            dT/dt: <span style={{ color: velocity < -0.01 ? '#ef4444' : '#10b981' }}>{velocity > 0 ? '+' : ''}{velocity}</span>
          </div>
        </div>

        {/* Decision + State */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Decision Card */}
          <div style={{
            background: 'var(--bg-panel)', border: '1px solid var(--border-light)',
            borderRadius: 12, padding: 20, flex: 1,
          }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', marginBottom: 8, letterSpacing: '0.08em' }}>DECISION</div>
            <AnimatePresence mode="wait">
              <motion.div
                key={decision.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                style={{
                  fontSize: 28, fontWeight: 700, fontFamily: 'JetBrains Mono',
                  color: decision.color, background: decision.bg,
                  padding: '8px 16px', borderRadius: 8, display: 'inline-block',
                }}
              >
                {decision.label}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Cognitive State */}
          <div style={{
            background: 'var(--bg-panel)', border: '1px solid var(--border-light)',
            borderRadius: 12, padding: 20, flex: 1,
          }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', marginBottom: 8, letterSpacing: '0.08em' }}>COGNITIVE STATE</div>
            <AnimatePresence mode="wait">
              <motion.div
                key={cognitiveState}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                style={{ display: 'flex', alignItems: 'center', gap: 10 }}
              >
                <Brain size={20} color={cogState.color} />
                <span style={{ fontSize: 22, fontWeight: 700, fontFamily: 'JetBrains Mono', color: cogState.color }}>
                  {cogState.label}
                </span>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Metrics Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { label: 'SIMILARITY', value: similarity.toFixed(4), icon: <Fingerprint size={16} />, color: similarity > 0.85 ? '#10b981' : similarity > 0.6 ? '#f59e0b' : '#ef4444' },
            { label: 'DRIFT', value: driftDetected ? 'DETECTED' : 'NONE', icon: <AlertTriangle size={16} />, color: driftDetected ? '#ef4444' : '#10b981' },
            { label: 'EVENTS', value: String(eventCount), icon: <Activity size={16} />, color: '#3b82f6' },
            { label: 'LATENCY', value: '~65ms', icon: <Zap size={16} />, color: '#8b5cf6' },
          ].map((m, i) => (
            <div key={i} style={{
              background: 'var(--bg-panel)', border: '1px solid var(--border-light)',
              borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: m.color }}>{m.icon}</span>
                <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>{m.label}</span>
              </div>
              <span style={{ fontSize: 14, fontWeight: 600, fontFamily: 'JetBrains Mono', color: m.color }}>{m.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Alert Banner */}
      <AnimatePresence>
        {(cognitiveState === 'panicked' || cognitiveState === 'coerced' || cognitiveState === 'robotic') && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12,
            }}
          >
            <AlertTriangle size={20} color="#ef4444" />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#ef4444', fontFamily: 'Space Grotesk' }}>
                {cognitiveState === 'robotic' ? 'AUTOMATED BEHAVIOR DETECTED' : 'POTENTIAL SOCIAL ENGINEERING'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-sub)', fontFamily: 'JetBrains Mono', marginTop: 2 }}>
                {cognitiveState === 'robotic'
                  ? 'Near-zero variance detected across all behavioral features. Possible remote access malware.'
                  : 'Elevated hesitation, correction frequency, and cognitive instability suggest external coercion.'}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default LiveMonitor
