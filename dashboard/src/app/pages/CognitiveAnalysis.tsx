import React from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Brain, ArrowDown, Wifi } from 'lucide-react'
import { useStore } from '../../services/store'

const STATES = [
  { key: 'calm', label: 'CALM', color: '#10b981', desc: 'Normal baseline behavior', stability: 1.0 },
  { key: 'focused', label: 'FOCUSED', color: '#3b82f6', desc: 'Active engagement, deliberate actions', stability: 0.9 },
  { key: 'distressed', label: 'DISTRESSED', color: '#f59e0b', desc: 'Elevated hesitation, divided attention', stability: 0.6 },
  { key: 'panicked', label: 'PANICKED', color: '#f97316', desc: 'Severe stress, motor control degradation', stability: 0.35 },
  { key: 'coerced', label: 'COERCED', color: '#ef4444', desc: 'External manipulation suspected', stability: 0.15 },
  { key: 'robotic', label: 'ROBOTIC', color: '#8b5cf6', desc: 'Automated scripted interaction', stability: 0.05 },
]

const CognitiveAnalysis: React.FC = () => {
  const { state } = useStore()
  const { cognitiveState, cognitiveStability, cognitiveHistory, isConnected } = state
  const active = STATES.find(s => s.key === cognitiveState) || STATES[0]

  const uniqueHistory = cognitiveHistory.reduce<string[]>((acc, s) => {
    if (acc.length === 0 || acc[acc.length - 1] !== s) acc.push(s)
    return acc
  }, []).slice(-8)

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 className="heading" style={{ fontSize: 24, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Brain size={20} color="#3b82f6" /> Cognitive State Analysis
        </h1>
        <p className="mono" style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Wifi size={10} color={isConnected ? '#10b981' : '#ef4444'} />
          Random Forest classifier • 96.3% accuracy • Live state from backend
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 24 }}>
        {/* State Machine */}
        <div className="card-base" style={{ padding: 24 }}>
          <div className="label-xs" style={{ marginBottom: 16 }}>STATE MACHINE</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {STATES.map(s => {
              const isActive = s.key === cognitiveState
              return (
                <motion.div key={s.key} animate={{ background: isActive ? `${s.color}12` : 'transparent', borderColor: isActive ? `${s.color}40` : 'var(--border-light)', scale: isActive ? 1.02 : 1 }} style={{ border: '1px solid var(--border-light)', borderRadius: 10, padding: '11px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 9, height: 9, borderRadius: '50%', background: s.color, boxShadow: isActive ? `0 0 12px ${s.color}` : 'none', opacity: isActive ? 1 : 0.35 }} />
                    <div>
                      <div className="mono" style={{ fontSize: 12, fontWeight: 600, color: isActive ? s.color : 'var(--text-sub)' }}>{s.label}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>{s.desc}</div>
                    </div>
                  </div>
                  <span className="mono" style={{ fontSize: 10, color: isActive ? s.color : 'var(--text-muted)' }}>{s.stability.toFixed(2)}</span>
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* Right Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Current State Hero */}
          <div className="card-base" style={{ padding: 28, textAlign: 'center' }}>
            <div className="label-xs" style={{ marginBottom: 14 }}>CURRENT STATE</div>
            <AnimatePresence mode="wait">
              <motion.div key={cognitiveState} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} className="mono" style={{ fontSize: 34, fontWeight: 700, color: active.color, textShadow: `0 0 24px ${active.color}30` }}>
                {active.label}
              </motion.div>
            </AnimatePresence>
            <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-sub)' }}>{active.desc}</div>
            <div style={{ marginTop: 18, display: 'flex', justifyContent: 'center', gap: 28 }}>
              <div>
                <div className="label-xs">STABILITY</div>
                <div className="heading" style={{ fontSize: 20, fontWeight: 700, color: active.color, marginTop: 2 }}>{cognitiveStability.toFixed(2)}</div>
              </div>
              <div>
                <div className="label-xs">T(t) COMPONENT</div>
                <div className="heading" style={{ fontSize: 20, fontWeight: 700, color: active.color, marginTop: 2 }}>{(cognitiveStability * 0.20).toFixed(3)}</div>
              </div>
            </div>
          </div>

          {/* State Progression */}
          <div className="card-base" style={{ padding: 24 }}>
            <div className="label-xs" style={{ marginBottom: 14 }}>STATE PROGRESSION (live)</div>
            {uniqueHistory.length > 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                {uniqueHistory.map((s, i) => {
                  const st = STATES.find(x => x.key === s) || STATES[0]
                  return (
                    <React.Fragment key={i}>
                      <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="mono" style={{ padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 600, color: st.color, background: `${st.color}12`, border: `1px solid ${st.color}25` }}>
                        {st.label}
                      </motion.div>
                      {i < uniqueHistory.length - 1 && <ArrowDown size={11} color="var(--text-muted)" />}
                    </React.Fragment>
                  )
                })}
              </div>
            ) : (
              <p className="mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>Waiting for data...</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default CognitiveAnalysis
