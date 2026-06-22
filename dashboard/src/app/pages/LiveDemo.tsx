import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  CreditCard, Send, Shield, Brain, AlertTriangle, Wifi, WifiOff,
  Fingerprint, Activity, Target, Zap, User, CheckCircle,
  Lock, Eye, IndianRupee,
} from 'lucide-react'

const WS_URL = `ws://${window.location.hostname}:8000`

const STATE_COLORS: Record<string, string> = {
  calm: '#10B981', focused: '#3B82F6', distressed: '#F59E0B',
  panicked: '#F97316', coerced: '#EF4444', robotic: '#8B5CF6',
}

function getTrustColor(score: number) {
  if (score > 85) return '#10B981'
  if (score > 60) return '#F59E0B'
  return '#EF4444'
}

const BENEFICIARIES = [
  { name: 'Ravi Sharma', account: 'SBI ••4521', isNew: false },
  { name: 'Unknown Vendor', account: 'Axis ••9087', isNew: true },
  { name: 'Priya Mehta', account: 'HDFC ••2234', isNew: false },
  { name: 'Suspicious Entity', account: 'PNB ••6661', isNew: true },
]

interface TrustResponse {
  trust_score: number
  effective_trust: number
  decision: string
  cognitive_state: string
  similarity: number
  drift_detected: boolean
  drift_severity: string
  anomaly?: { score: number; is_anomaly: boolean }
  fraud?: { probability: number; trajectory: string; intent_vector: { coercion_probability: number; takeover_probability: number; anomaly_severity: number; robotic_probability: number } }
  temporal?: { velocity: number; acceleration: number; trend: string; entropy: number }
  latency_ms: number
  event_number: number
  cognitive_stability?: number
}

const LiveDemo: React.FC = () => {
  const [wsConnected, setWsConnected] = useState(false)
  const [trustData, setTrustData] = useState<TrustResponse | null>(null)
  const [balance, setBalance] = useState(542000)
  const [amount, setAmount] = useState('')
  const [remarks, setRemarks] = useState('')
  const [selectedBen, setSelectedBen] = useState(0)
  const [txStatus, setTxStatus] = useState<'idle' | 'processing' | 'allowed' | 'blocked' | 'stepup'>('idle')
  const [trustHistory, setTrustHistory] = useState<number[]>([])
  const [pipelineLog, setPipelineLog] = useState<string[]>([])

  const wsRef = useRef<WebSocket | null>(null)
  const keyTimesRef = useRef<number[]>([])
  const correctionsRef = useRef(0)
  const totalKeysRef = useRef(0)
  const pausesRef = useRef(0)
  const lastKeyRef = useRef(0)
  const flushIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Connect WebSocket on mount
  useEffect(() => {
    const userId = `demo_live_${Date.now()}`
    const ws = new WebSocket(`${WS_URL}/ws/${userId}`)
    wsRef.current = ws

    ws.onopen = () => {
      setWsConnected(true)
      setPipelineLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] WebSocket connected — session ${userId}`])
    }
    ws.onclose = () => setWsConnected(false)
    ws.onerror = () => setWsConnected(false)

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.trust_score !== undefined) {
          setTrustData(data)
          setTrustHistory(prev => [...prev.slice(-30), data.trust_score * 100])
          setPipelineLog(prev => [...prev.slice(-20), `[${new Date().toLocaleTimeString()}] Trust: ${(data.trust_score * 100).toFixed(1)}% | State: ${data.cognitive_state} | Decision: ${data.decision} | ${data.latency_ms?.toFixed(0)}ms`])
        }
      } catch {}
    }

    // Flush behavioral features every 2 seconds
    flushIntervalRef.current = setInterval(() => {
      if (ws.readyState !== WebSocket.OPEN) return
      const now = performance.now()
      const elapsed = 2
      const typingSpeed = totalKeysRef.current / Math.max(elapsed, 0.1)
      const correctionRate = totalKeysRef.current > 0 ? correctionsRef.current / totalKeysRef.current : 0
      const hesitationRatio = totalKeysRef.current > 0 ? pausesRef.current / totalKeysRef.current : 0

      let keyFlightMean = 150
      if (keyTimesRef.current.length > 1) {
        const flights: number[] = []
        for (let i = 1; i < keyTimesRef.current.length; i++) flights.push(keyTimesRef.current[i] - keyTimesRef.current[i - 1])
        keyFlightMean = flights.reduce((a, b) => a + b, 0) / flights.length
      }

      const features = {
        typing_speed_cps: Math.min(12, typingSpeed),
        key_hold_mean_ms: 80 + Math.random() * 40,
        key_flight_mean_ms: keyFlightMean,
        typing_burst_ratio: Math.min(1, totalKeysRef.current / 20),
        correction_rate: correctionRate,
        pause_frequency: Math.min(1, pausesRef.current / Math.max(totalKeysRef.current, 1)),
        hesitation_ratio: hesitationRatio,
        long_pause_count: pausesRef.current,
        tap_interval_mean_ms: 200 + Math.random() * 100,
        tap_duration_mean_ms: 100 + Math.random() * 50,
        swipe_velocity_mean: 1.0 + Math.random() * 0.5,
        swipe_straightness: 0.8 + Math.random() * 0.15,
        scroll_speed_mean: Math.random() * 200,
        scroll_reversals: Math.floor(Math.random() * 2),
        gyroscope_variance: 0.01 + Math.random() * 0.02,
        accelerometer_jerk: 0.5 + Math.random() * 1.0,
      }

      ws.send(JSON.stringify({
        type: 'behavioral_event',
        event: features,
        transaction_amount: Number(amount) || 0,
        is_new_beneficiary: BENEFICIARIES[selectedBen]?.isNew || false,
      }))

      // Reset counters
      keyTimesRef.current = []
      correctionsRef.current = 0
      totalKeysRef.current = 0
      pausesRef.current = 0
    }, 2000)

    return () => {
      ws.close()
      if (flushIntervalRef.current) clearInterval(flushIntervalRef.current)
    }
  }, [])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const now = performance.now()
    if (lastKeyRef.current > 0 && now - lastKeyRef.current > 2000) pausesRef.current++
    if (e.key === 'Backspace') correctionsRef.current++
    totalKeysRef.current++
    keyTimesRef.current.push(now)
    lastKeyRef.current = now
  }, [])

  const handleTransfer = () => {
    if (!amount) return
    setTxStatus('processing')
    setPipelineLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ⚡ Transfer initiated — ₹${Number(amount).toLocaleString()} to ${BENEFICIARIES[selectedBen].name}`])

    setTimeout(() => {
      const d = trustData?.decision || 'ALLOW'
      const ts = (trustData?.trust_score || 0.95) * 100
      if (d === 'ALLOW' && ts > 80) {
        setTxStatus('allowed')
        setBalance(b => b - Number(amount))
        setPipelineLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ✅ APPROVED — Trust ${ts.toFixed(0)}%`])
      } else if (d === 'BLOCK' || ts < 60) {
        setTxStatus('blocked')
        setPipelineLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ⛔ BLOCKED — Trust ${ts.toFixed(0)}%, State: ${trustData?.cognitive_state}`])
      } else {
        setTxStatus('stepup')
        setPipelineLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ⚠️ STEP-UP — Trust ${ts.toFixed(0)}%`])
      }
    }, 1200)
  }

  const t = trustData
  const trustScore = (t?.trust_score || 0.95) * 100
  const trustColor = getTrustColor(trustScore)
  const cogState = t?.cognitive_state || 'calm'
  const ben = BENEFICIARIES[selectedBen]

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, fontFamily: 'Space Grotesk', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <CreditCard size={18} color="#10B981" /> Live End-to-End Demo
          </h1>
          <p style={{ fontSize: 9, color: 'var(--text-muted)', margin: '2px 0 0', fontFamily: 'JetBrains Mono' }}>
            {wsConnected ? <><Wifi size={9} color="#10B981" /> Connected — YOUR keystrokes → backend pipeline → live trust score</> : <><WifiOff size={9} color="#EF4444" /> Disconnected — start backend with uvicorn</>}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 8, background: wsConnected ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)', border: `1px solid ${wsConnected ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)'}` }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: wsConnected ? '#10B981' : '#EF4444', boxShadow: wsConnected ? '0 0 6px #10B981' : 'none' }} />
          <span style={{ fontSize: 9, fontWeight: 700, color: wsConnected ? '#10B981' : '#EF4444', fontFamily: 'JetBrains Mono' }}>
            {wsConnected ? `Event #${t?.event_number || 0}` : 'OFFLINE'}
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 12 }}>
        {/* LEFT: Banking App + Explanation */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Bank Card */}
          <div style={{ background: 'linear-gradient(135deg, #0F2027, #203A43, #2C5364)', borderRadius: 16, padding: '18px 22px', border: '1px solid rgba(255,255,255,0.08)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -30, right: -30, width: 100, height: 100, borderRadius: '50%', background: 'rgba(16,185,129,0.06)', filter: 'blur(20px)' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div>
                <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)', fontFamily: 'JetBrains Mono', letterSpacing: '0.12em' }}>CENTRAL BANK OF INDIA</span>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'white', fontFamily: 'Space Grotesk', marginTop: 2 }}>•••• •••• •••• 4521</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: 7, color: 'rgba(255,255,255,0.4)', fontFamily: 'JetBrains Mono' }}>AVAILABLE</span>
                <div style={{ fontSize: 18, color: '#10B981', fontFamily: 'Space Grotesk', fontWeight: 900 }}>₹{balance.toLocaleString()}</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Shield size={12} color="rgba(16,185,129,0.5)" />
              <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)', fontFamily: 'JetBrains Mono' }}>AEGIS-X Protected</span>
            </div>
          </div>

          {/* Transfer Form */}
          <div style={{ background: 'var(--bg-card)', borderRadius: 14, border: '1px solid var(--border-light)', padding: '16px 18px' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-main)', fontFamily: 'Space Grotesk', display: 'block', marginBottom: 12 }}>Fund Transfer</span>
            <label style={{ fontSize: 8, fontWeight: 700, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', display: 'block', marginBottom: 5 }}>TO</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 12 }}>
              {BENEFICIARIES.map((b, i) => (
                <motion.div key={i} onClick={() => setSelectedBen(i)} whileTap={{ scale: 0.97 }}
                  style={{ padding: '7px 10px', borderRadius: 8, cursor: 'pointer', border: `1px solid ${selectedBen === i ? (b.isNew ? 'rgba(239,68,68,0.4)' : 'rgba(16,185,129,0.4)') : 'var(--border-light)'}`, background: selectedBen === i ? (b.isNew ? 'rgba(239,68,68,0.05)' : 'rgba(16,185,129,0.05)') : 'transparent' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <User size={9} color={b.isNew ? '#EF4444' : '#10B981'} />
                    <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-main)' }}>{b.name}</span>
                    {b.isNew && <span style={{ fontSize: 6, padding: '0 3px', borderRadius: 2, background: 'rgba(239,68,68,0.1)', color: '#EF4444', fontWeight: 800 }}>NEW</span>}
                  </div>
                  <span style={{ fontSize: 8, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>{b.account}</span>
                </motion.div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 8, fontWeight: 700, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', display: 'block', marginBottom: 4 }}>AMOUNT</label>
                <input type="text" value={amount} onChange={e => setAmount(e.target.value.replace(/[^0-9]/g, ''))} onKeyDown={handleKeyDown} placeholder="₹50,000"
                  style={{ width: '100%', height: 38, padding: '0 10px', borderRadius: 8, border: '1px solid var(--border-light)', background: 'rgba(255,255,255,0.03)', color: 'var(--text-main)', fontSize: 14, fontWeight: 700, fontFamily: 'Space Grotesk', outline: 'none', boxSizing: 'border-box' }}
                  onFocus={e => (e.currentTarget.style.borderColor = 'rgba(16,185,129,0.4)')} onBlur={e => (e.currentTarget.style.borderColor = 'var(--border-light)')} />
              </div>
              <div>
                <label style={{ fontSize: 8, fontWeight: 700, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', display: 'block', marginBottom: 4 }}>REMARKS</label>
                <input type="text" value={remarks} onChange={e => setRemarks(e.target.value)} onKeyDown={handleKeyDown} placeholder="Payment for..."
                  style={{ width: '100%', height: 38, padding: '0 10px', borderRadius: 8, border: '1px solid var(--border-light)', background: 'rgba(255,255,255,0.03)', color: 'var(--text-main)', fontSize: 11, fontFamily: 'Inter', outline: 'none', boxSizing: 'border-box' }}
                  onFocus={e => (e.currentTarget.style.borderColor = 'rgba(16,185,129,0.4)')} onBlur={e => (e.currentTarget.style.borderColor = 'var(--border-light)')} />
              </div>
            </div>

            <motion.button onClick={handleTransfer} disabled={!amount || txStatus === 'processing'} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
              style={{ width: '100%', height: 40, borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #10B981, #059669)', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontFamily: 'Space Grotesk', opacity: !amount ? 0.5 : 1, boxShadow: '0 4px 14px rgba(16,185,129,0.2)' }}>
              {txStatus === 'processing' ? <><Activity size={13} /> Verifying...</> : <><Send size={13} /> Transfer ₹{Number(amount || 0).toLocaleString()}</>}
            </motion.button>

            <AnimatePresence>
              {txStatus !== 'idle' && txStatus !== 'processing' && (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  style={{ marginTop: 10, padding: '10px 12px', borderRadius: 10, background: txStatus === 'allowed' ? 'rgba(16,185,129,0.06)' : txStatus === 'blocked' ? 'rgba(239,68,68,0.06)' : 'rgba(245,158,11,0.06)', border: `1px solid ${txStatus === 'allowed' ? 'rgba(16,185,129,0.2)' : txStatus === 'blocked' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)'}`, display: 'flex', alignItems: 'center', gap: 8 }}>
                  {txStatus === 'allowed' ? <CheckCircle size={15} color="#10B981" /> : txStatus === 'blocked' ? <AlertTriangle size={15} color="#EF4444" /> : <Lock size={15} color="#F59E0B" />}
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: txStatus === 'allowed' ? '#10B981' : txStatus === 'blocked' ? '#EF4444' : '#F59E0B', fontFamily: 'Space Grotesk' }}>
                      {txStatus === 'allowed' ? 'APPROVED' : txStatus === 'blocked' ? 'BLOCKED' : 'STEP-UP REQUIRED'}
                    </div>
                    <div style={{ fontSize: 9, color: 'var(--text-sub)', marginTop: 1 }}>
                      Trust: {trustScore.toFixed(0)}% · State: {cogState} · Latency: {t?.latency_ms?.toFixed(0) || '—'}ms
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Pipeline Log (terminal) */}
          <div style={{ background: '#000', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)', padding: '10px 12px', maxHeight: 140, overflowY: 'auto' }}>
            <div style={{ fontSize: 8, fontWeight: 700, color: '#10B981', fontFamily: 'JetBrains Mono', marginBottom: 6 }}>$ aegisx-pipeline --live</div>
            {pipelineLog.slice(-10).map((line, i) => (
              <div key={i} style={{ fontSize: 9, color: '#94A3B8', fontFamily: 'JetBrains Mono', lineHeight: 1.6, opacity: 0.5 + (i / 10) * 0.5 }}>{line}</div>
            ))}
            {pipelineLog.length === 0 && <div style={{ fontSize: 9, color: '#475569', fontFamily: 'JetBrains Mono' }}>Waiting for behavioral events...</div>}
          </div>
        </div>

        {/* RIGHT: Live Trust + Telemetry */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Trust Gauge */}
          <div style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border-light)', padding: '12px', textAlign: 'center' }}>
            <svg width={130} height={72} viewBox="0 0 140 80" style={{ display: 'block', margin: '0 auto' }}>
              <path d="M 15 70 A 55 55 0 0 1 125 70" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={10} strokeLinecap="round" />
              {(() => {
                const pct = Math.max(0, Math.min(100, trustScore)) / 100
                const angle = Math.PI * (1 - pct)
                const ex = 70 + 55 * Math.cos(angle), ey = 70 - 55 * Math.sin(angle)
                return <path d={`M 15 70 A 55 55 0 ${pct > 0.5 ? 1 : 0} 1 ${ex.toFixed(1)} ${ey.toFixed(1)}`} fill="none" stroke={trustColor} strokeWidth={10} strokeLinecap="round" style={{ filter: `drop-shadow(0 0 6px ${trustColor}60)`, transition: 'all 0.4s' }} />
              })()}
              <text x={70} y={50} textAnchor="middle" fill={trustColor} fontSize={22} fontWeight={900} fontFamily="Space Grotesk">{Math.round(trustScore)}</text>
              <text x={70} y={68} textAnchor="middle" fill="#64748B" fontSize={8} fontFamily="JetBrains Mono">LIVE TRUST</text>
            </svg>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 4 }}>
              <span style={{ fontSize: 8, padding: '2px 6px', borderRadius: 4, background: `${trustColor}12`, color: trustColor, fontWeight: 800, fontFamily: 'JetBrains Mono' }}>{t?.decision || 'ALLOW'}</span>
              <span style={{ fontSize: 8, padding: '2px 6px', borderRadius: 4, background: `${STATE_COLORS[cogState]}12`, color: STATE_COLORS[cogState], fontWeight: 800, fontFamily: 'JetBrains Mono' }}>{cogState.toUpperCase()}</span>
            </div>
          </div>

          {/* State Machine */}
          <div style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border-light)', padding: '8px 10px' }}>
            <span style={{ fontSize: 7, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'JetBrains Mono', display: 'block', marginBottom: 5 }}>Cognitive State Machine</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
              {Object.entries(STATE_COLORS).map(([s, c]) => (
                <span key={s} style={{ fontSize: 7, padding: '2px 5px', borderRadius: 3, background: cogState === s ? `${c}20` : 'rgba(255,255,255,0.02)', border: `1px solid ${cogState === s ? c : 'transparent'}`, color: cogState === s ? c : 'var(--text-muted)', fontWeight: cogState === s ? 800 : 400, fontFamily: 'JetBrains Mono', transition: 'all 0.2s' }}>{s}</span>
              ))}
            </div>
          </div>

          {/* Live Metrics from Backend */}
          <div style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border-light)', padding: '10px 12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
              <Fingerprint size={9} color="#3B82F6" />
              <span style={{ fontSize: 7, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'JetBrains Mono' }}>Backend Response</span>
              <div style={{ width: 4, height: 4, borderRadius: '50%', background: wsConnected ? '#10B981' : '#EF4444', marginLeft: 'auto' }} />
            </div>
            {[
              { label: 'Trust Score', value: `${trustScore.toFixed(1)}%`, color: trustColor },
              { label: 'Similarity', value: `${((t?.similarity || 1) * 100).toFixed(1)}%`, color: (t?.similarity || 1) > 0.85 ? '#10B981' : '#EF4444' },
              { label: 'Drift', value: t?.drift_detected ? t.drift_severity.toUpperCase() : 'NONE', color: t?.drift_detected ? '#EF4444' : '#10B981' },
              { label: 'Anomaly', value: `${((t?.anomaly?.score || 0) * 100).toFixed(0)}%`, color: (t?.anomaly?.score || 0) > 0.3 ? '#EF4444' : '#10B981' },
              { label: 'Fraud', value: `${((t?.fraud?.probability || 0) * 100).toFixed(0)}%`, color: (t?.fraud?.probability || 0) > 0.3 ? '#EF4444' : '#10B981' },
              { label: 'Velocity', value: t?.temporal?.velocity?.toFixed(4) || '0.0000', color: (t?.temporal?.velocity || 0) < -0.01 ? '#EF4444' : '#10B981' },
              { label: 'Latency', value: `${t?.latency_ms?.toFixed(0) || '—'}ms`, color: '#8B5CF6' },
              { label: 'Events', value: String(t?.event_number || 0), color: '#3B82F6' },
            ].map(m => (
              <div key={m.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid var(--border-light)' }}>
                <span style={{ fontSize: 9, color: 'var(--text-sub)' }}>{m.label}</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: m.color, fontFamily: 'Space Grotesk' }}>{m.value}</span>
              </div>
            ))}
          </div>

          {/* Trust History Mini Bars */}
          <div style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border-light)', padding: '8px 10px' }}>
            <span style={{ fontSize: 7, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'JetBrains Mono', display: 'block', marginBottom: 4 }}>Trust History</span>
            <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 28 }}>
              {trustHistory.slice(-20).map((ts, i) => (
                <div key={i} style={{ flex: 1, height: `${Math.max(4, ts * 0.28)}px`, borderRadius: 1, background: getTrustColor(ts), opacity: 0.4 + (i / 20) * 0.6, transition: 'height 0.3s' }} />
              ))}
              {trustHistory.length === 0 && <span style={{ fontSize: 8, color: 'var(--text-muted)', margin: 'auto' }}>waiting...</span>}
            </div>
          </div>

          {/* T(t) Formula */}
          <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: '8px 10px', border: '1px solid rgba(255,255,255,0.04)' }}>
            <div style={{ fontSize: 7, fontWeight: 700, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', marginBottom: 5, letterSpacing: '0.06em' }}>T(t) = 0.40×Sim + 0.20×Dev + 0.20×Tx + 0.20×Cog</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
              {[
                { label: 'Sim', value: ((t?.similarity || 1) * 100).toFixed(0), color: '#10B981' },
                { label: 'Dev', value: '95', color: '#3B82F6' },
                { label: 'Tx', value: ben.isNew ? '40' : '90', color: '#F59E0B' },
                { label: 'Cog', value: ((t?.cognitive_stability || 1) * 100).toFixed(0), color: '#8B5CF6' },
              ].map(c => (
                <div key={c.label} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: c.color, fontFamily: 'Space Grotesk' }}>{c.value}</div>
                  <div style={{ fontSize: 6, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>{c.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LiveDemo
