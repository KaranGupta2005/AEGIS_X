import React, { useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Shield, Activity, Brain, Fingerprint, AlertTriangle, Zap, Radio, Wifi, WifiOff } from 'lucide-react'
import { useStore } from '../../services/store'
import { SimulatorScenario } from '../../services/api'

const SCENARIOS: { key: SimulatorScenario; label: string; color: string }[] = [
  { key: 'normal', label: 'Normal User', color: '#10b981' },
  { key: 'scam', label: 'Scam Victim', color: '#f59e0b' },
  { key: 'malware', label: 'Malware Bot', color: '#ef4444' },
]

function getTrustColor(score: number) {
  if (score > 85) return '#10b981'
  if (score > 60) return '#f59e0b'
  if (score > 40) return '#f97316'
  return '#ef4444'
}

function getDecision(d: string) {
  if (d === 'ALLOW') return { label: 'ALLOW', color: '#10b981', bg: 'rgba(16,185,129,0.1)' }
  if (d === 'STEP_UP') return { label: 'STEP-UP', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' }
  return { label: 'BLOCK', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' }
}

const COGNITIVE_COLORS: Record<string, string> = {
  calm: '#10b981', focused: '#3b82f6', distressed: '#f59e0b',
  panicked: '#f97316', coerced: '#ef4444', robotic: '#8b5cf6',
}

const LiveMonitor: React.FC = () => {
  const { state, connect, switchScenario } = useStore()
  const { trustScore, decision, cognitiveState, similarity, driftDetected, eventCount, velocity, isConnected, scenario, latencyMs, confidence } = state

  useEffect(() => {
    if (!isConnected) {
      connect('normal')
    }
  }, [])

  const trustColor = getTrustColor(trustScore)
  const decisionInfo = getDecision(decision)
  const cogColor = COGNITIVE_COLORS[cognitiveState] || '#94a3b8'

  const radius = 80
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (trustScore / 100) * circumference

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 className="heading" style={{ fontSize: 24, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Radio size={20} color="#10b981" /> Live Session Monitor
          </h1>
          <p className="mono" style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
            {isConnected ? <><Wifi size={11} color="#10b981" /> Connected — streaming every 2s</> : <><WifiOff size={11} color="#ef4444" /> Disconnected</>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {SCENARIOS.map(s => (
            <button
              key={s.key}
              onClick={() => switchScenario(s.key)}
              className="mono"
              style={{
                padding: '8px 16px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                transition: 'all var(--transition-fast)',
                background: scenario === s.key ? `${s.color}18` : 'var(--bg-card)',
                border: `1px solid ${scenario === s.key ? s.color : 'var(--border-light)'}`,
                color: scenario === s.key ? s.color : 'var(--text-sub)',
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, marginBottom: 24 }}>
        {/* Trust Gauge */}
        <div className="card-base" style={{ padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(to right, ${trustColor}, transparent)` }} />
          <div className="label-xs" style={{ marginBottom: 16 }}>TRUST SCORE</div>
          <div style={{ position: 'relative', width: 200, height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="200" height="200" style={{ transform: 'rotate(-90deg)', position: 'absolute' }}>
              <circle cx="100" cy="100" r={radius} stroke="rgba(255,255,255,0.04)" strokeWidth="12" fill="none" />
              <motion.circle cx="100" cy="100" r={radius} fill="none" stroke={trustColor} strokeWidth="12" strokeLinecap="round" strokeDasharray={circumference} animate={{ strokeDashoffset }} transition={{ duration: 0.8, ease: 'easeInOut' }} style={{ filter: `drop-shadow(0 0 10px ${trustColor}40)` }} />
            </svg>
            <motion.div key={Math.round(trustScore)} initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="heading" style={{ fontSize: 52, fontWeight: 700, color: trustColor }}>
              {Math.round(trustScore)}
            </motion.div>
          </div>
          <div className="mono" style={{ marginTop: 12, fontSize: 11, color: 'var(--text-muted)' }}>
            dT/dt: <span style={{ color: velocity < -0.01 ? '#ef4444' : '#10b981' }}>{velocity > 0 ? '+' : ''}{velocity.toFixed(4)}</span>
          </div>
        </div>

        {/* Decision + Cognitive */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card-base" style={{ padding: 20, flex: 1 }}>
            <div className="label-xs" style={{ marginBottom: 10 }}>DECISION</div>
            <AnimatePresence mode="wait">
              <motion.div key={decision} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="mono" style={{ fontSize: 26, fontWeight: 700, color: decisionInfo.color, background: decisionInfo.bg, padding: '8px 16px', borderRadius: 8, display: 'inline-block' }}>
                {decisionInfo.label}
              </motion.div>
            </AnimatePresence>
          </div>
          <div className="card-base" style={{ padding: 20, flex: 1 }}>
            <div className="label-xs" style={{ marginBottom: 10 }}>COGNITIVE STATE</div>
            <AnimatePresence mode="wait">
              <motion.div key={cognitiveState} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Brain size={20} color={cogColor} />
                <span className="mono" style={{ fontSize: 20, fontWeight: 700, color: cogColor }}>{cognitiveState.toUpperCase()}</span>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Metrics */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { label: 'SIMILARITY', value: similarity.toFixed(4), icon: <Fingerprint size={15} />, color: similarity > 0.85 ? '#10b981' : similarity > 0.6 ? '#f59e0b' : '#ef4444' },
            { label: 'DRIFT', value: driftDetected ? 'DETECTED' : 'NONE', icon: <AlertTriangle size={15} />, color: driftDetected ? '#ef4444' : '#10b981' },
            { label: 'EVENTS', value: String(eventCount), icon: <Activity size={15} />, color: '#3b82f6' },
            { label: 'LATENCY', value: `${latencyMs.toFixed(0)}ms`, icon: <Zap size={15} />, color: '#8b5cf6' },
          ].map((m, i) => (
            <div key={i} className="card-base" style={{ padding: '11px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: m.color }}>{m.icon}</span>
                <span className="label-xs">{m.label}</span>
              </div>
              <span className="mono" style={{ fontSize: 13, fontWeight: 600, color: m.color }}>{m.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Alert Banner */}
      <AnimatePresence>
        {(cognitiveState === 'panicked' || cognitiveState === 'coerced' || cognitiveState === 'robotic') && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <AlertTriangle size={20} color="#ef4444" />
            <div>
              <div className="heading" style={{ fontSize: 13, fontWeight: 600, color: '#ef4444' }}>
                {cognitiveState === 'robotic' ? 'AUTOMATED BEHAVIOR DETECTED' : 'POTENTIAL SOCIAL ENGINEERING'}
              </div>
              <div className="mono" style={{ fontSize: 10, color: 'var(--text-sub)', marginTop: 2 }}>
                {state.reasons.length > 0 ? state.reasons[0] : 'Behavioral anomaly detected — monitoring escalated.'}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default LiveMonitor
