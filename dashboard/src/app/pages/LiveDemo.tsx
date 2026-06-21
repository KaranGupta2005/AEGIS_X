import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  CreditCard, Send, Shield, Brain, AlertTriangle, Wifi,
  Fingerprint, Activity, Target, Zap, User, IndianRupee, CheckCircle,
  Clock, TrendingDown, Eye, Lock,
} from 'lucide-react'
import { useStore } from '../../services/store'

function getTrustColor(score: number) {
  if (score > 85) return '#10B981'
  if (score > 60) return '#F59E0B'
  return '#EF4444'
}

const STATE_COLORS: Record<string, string> = {
  calm: '#10B981', focused: '#3B82F6', distressed: '#F59E0B',
  panicked: '#F97316', coerced: '#EF4444', robotic: '#8B5CF6',
}

const BENEFICIARIES = [
  { name: 'Ravi Sharma', account: 'XXXX4521', bank: 'SBI', isNew: false, riskNote: 'Known beneficiary' },
  { name: 'Unknown Vendor', account: 'XXXX9087', bank: 'Axis', isNew: true, riskNote: 'First-time transfer' },
  { name: 'Priya Mehta', account: 'XXXX2234', bank: 'HDFC', isNew: false, riskNote: 'Frequent payee' },
  { name: 'Suspicious Entity', account: 'XXXX6661', bank: 'PNB', isNew: true, riskNote: 'Flagged account' },
]

const DEMO_TIPS = [
  { label: 'Normal', desc: 'Type smoothly and quickly', color: '#10B981' },
  { label: 'Nervous', desc: 'Type slowly with many corrections', color: '#F59E0B' },
  { label: 'Coerced', desc: 'Long pauses, then burst typing', color: '#EF4444' },
]

const LiveDemo: React.FC = () => {
  const { state, connect, switchScenario } = useStore()
  const { trustScore, decision, cognitiveState, similarity, driftDetected, isConnected, velocity, anomalyScore = 0, fraudProbability = 0, latencyMs, eventCount, timeline, cognitiveHistory, intentVector = { coercion_probability: 0, takeover_probability: 0, anomaly_severity: 0, robotic_probability: 0 }, confidence } = state

  const [amount, setAmount] = useState('')
  const [remarks, setRemarks] = useState('')
  const [selectedBen, setSelectedBen] = useState(0)
  const [txStatus, setTxStatus] = useState<'idle' | 'processing' | 'allowed' | 'blocked' | 'stepup'>('idle')
  const [keystrokes, setKeystrokes] = useState(0)
  const [corrections, setCorrections] = useState(0)
  const [hesitations, setHesitations] = useState(0)
  const [sessionStart] = useState(Date.now())
  const lastKeyTime = useRef(Date.now())
  const [pipelineSteps, setPipelineSteps] = useState<string[]>([])

  useEffect(() => { if (!isConnected) connect('normal') }, [])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const now = Date.now()
    if (now - lastKeyTime.current > 2000) setHesitations(h => h + 1)
    if (e.key === 'Backspace') setCorrections(c => c + 1)
    setKeystrokes(k => k + 1)
    lastKeyTime.current = now
  }, [])

  const handleTransfer = () => {
    setTxStatus('processing')
    setPipelineSteps([])
    const steps = ['Feature extraction...', 'Embedding generation...', 'Similarity check...', 'CUSUM drift...', 'Cognitive classification...', 'Trust computation...', 'Decision engine...']
    steps.forEach((step, i) => {
      setTimeout(() => setPipelineSteps(prev => [...prev, step]), (i + 1) * 200)
    })
    setTimeout(() => {
      if (decision === 'ALLOW' && trustScore > 85) setTxStatus('allowed')
      else if (decision === 'BLOCK' || trustScore < 60) setTxStatus('blocked')
      else setTxStatus('stepup')
    }, 1800)
  }

  const resetDemo = () => {
    setTxStatus('idle')
    setAmount('')
    setRemarks('')
    setKeystrokes(0)
    setCorrections(0)
    setHesitations(0)
    setPipelineSteps([])
  }

  const trustColor = getTrustColor(trustScore)
  const ben = BENEFICIARIES[selectedBen]
  const sessionDuration = Math.floor((Date.now() - sessionStart) / 1000)
  const typingSpeed = keystrokes > 5 ? (keystrokes / Math.max(sessionDuration, 1)).toFixed(1) : '—'
  const correctionRate = keystrokes > 0 ? ((corrections / keystrokes) * 100).toFixed(1) : '0'
  const hesitationRatio = keystrokes > 0 ? (hesitations / keystrokes).toFixed(3) : '0.000'

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, fontFamily: 'Space Grotesk', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <CreditCard size={18} color="#10B981" /> Live Banking Demo
          </h1>
          <p style={{ fontSize: 9, color: 'var(--text-muted)', margin: '3px 0 0', fontFamily: 'JetBrains Mono' }}>
            <Wifi size={9} color={isConnected ? '#10B981' : '#EF4444'} /> Behavioral biometrics captured live · Every keystroke analyzed
          </p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {DEMO_TIPS.map(t => (
            <div key={t.label} style={{ padding: '4px 10px', borderRadius: 8, background: `${t.color}08`, border: `1px solid ${t.color}20` }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: t.color, fontFamily: 'JetBrains Mono' }}>{t.label}</div>
              <div style={{ fontSize: 7, color: 'var(--text-muted)' }}>{t.desc}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 12 }}>
        {/* Left: Banking UI */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Bank Card */}
          <div style={{ background: 'linear-gradient(135deg, #0F2027, #203A43, #2C5364)', borderRadius: 16, padding: '20px 24px', border: '1px solid rgba(255,255,255,0.08)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -30, right: -30, width: 100, height: 100, borderRadius: '50%', background: 'rgba(16,185,129,0.08)', filter: 'blur(25px)' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div>
                <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', fontFamily: 'JetBrains Mono', letterSpacing: '0.1em' }}>CENTRAL BANK OF INDIA</span>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'white', fontFamily: 'Space Grotesk', marginTop: 2 }}>•••• •••• •••• 4521</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)', fontFamily: 'JetBrains Mono' }}>BALANCE</span>
                <div style={{ fontSize: 16, color: '#10B981', fontFamily: 'Space Grotesk', fontWeight: 800 }}>₹5,42,000</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Shield size={14} color="rgba(16,185,129,0.6)" />
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', fontFamily: 'JetBrains Mono' }}>Protected by AEGIS-X</span>
              <div style={{ marginLeft: 'auto', width: 6, height: 6, borderRadius: '50%', background: '#10B981', boxShadow: '0 0 6px #10B981' }} />
            </div>
          </div>

          {/* Transfer Form */}
          <div style={{ background: 'var(--bg-card)', borderRadius: 14, border: '1px solid var(--border-light)', padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-main)', fontFamily: 'Space Grotesk' }}>Fund Transfer</span>
              {txStatus !== 'idle' && <button onClick={resetDemo} style={{ fontSize: 9, padding: '3px 8px', borderRadius: 6, border: '1px solid var(--border-light)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'JetBrains Mono' }}>Reset</button>}
            </div>

            {/* Beneficiary */}
            <label style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 6 }}>Beneficiary</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 14 }}>
              {BENEFICIARIES.map((b, i) => (
                <motion.div key={i} onClick={() => setSelectedBen(i)} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                  style={{ padding: '8px 10px', borderRadius: 8, cursor: 'pointer', border: `1px solid ${selectedBen === i ? (b.isNew ? '#EF4444' : '#10B981') + '40' : 'var(--border-light)'}`, background: selectedBen === i ? `${b.isNew ? '#EF4444' : '#10B981'}06` : 'transparent', transition: 'all 0.15s' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <User size={10} color={b.isNew ? '#EF4444' : '#10B981'} />
                    <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-main)' }}>{b.name}</span>
                    {b.isNew && <span style={{ fontSize: 6, padding: '1px 3px', borderRadius: 2, background: 'rgba(239,68,68,0.1)', color: '#EF4444', fontWeight: 800 }}>NEW</span>}
                  </div>
                  <span style={{ fontSize: 8, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>{b.riskNote}</span>
                </motion.div>
              ))}
            </div>

            {/* Amount + Remarks */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
              <div>
                <label style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', display: 'block', marginBottom: 4 }}>AMOUNT (₹)</label>
                <input type="text" value={amount} onChange={e => setAmount(e.target.value.replace(/[^0-9]/g, ''))} onKeyDown={handleKeyDown} placeholder="50000"
                  style={{ width: '100%', height: 40, padding: '0 12px', borderRadius: 8, border: '1px solid var(--border-light)', background: 'rgba(255,255,255,0.03)', color: 'var(--text-main)', fontSize: 15, fontWeight: 700, fontFamily: 'Space Grotesk', outline: 'none', boxSizing: 'border-box' }}
                  onFocus={e => (e.currentTarget.style.borderColor = 'rgba(16,185,129,0.4)')} onBlur={e => (e.currentTarget.style.borderColor = 'var(--border-light)')} />
              </div>
              <div>
                <label style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', display: 'block', marginBottom: 4 }}>REMARKS</label>
                <input type="text" value={remarks} onChange={e => setRemarks(e.target.value)} onKeyDown={handleKeyDown} placeholder="Payment for..."
                  style={{ width: '100%', height: 40, padding: '0 12px', borderRadius: 8, border: '1px solid var(--border-light)', background: 'rgba(255,255,255,0.03)', color: 'var(--text-main)', fontSize: 12, fontFamily: 'Inter', outline: 'none', boxSizing: 'border-box' }}
                  onFocus={e => (e.currentTarget.style.borderColor = 'rgba(16,185,129,0.4)')} onBlur={e => (e.currentTarget.style.borderColor = 'var(--border-light)')} />
              </div>
            </div>

            {/* Transfer Button */}
            <motion.button onClick={handleTransfer} disabled={!amount || txStatus === 'processing'} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
              style={{ width: '100%', height: 42, borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #10B981, #059669)', color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'Space Grotesk', opacity: !amount ? 0.5 : 1, boxShadow: '0 4px 16px rgba(16,185,129,0.2)' }}>
              {txStatus === 'processing' ? <><Activity size={14} /> Verifying identity...</> : <><Send size={14} /> Transfer ₹{Number(amount || 0).toLocaleString()}</>}
            </motion.button>

            {/* Pipeline Steps (during processing) */}
            <AnimatePresence>
              {txStatus === 'processing' && pipelineSteps.length > 0 && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ marginTop: 10, padding: '8px 12px', borderRadius: 8, background: 'rgba(139,92,246,0.04)', border: '1px solid rgba(139,92,246,0.12)' }}>
                  {pipelineSteps.map((step, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 0' }}>
                      <CheckCircle size={9} color="#8B5CF6" />
                      <span style={{ fontSize: 9, color: '#8B5CF6', fontFamily: 'JetBrains Mono' }}>{step}</span>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Result */}
            <AnimatePresence>
              {(txStatus === 'allowed' || txStatus === 'blocked' || txStatus === 'stepup') && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  style={{ marginTop: 12, padding: '14px 16px', borderRadius: 12, background: txStatus === 'allowed' ? 'rgba(16,185,129,0.06)' : txStatus === 'blocked' ? 'rgba(239,68,68,0.06)' : 'rgba(245,158,11,0.06)', border: `1px solid ${txStatus === 'allowed' ? 'rgba(16,185,129,0.2)' : txStatus === 'blocked' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)'}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {txStatus === 'allowed' ? <CheckCircle size={18} color="#10B981" /> : txStatus === 'blocked' ? <AlertTriangle size={18} color="#EF4444" /> : <Lock size={18} color="#F59E0B" />}
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: txStatus === 'allowed' ? '#10B981' : txStatus === 'blocked' ? '#EF4444' : '#F59E0B', fontFamily: 'Space Grotesk' }}>
                        {txStatus === 'allowed' ? '✓ TRANSACTION APPROVED' : txStatus === 'blocked' ? '✕ TRANSACTION BLOCKED' : '⚠ STEP-UP VERIFICATION'}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-sub)', marginTop: 3, lineHeight: 1.5 }}>
                        {txStatus === 'allowed' ? `Behavioral trust verified (${trustScore.toFixed(0)}%). Transfer of ₹${Number(amount).toLocaleString()} to ${ben.name} processed successfully.` : txStatus === 'blocked' ? `Anomalous behavior detected — cognitive state: ${cognitiveState.toUpperCase()}, fraud probability: ${(fraudProbability * 100).toFixed(0)}%. Session terminated for safety.` : `Trust score at ${trustScore.toFixed(0)}% requires additional verification. OTP sent to registered mobile.`}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right: Live Telemetry */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Trust Gauge */}
          <div style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border-light)', padding: '12px 14px', textAlign: 'center' }}>
            <svg width={130} height={70} viewBox="0 0 140 80" style={{ display: 'block', margin: '0 auto' }}>
              <path d="M 15 70 A 55 55 0 0 1 125 70" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={10} strokeLinecap="round" />
              {(() => {
                const pct = Math.max(0, Math.min(100, trustScore)) / 100
                const angle = Math.PI * (1 - pct)
                const ex = 70 + 55 * Math.cos(angle), ey = 70 - 55 * Math.sin(angle)
                return <path d={`M 15 70 A 55 55 0 ${pct > 0.5 ? 1 : 0} 1 ${ex.toFixed(1)} ${ey.toFixed(1)}`} fill="none" stroke={trustColor} strokeWidth={10} strokeLinecap="round" style={{ filter: `drop-shadow(0 0 6px ${trustColor}60)`, transition: 'all 0.3s' }} />
              })()}
              <text x={70} y={50} textAnchor="middle" fill={trustColor} fontSize={22} fontWeight={900} fontFamily="Space Grotesk">{Math.round(trustScore)}</text>
              <text x={70} y={68} textAnchor="middle" fill="#64748B" fontSize={8} fontFamily="JetBrains Mono">TRUST</text>
            </svg>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 4 }}>
              <span style={{ fontSize: 8, padding: '2px 6px', borderRadius: 4, background: `${getTrustColor(trustScore)}10`, color: getTrustColor(trustScore), fontWeight: 800, fontFamily: 'JetBrains Mono' }}>{decision}</span>
              <span style={{ fontSize: 8, padding: '2px 6px', borderRadius: 4, background: `${STATE_COLORS[cognitiveState] || '#94A3B8'}10`, color: STATE_COLORS[cognitiveState] || '#94A3B8', fontWeight: 800, fontFamily: 'JetBrains Mono' }}>{cognitiveState.toUpperCase()}</span>
            </div>
          </div>

          {/* Cognitive State Machine */}
          <div style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border-light)', padding: '10px 12px' }}>
            <span style={{ fontSize: 8, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', fontFamily: 'JetBrains Mono', display: 'block', marginBottom: 6 }}>State Machine</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {Object.entries(STATE_COLORS).map(([s, color]) => (
                <span key={s} style={{ fontSize: 8, padding: '2px 6px', borderRadius: 4, background: cognitiveState === s ? `${color}20` : 'rgba(255,255,255,0.02)', border: `1px solid ${cognitiveState === s ? color : 'var(--border-light)'}`, color: cognitiveState === s ? color : 'var(--text-muted)', fontWeight: cognitiveState === s ? 800 : 400, fontFamily: 'JetBrains Mono', transition: 'all 0.2s' }}>
                  {s}
                </span>
              ))}
            </div>
          </div>

          {/* Live Metrics */}
          <div style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border-light)', padding: '10px 12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8 }}>
              <Fingerprint size={10} color="#3B82F6" />
              <span style={{ fontSize: 8, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'JetBrains Mono' }}>Behavioral Capture</span>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#10B981', marginLeft: 'auto', boxShadow: '0 0 5px #10B981' }} />
            </div>
            {[
              { label: 'Keystrokes', value: String(keystrokes), color: '#3B82F6' },
              { label: 'Speed (CPS)', value: typingSpeed, color: '#10B981' },
              { label: 'Corrections', value: `${correctionRate}%`, color: Number(correctionRate) > 10 ? '#EF4444' : '#10B981' },
              { label: 'Hesitation', value: hesitationRatio, color: Number(hesitationRatio) > 0.2 ? '#F59E0B' : '#10B981' },
              { label: 'Similarity', value: `${(similarity * 100).toFixed(1)}%`, color: similarity > 0.85 ? '#10B981' : '#EF4444' },
              { label: 'Fraud Risk', value: `${(fraudProbability * 100).toFixed(0)}%`, color: fraudProbability > 0.3 ? '#EF4444' : '#10B981' },
              { label: 'Latency', value: `${latencyMs.toFixed(0)}ms`, color: '#8B5CF6' },
            ].map(m => (
              <div key={m.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid var(--border-light)' }}>
                <span style={{ fontSize: 9, color: 'var(--text-sub)' }}>{m.label}</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: m.color, fontFamily: 'Space Grotesk' }}>{m.value}</span>
              </div>
            ))}
          </div>

          {/* Mini Timeline (last 8 states) */}
          <div style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border-light)', padding: '10px 12px' }}>
            <span style={{ fontSize: 8, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'JetBrains Mono', display: 'block', marginBottom: 6 }}>Session Timeline</span>
            <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 30 }}>
              {timeline.slice(-12).map((t, i) => (
                <div key={i} style={{ flex: 1, height: `${t.trust * 0.3}px`, minHeight: 4, borderRadius: 2, background: getTrustColor(t.trust), opacity: 0.3 + (i / 12) * 0.7, transition: 'height 0.3s' }} />
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
              <span style={{ fontSize: 7, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>{timeline.length} events</span>
              <span style={{ fontSize: 7, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>{sessionDuration}s elapsed</span>
            </div>
          </div>

          {/* Events counter */}
          <div style={{ background: 'rgba(16,185,129,0.04)', borderRadius: 10, border: '1px solid rgba(16,185,129,0.08)', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Zap size={12} color="#10B981" />
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#10B981', fontFamily: 'Space Grotesk' }}>{eventCount}</div>
              <div style={{ fontSize: 7, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>PIPELINE EVENTS</div>
            </div>
          </div>
        </div>
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
    </div>
  )
}

export default LiveDemo
