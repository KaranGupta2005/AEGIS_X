import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Brain, ArrowDown, Activity } from 'lucide-react'

const STATES = [
  { key: 'calm', label: 'CALM', color: '#10b981', desc: 'Normal baseline behavior', stability: 1.0 },
  { key: 'focused', label: 'FOCUSED', color: '#3b82f6', desc: 'Active engagement, deliberate actions', stability: 0.9 },
  { key: 'distressed', label: 'DISTRESSED', color: '#f59e0b', desc: 'Elevated hesitation, divided attention', stability: 0.6 },
  { key: 'panicked', label: 'PANICKED', color: '#f97316', desc: 'Severe stress, motor control degradation', stability: 0.35 },
  { key: 'coerced', label: 'COERCED', color: '#ef4444', desc: 'External manipulation suspected', stability: 0.15 },
  { key: 'robotic', label: 'ROBOTIC', color: '#8b5cf6', desc: 'Automated scripted interaction', stability: 0.05 },
]

type Scenario = 'normal' | 'scam' | 'malware'

const PROGRESSIONS: Record<Scenario, string[]> = {
  normal: ['calm', 'focused', 'calm', 'calm', 'focused', 'calm'],
  scam: ['calm', 'focused', 'distressed', 'distressed', 'panicked', 'panicked', 'coerced', 'coerced'],
  malware: ['calm', 'calm', 'robotic', 'robotic', 'robotic', 'robotic'],
}

const CognitiveAnalysis: React.FC = () => {
  const [scenario, setScenario] = useState<Scenario>('scam')
  const [step, setStep] = useState(0)
  const progression = PROGRESSIONS[scenario]
  const currentState = progression[Math.min(step, progression.length - 1)]
  const active = STATES.find(s => s.key === currentState)!

  useEffect(() => {
    const id = setInterval(() => {
      setStep(s => (s + 1) % progression.length)
    }, 2500)
    return () => clearInterval(id)
  }, [progression])

  useEffect(() => { setStep(0) }, [scenario])

  const stateHistory = progression.slice(0, step + 1)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, fontFamily: 'Space Grotesk', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Brain size={20} color="#3b82f6" /> Cognitive State Analysis
          </h1>
          <p style={{ color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', fontSize: 12, marginTop: 4 }}>
            Random Forest classifier • 96.3% accuracy • 6 cognitive states
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['normal', 'scam', 'malware'] as Scenario[]).map(s => (
            <button key={s} onClick={() => setScenario(s)} style={{
              padding: '8px 14px', borderRadius: 8, fontSize: 11, fontWeight: 600,
              fontFamily: 'JetBrains Mono', cursor: 'pointer',
              background: scenario === s ? 'rgba(59,130,246,0.1)' : 'var(--bg-card)',
              border: `1px solid ${scenario === s ? '#3b82f6' : 'var(--border-light)'}`,
              color: scenario === s ? '#3b82f6' : 'var(--text-sub)',
            }}>
              {s === 'normal' ? 'Normal' : s === 'scam' ? 'Scam Victim' : 'Malware'}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 24 }}>
        {/* State Machine */}
        <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-light)', borderRadius: 16, padding: 24 }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', marginBottom: 16, letterSpacing: '0.08em' }}>STATE MACHINE</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {STATES.map((state, i) => {
              const isActive = state.key === currentState
              return (
                <motion.div
                  key={state.key}
                  animate={{
                    background: isActive ? `${state.color}15` : 'transparent',
                    borderColor: isActive ? state.color : 'var(--border-light)',
                    scale: isActive ? 1.02 : 1,
                  }}
                  style={{
                    border: '1px solid var(--border-light)', borderRadius: 10,
                    padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 10, height: 10, borderRadius: '50%', background: state.color,
                      boxShadow: isActive ? `0 0 12px ${state.color}` : 'none',
                      opacity: isActive ? 1 : 0.4,
                    }} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: isActive ? state.color : 'var(--text-sub)', fontFamily: 'JetBrains Mono' }}>
                        {state.label}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>{state.desc}</div>
                    </div>
                  </div>
                  <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: isActive ? state.color : 'var(--text-muted)' }}>
                    {state.stability.toFixed(2)}
                  </span>
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* Right Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Current State Hero */}
          <div style={{
            background: 'var(--bg-panel)', border: '1px solid var(--border-light)',
            borderRadius: 16, padding: 28, textAlign: 'center',
          }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', marginBottom: 12, letterSpacing: '0.1em' }}>CURRENT STATE</div>
            <AnimatePresence mode="wait">
              <motion.div
                key={currentState}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                style={{ fontSize: 36, fontWeight: 700, fontFamily: 'JetBrains Mono', color: active.color, textShadow: `0 0 20px ${active.color}40` }}
              >
                {active.label}
              </motion.div>
            </AnimatePresence>
            <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-sub)' }}>{active.desc}</div>
            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center', gap: 24 }}>
              <div>
                <div style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>STABILITY</div>
                <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'Space Grotesk', color: active.color }}>{active.stability.toFixed(2)}</div>
              </div>
              <div>
                <div style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>T(t) COMPONENT</div>
                <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'Space Grotesk', color: active.color }}>{(active.stability * 0.20).toFixed(2)}</div>
              </div>
            </div>
          </div>

          {/* State Progression */}
          <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-light)', borderRadius: 16, padding: 24 }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', marginBottom: 14, letterSpacing: '0.08em' }}>STATE PROGRESSION</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              {stateHistory.map((s, i) => {
                const st = STATES.find(x => x.key === s)!
                return (
                  <React.Fragment key={i}>
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      style={{
                        padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 600,
                        fontFamily: 'JetBrains Mono', color: st.color,
                        background: `${st.color}15`, border: `1px solid ${st.color}30`,
                      }}
                    >
                      {st.label}
                    </motion.div>
                    {i < stateHistory.length - 1 && <ArrowDown size={12} color="var(--text-muted)" />}
                  </React.Fragment>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CognitiveAnalysis
