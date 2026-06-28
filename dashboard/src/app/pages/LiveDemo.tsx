import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  CreditCard, Send, Shield, Brain, AlertTriangle, Wifi,
  Fingerprint, Activity, Target, Zap, User, CheckCircle,
  Lock, ArrowRight, Phone, Bot, UserX,
} from 'lucide-react'
import { useStore } from '../../services/store'
import { SimulatorScenario } from '../../services/api'
import { useLiveCapture } from '../../services/useLiveCapture'

const STATE_COLORS: Record<string, string> = {
  calm: '#10B981', focused: '#3B82F6', distressed: '#F59E0B',
  panicked: '#F97316', coerced: '#EF4444', robotic: '#8B5CF6',
}

function getTrustColor(s: number) { return s > 85 ? '#10B981' : s > 60 ? '#F59E0B' : '#EF4444' }

type BankScreen = 'dashboard' | 'transfer' | 'amount' | 'confirm' | 'result'

const SCENARIOS = [
  { key: 'normal' as SimulatorScenario, label: '✅ Normal', desc: 'Genuine user', color: '#10B981', icon: <User size={14} /> },
  { key: 'scam' as SimulatorScenario, label: '📞 Scam Call', desc: 'Coerced victim', color: '#F59E0B', icon: <Phone size={14} /> },
  { key: 'malware' as SimulatorScenario, label: '🤖 Malware', desc: 'Remote control', color: '#EF4444', icon: <Bot size={14} /> },
]

const LiveDemo: React.FC = () => {
  const { state, connect, switchScenario } = useStore()
  const { trustScore, decision, cognitiveState, similarity, isConnected, velocity, anomalyScore = 0, fraudProbability = 0, latencyMs, eventCount, timeline, driftDetected, intentVector = { coercion_probability: 0, takeover_probability: 0, anomaly_severity: 0, robotic_probability: 0 } } = state

  const [screen, setScreen] = useState<BankScreen>('dashboard')
  const [amount, setAmount] = useState('')
  const [beneficiary, setBeneficiary] = useState('Rahul Sharma')
  const [activeScenario, setActiveScenario] = useState<SimulatorScenario>('normal')
  const [blocked, setBlocked] = useState(false)
  const [stepUpShown, setStepUpShown] = useState(false)
  const [txSuccess, setTxSuccess] = useState(false)
  const [balance, setBalance] = useState(245000)

  useEffect(() => { if (!isConnected) connect('normal') }, [])

  // Live capture YOUR real keystrokes/mouse and send to backend
  useLiveCapture('demo_live_real_user', true)

  // Watch trust — trigger blocks/stepups mid-flow
  useEffect(() => {
    if (screen === 'confirm' || screen === 'amount') {
      if (trustScore < 60 && !blocked && !txSuccess) {
        setBlocked(true)
        // Auto-dismiss block overlay after 3.5s (scenario will auto-restart)
        setTimeout(() => {
          setBlocked(false)
          setScreen('dashboard')
          setAmount('')
          setStepUpShown(false)
          setTxSuccess(false)
        }, 3500)
      } else if (trustScore < 85 && trustScore >= 60 && !stepUpShown && !blocked && !txSuccess) {
        setStepUpShown(true)
        // Auto-dismiss step-up after 2.5s
        setTimeout(() => setStepUpShown(false), 2500)
      }
    }
  }, [trustScore, screen])

  const startScenario = (s: SimulatorScenario) => {
    setActiveScenario(s)
    switchScenario(s)
    resetFlow()
  }

  const resetFlow = () => {
    setScreen('dashboard')
    setAmount('')
    setBlocked(false)
    setStepUpShown(false)
    setTxSuccess(false)
    // If we were blocked, restart the scenario with a fresh session
    if (blocked) {
      startScenario(activeScenario)
    }
  }

  const handleConfirm = () => {
    if (trustScore > 85) {
      setTxSuccess(true)
      setBalance(b => b - (Number(amount) || 0))
      setScreen('result')
    } else if (trustScore > 60) {
      setStepUpShown(true)
    } else {
      setBlocked(true)
    }
  }

  const trustColor = getTrustColor(trustScore)
  const stateColor = STATE_COLORS[cognitiveState] || '#94A3B8'

  return (
    <div style={{ height: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Scenario Selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-main)', fontFamily: 'Space Grotesk' }}>DEMO MODE</span>
        <div style={{ display: 'flex', gap: 6, flex: 1 }}>
          {SCENARIOS.map(s => (
            <motion.button key={s.key} onClick={() => startScenario(s.key)} whileTap={{ scale: 0.96 }}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8, border: `1px solid ${activeScenario === s.key ? s.color : 'var(--border-light)'}`, background: activeScenario === s.key ? `${s.color}10` : 'transparent', color: activeScenario === s.key ? s.color : 'var(--text-muted)', cursor: 'pointer', fontSize: 11, fontWeight: 700, fontFamily: 'Space Grotesk', transition: 'all 0.15s' }}>
              {s.icon} {s.label}
            </motion.button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: isConnected ? '#10B981' : '#EF4444', boxShadow: isConnected ? '0 0 6px #10B981' : 'none' }} />
          <span style={{ fontSize: 8, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>Event #{eventCount}</span>
        </div>
      </div>

      {/* Split Screen */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 360px', gap: 12, minHeight: 0 }}>
        {/* LEFT: Banking App */}
        <div style={{ background: '#080c14', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}>
          {/* Bank nav */}
          <div style={{ padding: '12px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'white', fontFamily: 'Space Grotesk' }}>🏦 CBI NetBanking</span>
            <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)', fontFamily: 'JetBrains Mono' }}>Session Active</span>
          </div>

          {/* Bank content */}
          <div style={{ flex: 1, padding: '20px 24px', overflowY: 'auto' }}>
            <AnimatePresence mode="wait">
              {/* Dashboard Screen */}
              {screen === 'dashboard' && (
                <motion.div key="dash" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                  <div style={{ background: 'linear-gradient(135deg, #0c1524, #1a3045)', borderRadius: 14, padding: '18px 22px', marginBottom: 16, border: '1px solid rgba(16,185,129,0.08)' }}>
                    <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', fontFamily: 'JetBrains Mono' }}>SAVINGS ACCOUNT</span>
                    <div style={{ fontSize: 28, fontWeight: 900, color: '#10B981', fontFamily: 'Space Grotesk', margin: '6px 0' }}>₹{balance.toLocaleString()}</div>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>A/C •••• 4521 · Central Bank of India</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <motion.button whileTap={{ scale: 0.97 }} onClick={() => setScreen('transfer')}
                      style={{ padding: '16px', borderRadius: 12, border: '1px solid rgba(16,185,129,0.2)', background: 'rgba(16,185,129,0.04)', cursor: 'pointer', textAlign: 'center' }}>
                      <Send size={18} color="#10B981" style={{ margin: '0 auto 6px' }} />
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'white' }}>Transfer</div>
                    </motion.button>
                    <div style={{ padding: '16px', borderRadius: 12, border: '1px solid var(--border-light)', textAlign: 'center', opacity: 0.5 }}>
                      <CreditCard size={18} color="var(--text-muted)" style={{ margin: '0 auto 6px' }} />
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Pay Bills</div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Transfer Screen */}
              {screen === 'transfer' && (
                <motion.div key="transfer" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: 'white', marginBottom: 16, fontFamily: 'Space Grotesk' }}>Select Beneficiary</h3>
                  {['Rahul Sharma', 'Priya Mehta', 'Unknown Vendor ⚠️', 'Suspicious Entity ⚠️'].map((name, i) => (
                    <motion.div key={name} whileTap={{ scale: 0.98 }}
                      onClick={() => { setBeneficiary(name); setScreen('amount') }}
                      style={{ padding: '12px 14px', borderRadius: 10, border: '1px solid var(--border-light)', marginBottom: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, transition: 'all 0.15s' }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = i > 1 ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)')}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-light)')}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: i > 1 ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <User size={14} color={i > 1 ? '#EF4444' : '#10B981'} />
                      </div>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'white' }}>{name}</div>
                        <div style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>{i > 1 ? 'NEW BENEFICIARY' : 'Frequent payee'}</div>
                      </div>
                      <ArrowRight size={14} color="var(--text-muted)" style={{ marginLeft: 'auto' }} />
                    </motion.div>
                  ))}
                </motion.div>
              )}

              {/* Amount Screen */}
              {screen === 'amount' && (
                <motion.div key="amount" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: 'white', marginBottom: 4, fontFamily: 'Space Grotesk' }}>Enter Amount</h3>
                  <p style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 16 }}>To: {beneficiary}</p>
                  <div style={{ textAlign: 'center', marginBottom: 20 }}>
                    <span style={{ fontSize: 36, fontWeight: 900, color: 'white', fontFamily: 'Space Grotesk' }}>₹{amount || '0'}</span>
                  </div>
                  <input type="text" value={amount} onChange={e => setAmount(e.target.value.replace(/[^0-9]/g, ''))} placeholder="Enter amount"
                    style={{ width: '100%', height: 44, padding: '0 14px', borderRadius: 10, border: '1px solid var(--border-light)', background: 'rgba(255,255,255,0.03)', color: 'white', fontSize: 16, fontWeight: 700, fontFamily: 'Space Grotesk', outline: 'none', textAlign: 'center', marginBottom: 14, boxSizing: 'border-box' }}
                    autoFocus />
                  <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                    {['5000', '10000', '50000', '100000'].map(v => (
                      <button key={v} onClick={() => setAmount(v)} style={{ flex: 1, padding: '8px', borderRadius: 8, border: '1px solid var(--border-light)', background: 'transparent', color: 'var(--text-sub)', fontSize: 10, cursor: 'pointer', fontFamily: 'JetBrains Mono' }}>₹{Number(v).toLocaleString()}</button>
                    ))}
                  </div>
                  <motion.button whileTap={{ scale: 0.97 }} onClick={() => amount && setScreen('confirm')} disabled={!amount}
                    style={{ width: '100%', height: 44, borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#10B981,#059669)', color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Space Grotesk', opacity: amount ? 1 : 0.5 }}>
                    Continue <ArrowRight size={14} style={{ display: 'inline', verticalAlign: 'middle' }} />
                  </motion.button>
                </motion.div>
              )}

              {/* Confirm Screen */}
              {screen === 'confirm' && (
                <motion.div key="confirm" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: 'white', marginBottom: 16, fontFamily: 'Space Grotesk' }}>Confirm Transfer</h3>
                  <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 10, padding: '14px 16px', border: '1px solid var(--border-light)', marginBottom: 16 }}>
                    {[
                      { label: 'To', value: beneficiary },
                      { label: 'Amount', value: `₹${Number(amount).toLocaleString()}` },
                      { label: 'From', value: 'Savings A/C ••4521' },
                      { label: 'Bank', value: 'Central Bank of India' },
                    ].map(r => (
                      <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{r.label}</span>
                        <span style={{ fontSize: 11, fontWeight: 600, color: 'white' }}>{r.value}</span>
                      </div>
                    ))}
                  </div>
                  <motion.button whileTap={{ scale: 0.97 }} onClick={handleConfirm}
                    style={{ width: '100%', height: 44, borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#10B981,#059669)', color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Space Grotesk', boxShadow: '0 4px 16px rgba(16,185,129,0.2)' }}>
                    Confirm & Pay ₹{Number(amount).toLocaleString()}
                  </motion.button>
                </motion.div>
              )}

              {/* Result Screen */}
              {screen === 'result' && txSuccess && (
                <motion.div key="result" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={{ textAlign: 'center', paddingTop: 40 }}>
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.2 }}>
                    <CheckCircle size={48} color="#10B981" style={{ margin: '0 auto' }} />
                  </motion.div>
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: '#10B981', marginTop: 16, fontFamily: 'Space Grotesk' }}>Transfer Successful!</h3>
                  <p style={{ fontSize: 12, color: 'var(--text-sub)', marginTop: 8 }}>₹{Number(amount).toLocaleString()} sent to {beneficiary}</p>
                  <p style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 12, fontFamily: 'JetBrains Mono' }}>Verified by AEGIS-X · Trust: {trustScore.toFixed(0)}% · No OTP needed</p>
                  <button onClick={resetFlow} style={{ marginTop: 20, padding: '8px 20px', borderRadius: 8, border: '1px solid var(--border-light)', background: 'transparent', color: 'var(--text-sub)', fontSize: 11, cursor: 'pointer' }}>Back to Dashboard</button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* BLOCK Overlay */}
          <AnimatePresence>
            {blocked && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(4px)' }}>
                <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 16, padding: '28px 32px', textAlign: 'center', maxWidth: 320 }}>
                  <AlertTriangle size={36} color="#EF4444" style={{ margin: '0 auto 12px' }} />
                  <h3 style={{ fontSize: 16, fontWeight: 800, color: '#EF4444', fontFamily: 'Space Grotesk' }}>Transaction Blocked</h3>
                  <p style={{ fontSize: 11, color: 'var(--text-sub)', marginTop: 8, lineHeight: 1.6 }}>
                    {cognitiveState === 'coerced' ? 'Potential Social Engineering Detected. Your behavioral pattern indicates you may be under external pressure.' :
                     cognitiveState === 'robotic' ? 'Automated Activity Detected. Non-human behavioral pattern identified.' :
                     'Anomalous behavior detected. Transaction paused for your safety.'}
                  </p>
                  <p style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 8, fontFamily: 'JetBrains Mono' }}>Trust: {trustScore.toFixed(0)}% · State: {cognitiveState.toUpperCase()}</p>
                  <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'center' }}>
                    <button onClick={resetFlow} style={{ padding: '8px 20px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: '#EF4444', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Close</button>
                    <button onClick={() => startScenario(activeScenario)} style={{ padding: '8px 20px', borderRadius: 8, border: '1px solid rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.08)', color: '#10B981', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Restart Demo</button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* STEP-UP Overlay */}
          <AnimatePresence>
            {stepUpShown && !blocked && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(3px)' }}>
                <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 16, padding: '28px 32px', textAlign: 'center', maxWidth: 300 }}>
                  <Lock size={32} color="#F59E0B" style={{ margin: '0 auto 12px' }} />
                  <h3 style={{ fontSize: 15, fontWeight: 800, color: '#F59E0B', fontFamily: 'Space Grotesk' }}>Additional Verification Required</h3>
                  <p style={{ fontSize: 11, color: 'var(--text-sub)', marginTop: 8, lineHeight: 1.5 }}>Your trust score dropped below threshold. Please verify with OTP.</p>
                  <p style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 6, fontFamily: 'JetBrains Mono' }}>Trust: {trustScore.toFixed(0)}% · Threshold: 85%</p>
                  <button onClick={() => setStepUpShown(false)} style={{ marginTop: 14, padding: '8px 20px', borderRadius: 8, border: 'none', background: '#F59E0B', color: '#000', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Verify OTP</button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Floating Trust Widget */}
          <motion.div animate={{ borderColor: trustScore > 85 ? 'rgba(16,185,129,0.3)' : trustScore > 60 ? 'rgba(245,158,11,0.3)' : 'rgba(239,68,68,0.3)' }}
            style={{ position: 'absolute', top: 52, right: 12, padding: '8px 12px', borderRadius: 10, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', border: '1px solid', zIndex: 50 }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: trustColor, fontFamily: 'Space Grotesk', textAlign: 'center' }}>{Math.round(trustScore)}%</div>
            <div style={{ fontSize: 7, color: trustScore > 85 ? '#10B981' : trustScore > 60 ? '#F59E0B' : '#EF4444', fontFamily: 'JetBrains Mono', textAlign: 'center' }}>
              {trustScore > 85 ? 'Secure Session' : trustScore > 60 ? '⚠ Elevated Risk' : '⛔ DANGER'}
            </div>
          </motion.div>
        </div>

        {/* RIGHT: AEGIS-X Intelligence Panel */}
        <div style={{ background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border-light)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Shield size={14} color="#10B981" />
            <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-main)', fontFamily: 'Space Grotesk' }}>AEGIS-X Intelligence</span>
            <span style={{ fontSize: 8, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', marginLeft: 'auto' }}>LIVE</span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Trust Score Large */}
            <div style={{ textAlign: 'center', padding: '10px 0' }}>
              <motion.div key={Math.round(trustScore)} initial={{ scale: 1.1 }} animate={{ scale: 1 }}
                style={{ fontSize: 42, fontWeight: 900, color: trustColor, fontFamily: 'Space Grotesk', lineHeight: 1 }}>
                {Math.round(trustScore)}%
              </motion.div>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', marginTop: 4 }}>TRUST SCORE T(t)</div>
            </div>

            {/* Decision + State */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div style={{ padding: '10px 12px', borderRadius: 10, background: `${decision === 'ALLOW' ? '#10B981' : decision === 'STEP_UP' ? '#F59E0B' : '#EF4444'}08`, border: `1px solid ${decision === 'ALLOW' ? '#10B981' : decision === 'STEP_UP' ? '#F59E0B' : '#EF4444'}20`, textAlign: 'center' }}>
                <div style={{ fontSize: 8, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>DECISION</div>
                <div style={{ fontSize: 14, fontWeight: 900, color: decision === 'ALLOW' ? '#10B981' : decision === 'STEP_UP' ? '#F59E0B' : '#EF4444', fontFamily: 'Space Grotesk', marginTop: 2 }}>{decision}</div>
              </div>
              <div style={{ padding: '10px 12px', borderRadius: 10, background: `${stateColor}08`, border: `1px solid ${stateColor}20`, textAlign: 'center' }}>
                <div style={{ fontSize: 8, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>STATE</div>
                <div style={{ fontSize: 14, fontWeight: 900, color: stateColor, fontFamily: 'Space Grotesk', marginTop: 2 }}>{cognitiveState.toUpperCase()}</div>
              </div>
            </div>

            {/* State Machine */}
            <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
              {Object.entries(STATE_COLORS).map(([s, c]) => (
                <span key={s} style={{ fontSize: 7, padding: '2px 6px', borderRadius: 4, background: cognitiveState === s ? `${c}20` : 'rgba(255,255,255,0.02)', border: `1px solid ${cognitiveState === s ? c : 'transparent'}`, color: cognitiveState === s ? c : 'var(--text-muted)', fontWeight: cognitiveState === s ? 800 : 400, fontFamily: 'JetBrains Mono', transition: 'all 0.3s' }}>{s}</span>
              ))}
            </div>

            {/* Metrics */}
            <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 10, padding: '10px 12px', border: '1px solid var(--border-light)' }}>
              <div style={{ fontSize: 8, fontWeight: 700, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', marginBottom: 6, letterSpacing: '0.1em' }}>BEHAVIORAL SIGNALS</div>
              {[
                { label: 'Similarity', value: `${(similarity * 100).toFixed(1)}%`, color: similarity > 0.85 ? '#10B981' : '#EF4444' },
                { label: 'Drift', value: driftDetected ? 'DETECTED' : 'None', color: driftDetected ? '#EF4444' : '#10B981' },
                { label: 'Anomaly', value: `${(anomalyScore * 100).toFixed(0)}%`, color: anomalyScore > 0.3 ? '#EF4444' : '#10B981' },
                { label: 'Fraud Risk', value: `${(fraudProbability * 100).toFixed(0)}%`, color: fraudProbability > 0.3 ? '#EF4444' : '#10B981' },
                { label: 'Velocity', value: velocity.toFixed(4), color: velocity < -0.01 ? '#EF4444' : '#10B981' },
                { label: 'Latency', value: `${latencyMs.toFixed(0)}ms`, color: '#8B5CF6' },
              ].map(m => (
                <div key={m.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <span style={{ fontSize: 9, color: 'var(--text-sub)' }}>{m.label}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: m.color, fontFamily: 'Space Grotesk' }}>{m.value}</span>
                </div>
              ))}
            </div>

            {/* Intent Vector */}
            <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 10, padding: '10px 12px', border: '1px solid var(--border-light)' }}>
              <div style={{ fontSize: 8, fontWeight: 700, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', marginBottom: 6, letterSpacing: '0.1em' }}>FRAUD INTENT</div>
              {[
                { label: 'Coercion', value: intentVector.coercion_probability, color: '#EF4444' },
                { label: 'Takeover', value: intentVector.takeover_probability, color: '#F97316' },
                { label: 'Robotic', value: intentVector.robotic_probability, color: '#8B5CF6' },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{ fontSize: 9, color: 'var(--text-sub)', width: 55 }}>{item.label}</span>
                  <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.04)', borderRadius: 99, overflow: 'hidden' }}>
                    <motion.div animate={{ width: `${item.value * 100}%` }} style={{ height: '100%', background: item.color, borderRadius: 99 }} />
                  </div>
                  <span style={{ fontSize: 9, fontWeight: 700, color: item.value > 0.4 ? item.color : 'var(--text-muted)', width: 24, textAlign: 'right' }}>{(item.value * 100).toFixed(0)}%</span>
                </div>
              ))}
            </div>

            {/* Trust History Mini */}
            <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 24 }}>
              {timeline.slice(-25).map((t, i) => (
                <div key={i} style={{ flex: 1, height: `${Math.max(3, t.trust * 0.24)}px`, borderRadius: 1, background: getTrustColor(t.trust), opacity: 0.4 + (i / 25) * 0.6 }} />
              ))}
            </div>

            {/* Explanation */}
            <div style={{ background: 'rgba(139,92,246,0.04)', borderRadius: 8, padding: '8px 10px', border: '1px solid rgba(139,92,246,0.1)' }}>
              <div style={{ fontSize: 8, fontWeight: 700, color: '#8B5CF6', fontFamily: 'JetBrains Mono', marginBottom: 4 }}>WHY THIS DECISION?</div>
              <p style={{ fontSize: 10, color: 'var(--text-sub)', lineHeight: 1.5, margin: 0 }}>
                {trustScore > 85 ? 'Behavioral fingerprint matches baseline. Typing rhythm, navigation flow, and interaction intensity are consistent with the enrolled user. No fraud signals.' :
                 trustScore > 60 ? `Trust degrading — ${cognitiveState === 'distressed' ? 'elevated hesitation and correction patterns suggest cognitive stress' : cognitiveState === 'panicked' ? 'rapid behavioral changes indicate panic state' : 'behavioral deviation from baseline detected'}. Step-up verification triggered.` :
                 cognitiveState === 'coerced' ? 'CRITICAL: Dictation pattern detected. Typing speed < 1.5 CPS with zero scroll activity. User appears to be reading instructions from an external party (likely phone scam). Transaction blocked to prevent social engineering fraud.' :
                 cognitiveState === 'robotic' ? 'CRITICAL: Non-human behavioral pattern. Zero variance in keystroke timing, perfect swipe linearity, no corrections. This indicates remote access malware or screen mirroring. Session terminated.' :
                 'Trust collapsed below safety threshold. Multiple anomaly signals confirm behavioral identity mismatch. Transaction blocked pending investigation.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LiveDemo
