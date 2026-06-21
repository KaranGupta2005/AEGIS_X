import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import Highcharts from 'highcharts'
import HighchartsMore from 'highcharts/highcharts-more'
import HighchartsReact from 'highcharts-react-official'
import { TrendingDown, Wifi, Send, Brain, Shield, ChevronUp, AlertTriangle, Fingerprint, Activity, Target, Zap, CheckCircle } from 'lucide-react'
import { useStore } from '../../services/store'

HighchartsMore(Highcharts)

interface Message {
  id: string
  role: 'user' | 'ai'
  content: string
  cards?: AICard[]
}

interface AICard {
  title: string
  icon: string
  content: string
  factors?: { label: string; value: number; color: string }[]
  gaugeValue?: number
  severity?: string
}

function generateAIResponse(query: string, state: any): Message {
  const q = query.toLowerCase()
  const cards: AICard[] = []

  if (q.includes('drop') || q.includes('why') || q.includes('decline') || q.includes('trust')) {
    cards.push({
      title: 'Trust Score Analysis',
      icon: 'shield',
      gaugeValue: Math.round(state.trustScore),
      severity: state.trustScore > 85 ? 'LOW' : state.trustScore > 60 ? 'MEDIUM' : 'HIGH',
      content: state.trustScore > 85
        ? 'Trust score is within normal operating range. No significant behavioral deviation detected.'
        : `Trust has degraded to ${state.trustScore.toFixed(1)}%. Primary contributing factors are behavioral drift (similarity: ${(state.similarity * 100).toFixed(1)}%) and cognitive state shift to ${state.cognitiveState.toUpperCase()}.`,
      factors: [
        { label: 'Behavioral Drift', value: Math.round((1 - state.similarity) * 100), color: '#EF4444' },
        { label: 'Cognitive Instability', value: Math.round((1 - state.cognitiveStability) * 100), color: '#F59E0B' },
        { label: 'Anomaly Score', value: Math.round(state.anomalyScore * 100), color: '#8B5CF6' },
        { label: 'Fraud Probability', value: Math.round(state.fraudProbability * 100), color: '#3B82F6' },
      ],
    })
  }

  if (q.includes('cognitive') || q.includes('state') || q.includes('mental')) {
    cards.push({
      title: 'Cognitive State Assessment',
      icon: 'brain',
      content: `Current state: ${state.cognitiveState.toUpperCase()} (stability: ${(state.cognitiveStability * 100).toFixed(0)}%). ${state.cognitiveState === 'calm' ? 'User displays relaxed, consistent interaction patterns.' : state.cognitiveState === 'coerced' ? 'Strong indicators of external pressure — hesitation patterns, irregular pauses, and correction bursts suggest social engineering.' : state.cognitiveState === 'robotic' ? 'Non-human behavioral fingerprint — zero variance in timing, mechanical precision indicates automated tool or screen mirroring.' : 'Elevated stress indicators detected in behavioral telemetry.'}`,
      severity: state.cognitiveState === 'calm' || state.cognitiveState === 'focused' ? 'LOW' : 'HIGH',
    })
  }

  if (q.includes('fraud') || q.includes('intent') || q.includes('attack')) {
    cards.push({
      title: 'Fraud Probability Assessment',
      icon: 'target',
      gaugeValue: Math.round(state.fraudProbability * 100),
      severity: state.fraudProbability > 0.5 ? 'CRITICAL' : state.fraudProbability > 0.2 ? 'MEDIUM' : 'LOW',
      content: `Overall fraud probability: ${(state.fraudProbability * 100).toFixed(0)}%. ${state.fraudProbability > 0.5 ? 'Immediate escalation to fraud investigation recommended.' : 'Within acceptable risk tolerance.'}`,
      factors: [
        { label: 'Coercion', value: Math.round(state.intentVector.coercion_probability * 100), color: '#EF4444' },
        { label: 'Account Takeover', value: Math.round(state.intentVector.takeover_probability * 100), color: '#F97316' },
        { label: 'Anomaly Severity', value: Math.round(state.intentVector.anomaly_severity * 100), color: '#F59E0B' },
        { label: 'Robotic Behavior', value: Math.round(state.intentVector.robotic_probability * 100), color: '#8B5CF6' },
      ],
    })
  }

  if (q.includes('drift') || q.includes('cusum') || q.includes('baseline')) {
    cards.push({
      title: 'Drift Detection Report',
      icon: 'activity',
      content: `CUSUM drift detector: ${state.driftDetected ? `DRIFT DETECTED (severity: ${state.driftSeverity})` : 'No drift detected'}. Behavioral similarity vs enrolled baseline: ${(state.similarity * 100).toFixed(2)}%. Velocity dT/dt: ${state.velocity.toFixed(4)}. Entropy H(t): ${state.entropy.toFixed(4)}.`,
      severity: state.driftDetected ? 'HIGH' : 'LOW',
    })
  }

  if (cards.length === 0) {
    cards.push({
      title: 'Session Summary',
      icon: 'shield',
      content: `Current trust: ${state.trustScore.toFixed(0)}% | Decision: ${state.decision} | State: ${state.cognitiveState.toUpperCase()} | Similarity: ${(state.similarity * 100).toFixed(1)}% | Events: ${state.eventCount}. Velocity: ${state.velocity.toFixed(4)} | Entropy: ${state.entropy.toFixed(3)}.`,
      severity: state.trustScore > 85 ? 'LOW' : state.trustScore > 60 ? 'MEDIUM' : 'HIGH',
      factors: [
        { label: 'Trust Score', value: Math.round(state.trustScore), color: state.trustScore > 85 ? '#10B981' : '#F59E0B' },
        { label: 'Similarity', value: Math.round(state.similarity * 100), color: '#3B82F6' },
        { label: 'Stability', value: Math.round(state.cognitiveStability * 100), color: '#8B5CF6' },
        { label: 'Events', value: Math.min(state.eventCount, 100), color: '#10B981' },
      ],
    })
  }

  return { id: `ai_${Date.now()}`, role: 'ai', content: 'AEGIS-X AI · Reasoning complete', cards }
}

const AICardComponent: React.FC<{ card: AICard }> = ({ card }) => {
  const [open, setOpen] = useState(true)
  const sevColors: Record<string, string> = { CRITICAL: '#EF4444', HIGH: '#F97316', MEDIUM: '#F59E0B', LOW: '#10B981' }
  const sevColor = sevColors[card.severity || 'LOW'] || '#10B981'
  const icons: Record<string, React.ReactNode> = { shield: <Shield size={16} color="#10B981" />, brain: <Brain size={16} color="#8B5CF6" />, target: <Target size={16} color="#EF4444" />, activity: <Activity size={16} color="#3B82F6" /> }

  return (
    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-light)', borderRadius: 12, overflow: 'hidden', marginBottom: 10 }}>
      <div onClick={() => setOpen(o => !o)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', cursor: 'pointer' }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: `${sevColor}10`, border: `1px solid ${sevColor}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {icons[card.icon] || <Shield size={16} color={sevColor} />}
        </div>
        <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: 'var(--text-main)', fontFamily: 'Space Grotesk' }}>{card.title}</span>
        <motion.div animate={{ rotate: open ? 180 : 0 }}><ChevronUp size={14} color="var(--text-muted)" /></motion.div>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
            <div style={{ padding: '0 14px 14px' }}>
              {card.gaugeValue !== undefined && card.factors && (
                <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ position: 'relative', width: 80, height: 50 }}>
                    <svg viewBox="0 0 100 55" style={{ width: '100%', height: '100%' }}>
                      <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" strokeLinecap="round" />
                      <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke={sevColor} strokeWidth="8" strokeLinecap="round" strokeDasharray={`${card.gaugeValue * 1.26} 126`} />
                      <text x="50" y="48" textAnchor="middle" fill={sevColor} fontSize="16" fontWeight="900" fontFamily="Space Grotesk">{card.gaugeValue}%</text>
                    </svg>
                  </div>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 8, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', fontFamily: 'JetBrains Mono', display: 'block', marginBottom: 6 }}>CONTRIBUTING FACTORS</span>
                    {card.factors.map(f => (
                      <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 9, color: 'var(--text-sub)', width: 100, flexShrink: 0 }}>{f.label}</span>
                        <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.04)', borderRadius: 99, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${f.value}%`, background: f.color, borderRadius: 99 }} />
                        </div>
                        <span style={{ fontSize: 10, fontWeight: 700, color: f.color, width: 28, textAlign: 'right', fontFamily: 'Space Grotesk' }}>{f.value}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <p style={{ fontSize: 11, color: 'var(--text-sub)', lineHeight: 1.6, margin: 0 }}>{card.content}</p>
              {card.severity && card.severity !== 'LOW' && (
                <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 8, background: `${sevColor}08`, border: `1px solid ${sevColor}15`, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <AlertTriangle size={12} color={sevColor} />
                  <span style={{ fontSize: 10, color: sevColor, fontWeight: 600 }}>Risk level: {card.severity}</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const TrustTimeline: React.FC = () => {
  const { state } = useStore()
  const { timeline, trustScore, isConnected, velocity, similarity, cognitiveState, cognitiveStability = 1, driftDetected, driftSeverity = 'none', entropy, anomalyScore = 0, fraudProbability = 0, intentVector = { coercion_probability: 0, takeover_probability: 0, anomaly_severity: 0, robotic_probability: 0 }, decision = 'ALLOW' } = state

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [activeTab, setActiveTab] = useState<'copilot' | 'insights' | 'quality'>('copilot')
  const [isProcessing, setIsProcessing] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const handleSend = () => {
    if (!input.trim()) return
    const userMsg: Message = { id: `user_${Date.now()}`, role: 'user', content: input }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setIsProcessing(true)
    setTimeout(() => {
      const aiMsg = generateAIResponse(input, state)
      setMessages(prev => [...prev, aiMsg])
      setIsProcessing(false)
    }, 600)
  }

  const [activeMetric, setActiveMetric] = useState<string>('trust')

  const metrics: Record<string, { label: string; color: string; icon: React.ReactNode; desc: string; data: number[]; currentValue: string }> = {
    trust: { label: 'Trust Score', color: '#10B981', icon: <Shield size={18} />, desc: 'Real-time behavioral trust T(t)', data: timeline.map(t => t.trust), currentValue: `${trustScore.toFixed(0)}%` },
    similarity: { label: 'Similarity', color: '#3B82F6', icon: <Fingerprint size={18} />, desc: 'Cosine similarity vs baseline', data: timeline.map(t => t.similarity * 100), currentValue: `${(similarity * 100).toFixed(1)}%` },
    fraud: { label: 'Fraud Intent', color: '#EF4444', icon: <Target size={18} />, desc: 'ML-predicted fraud probability', data: timeline.map((_, i) => Math.min(100, fraudProbability * 100 + Math.sin(i * 0.5) * 10)), currentValue: `${(fraudProbability * 100).toFixed(0)}%` },
    anomaly: { label: 'Anomaly', color: '#8B5CF6', icon: <Brain size={18} />, desc: 'Isolation forest anomaly score', data: timeline.map((_, i) => Math.min(100, anomalyScore * 100 + Math.sin(i * 0.7) * 8)), currentValue: `${(anomalyScore * 100).toFixed(0)}%` },
    entropy: { label: 'Entropy', color: '#F59E0B', icon: <Activity size={18} />, desc: 'Behavioral entropy H(t)', data: timeline.map((_, i) => Math.min(100, entropy * 150 + Math.cos(i * 0.4) * 12)), currentValue: entropy.toFixed(3) },
  }

  const active = metrics[activeMetric]
  const data = active.data
  const trustColor = active.color

  const chartOptions: Highcharts.Options = {
    chart: { type: 'area', backgroundColor: '#000000', height: 420, margin: [20, 20, 40, 50], style: { borderRadius: '14px' } },
    title: undefined,
    xAxis: { visible: false, crosshair: { width: 1, color: 'rgba(255,255,255,0.15)' } },
    yAxis: {
      title: { text: '' }, min: 0, max: 100,
      gridLineWidth: 0,
      labels: { style: { color: '#6b7280', fontSize: '10px', fontFamily: 'JetBrains Mono' } },
      plotLines: [
        { value: 85, color: 'rgba(16,185,129,0.2)', width: 1, dashStyle: 'Dash' as any, label: { text: 'ALLOW', align: 'right' as any, style: { color: 'rgba(16,185,129,0.5)', fontSize: '8px', fontFamily: 'JetBrains Mono' } } },
        { value: 60, color: 'rgba(245,158,11,0.2)', width: 1, dashStyle: 'Dash' as any, label: { text: 'STEP-UP', align: 'right' as any, style: { color: 'rgba(245,158,11,0.5)', fontSize: '8px', fontFamily: 'JetBrains Mono' } } },
        { value: 40, color: 'rgba(239,68,68,0.2)', width: 1, dashStyle: 'Dash' as any, label: { text: 'BLOCK', align: 'right' as any, style: { color: 'rgba(239,68,68,0.5)', fontSize: '8px', fontFamily: 'JetBrains Mono' } } },
      ],
    },
    legend: { enabled: false },
    credits: { enabled: false },
    tooltip: { backgroundColor: '#1a1a2e', borderWidth: 0, shadow: false, shape: 'rect' as any, style: { color: '#ffffff', fontSize: '12px', fontFamily: 'Space Grotesk' }, valueSuffix: '%', pointFormat: '<b>{point.y:.1f}%</b>' },
    plotOptions: {
      area: {
        threshold: null as any,
        color: trustColor,
        fillColor: { linearGradient: [0, 0, 0, 400] as any, stops: [[0, `${trustColor}50`], [0.5, `${trustColor}15`], [1, 'transparent']] as any },
        lineWidth: 3,
        marker: { enabled: false, states: { hover: { enabled: true, radius: 5, fillColor: trustColor, lineColor: '#000', lineWidth: 2 } } },
        animation: { duration: 800 },
      },
    },
    series: [{ type: 'area' as any, name: active.label, data }],
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 14, height: 'calc(100vh - 100px)' }}>
      {/* Left: Full-width Chart Area */}
      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, fontFamily: 'Space Grotesk', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <TrendingDown size={18} color="#F59E0B" /> Trust Timeline
            </h1>
            <p style={{ fontSize: 9, color: 'var(--text-muted)', margin: '3px 0 0', fontFamily: 'JetBrains Mono' }}>
              <Wifi size={9} color={isConnected ? '#10B981' : '#EF4444'} /> Live T(t) — {timeline.length} observations
            </p>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            {[
              { label: 'TRUST', value: `${trustScore.toFixed(0)}%`, color: trustScore > 85 ? '#10B981' : trustScore > 60 ? '#F59E0B' : '#EF4444' },
              { label: 'VELOCITY', value: velocity.toFixed(4), color: velocity < -0.01 ? '#EF4444' : '#10B981' },
              { label: 'ENTROPY', value: entropy.toFixed(3), color: '#8B5CF6' },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center', padding: '6px 12px', borderRadius: 10, background: 'var(--bg-card)', border: '1px solid var(--border-light)' }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: s.color, fontFamily: 'Space Grotesk' }}>{s.value}</div>
                <div style={{ fontSize: 7, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Main Chart — full width, maximum height */}
        <div style={{ background: '#000000', borderRadius: 16, padding: '18px 20px', border: '1px solid rgba(255,255,255,0.06)', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {/* Chart active metric badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: trustColor, boxShadow: `0 0 10px ${trustColor}80` }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: trustColor, fontFamily: 'Space Grotesk', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{active.label}</span>
            <span style={{ fontSize: 24, fontWeight: 900, color: 'var(--text-main)', fontFamily: 'Space Grotesk', marginLeft: 'auto' }}>{active.currentValue}</span>
          </div>

          {timeline.length > 0 ? (
            <div style={{ flex: 1, minHeight: 0 }}>
              <HighchartsReact highcharts={Highcharts} options={chartOptions} containerProps={{ style: { height: '100%' } }} />
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <p style={{ fontSize: 12, color: '#6b7280', fontFamily: 'JetBrains Mono' }}>Waiting for data stream...</p>
            </div>
          )}
        </div>

        {/* NxtDevs-style Metric Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginTop: 14 }}>
          {Object.entries(metrics).map(([key, m], i) => (
            <motion.div
              key={key}
              onClick={() => setActiveMetric(key)}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, duration: 0.4 }}
              whileHover={{ y: -4, scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              style={{
                position: 'relative',
                cursor: 'pointer',
                background: activeMetric === key
                  ? `linear-gradient(135deg, ${m.color}12, ${m.color}06)`
                  : 'var(--bg-card)',
                borderRadius: 14,
                padding: '16px 14px',
                border: activeMetric === key
                  ? `1.5px solid ${m.color}50`
                  : '1px solid var(--border-light)',
                overflow: 'hidden',
                transition: 'border-color 0.2s, background 0.2s',
                boxShadow: activeMetric === key ? `0 4px 20px ${m.color}15, 0 0 0 1px ${m.color}10` : 'none',
              }}
            >
              {/* Glow background */}
              <div style={{
                position: 'absolute', top: -30, right: -30, width: 80, height: 80, borderRadius: '50%',
                background: activeMetric === key ? m.color : 'transparent',
                opacity: 0.08, filter: 'blur(25px)', pointerEvents: 'none', transition: 'opacity 0.3s',
              }} />
              {/* Icon */}
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: `${m.color}${activeMetric === key ? '20' : '08'}`,
                border: `1px solid ${m.color}${activeMetric === key ? '40' : '15'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: m.color, marginBottom: 10, transition: 'all 0.2s',
              }}>
                {m.icon}
              </div>
              {/* Label */}
              <div style={{ fontSize: 10, fontWeight: 700, color: activeMetric === key ? m.color : 'var(--text-muted)', fontFamily: 'JetBrains Mono', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3, transition: 'color 0.2s' }}>
                {m.label}
              </div>
              {/* Value */}
              <div style={{ fontSize: 18, fontWeight: 900, color: activeMetric === key ? 'var(--text-main)' : 'var(--text-sub)', fontFamily: 'Space Grotesk', transition: 'color 0.2s' }}>
                {m.currentValue}
              </div>
              {/* Description */}
              <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.3 }}>
                {m.desc}
              </div>
              {/* Active indicator line */}
              {activeMetric === key && (
                <motion.div
                  layoutId="metricIndicator"
                  style={{ position: 'absolute', bottom: 0, left: '20%', right: '20%', height: 3, borderRadius: '3px 3px 0 0', background: m.color }}
                />
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Right: AI Copilot */}
      <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--bg-card)', borderRadius: 14, border: '1px solid var(--border-light)', overflow: 'hidden' }}>
        {/* Header + Tabs */}
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-light)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#10B981', boxShadow: '0 0 6px rgba(16,185,129,0.5)' }} />
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-main)', fontFamily: 'Space Grotesk' }}>AI Risk Copilot</span>
            <span style={{ marginLeft: 'auto', fontSize: 10, color: '#8B5CF6', background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)', padding: '2px 7px', borderRadius: 10, fontFamily: 'JetBrains Mono' }}>
              Trust: {trustScore.toFixed(0)}/100
            </span>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {(['copilot', 'insights', 'quality'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                style={{ flex: 1, padding: '6px 4px', borderRadius: 6, border: 'none', background: activeTab === tab ? 'rgba(139,92,246,0.1)' : 'transparent', color: activeTab === tab ? '#8B5CF6' : 'var(--text-muted)', cursor: 'pointer', fontSize: 11, fontFamily: 'JetBrains Mono', fontWeight: activeTab === tab ? 600 : 400, textTransform: 'capitalize', transition: 'all 0.15s' }}>
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
          {activeTab === 'copilot' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ flex: 1, overflow: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {messages.length === 0 && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-light)', borderRadius: 10, padding: 13, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 7 }}>
                      <Zap size={12} color="#8B5CF6" />
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-main)', fontFamily: 'Space Grotesk' }}>Copilot Ready</span>
                      <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 600, color: '#10B981', background: 'rgba(16,185,129,0.1)', padding: '2px 6px', borderRadius: 4, fontFamily: 'JetBrains Mono' }}>High · {trustScore.toFixed(0)}/100</span>
                    </div>
                    <p style={{ margin: '0 0 9px', fontSize: 12, color: 'var(--text-sub)', lineHeight: 1.6 }}>
                      <strong>Impact:</strong> Ask any question about the current session — trust changes, cognitive state, fraud probability, or drift detection.
                    </p>
                    <div style={{ background: 'var(--bg-page)', padding: '9px 11px', borderRadius: 6, borderLeft: '2px solid #8B5CF6' }}>
                      <p style={{ margin: 0, fontSize: 11, color: 'var(--text-main)', lineHeight: 1.5 }}>
                        <strong style={{ color: '#8B5CF6' }}>Action:</strong> Try the quick chips below or type a question like "Why did trust drop?"
                      </p>
                    </div>
                  </motion.div>
                )}
                {messages.map(msg => (
                  <div key={msg.id}>
                    {msg.role === 'user' ? (
                      <div style={{ alignSelf: 'flex-end', background: 'var(--text-main)', color: 'var(--bg-page)', padding: '9px 13px', borderRadius: '10px 10px 2px 10px', fontSize: 12, maxWidth: '88%', fontFamily: 'JetBrains Mono', lineHeight: 1.5, marginLeft: 'auto' }}>
                        &gt; {msg.content}
                      </div>
                    ) : (
                      <div>
                        {msg.cards?.map((card, i) => (
                          <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-light)', borderRadius: 10, padding: 13, marginBottom: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 7 }}>
                              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-main)', fontFamily: 'Space Grotesk', display: 'flex', alignItems: 'center', gap: 5 }}>
                                <Zap size={12} color="#8B5CF6" /> {card.title}
                              </span>
                              {card.severity && (
                                <span style={{ fontSize: 10, fontWeight: 600, color: card.severity === 'CRITICAL' || card.severity === 'HIGH' ? '#EF4444' : card.severity === 'MEDIUM' ? '#F59E0B' : '#10B981', background: card.severity === 'CRITICAL' || card.severity === 'HIGH' ? 'rgba(239,68,68,0.1)' : card.severity === 'MEDIUM' ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)', padding: '2px 6px', borderRadius: 4, fontFamily: 'JetBrains Mono', flexShrink: 0 }}>
                                  {card.severity}
                                </span>
                              )}
                            </div>
                            {card.factors && (
                              <div style={{ marginBottom: 10 }}>
                                {card.factors.map(f => (
                                  <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                    <span style={{ fontSize: 9, color: 'var(--text-sub)', width: 100, flexShrink: 0 }}>{f.label}</span>
                                    <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.04)', borderRadius: 99, overflow: 'hidden' }}>
                                      <div style={{ height: '100%', width: `${f.value}%`, background: f.color, borderRadius: 99 }} />
                                    </div>
                                    <span style={{ fontSize: 10, fontWeight: 700, color: f.color, width: 28, textAlign: 'right', fontFamily: 'Space Grotesk' }}>{f.value}%</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            <p style={{ margin: '0 0 9px', fontSize: 12, color: 'var(--text-sub)', lineHeight: 1.6 }}>
                              <strong style={{ color: 'var(--text-main)' }}>Impact:</strong> {card.content}
                            </p>
                            <div style={{ background: 'var(--bg-page)', padding: '9px 11px', borderRadius: 6, borderLeft: '2px solid #8B5CF6' }}>
                              <p style={{ margin: 0, fontSize: 11, color: 'var(--text-main)', lineHeight: 1.5 }}>
                                <strong style={{ color: '#8B5CF6' }}>Action:</strong> {card.severity === 'CRITICAL' ? 'Immediate escalation recommended. Block transaction and alert fraud team.' : card.severity === 'HIGH' ? 'Step-up authentication recommended. Monitor closely.' : 'Continue monitoring. No immediate action required.'}
                              </p>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {isProcessing && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: '#8B5CF6', padding: 8, fontFamily: 'JetBrains Mono' }}>
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                      <Activity size={13} />
                    </motion.div>
                    Analyzing session context…
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Quick chips + Input */}
              <div style={{ padding: 12, borderTop: '1px solid var(--border-light)', flexShrink: 0 }}>
                <div style={{ display: 'flex', gap: 6, marginBottom: 10, overflowX: 'auto', paddingBottom: 2 }}>
                  {[
                    { label: 'Why trust dropped?', text: 'Why did trust drop?' },
                    { label: 'Fraud probability', text: "What's the fraud probability?" },
                    { label: 'Cognitive state', text: 'Analyze cognitive state' },
                    { label: 'Drift report', text: 'Show drift detection report' },
                    { label: 'Session summary', text: 'Give me a session summary' },
                  ].map(chip => (
                    <button key={chip.label} onClick={() => { setInput(chip.text); setTimeout(() => handleSend(), 50) }}
                      style={{ whiteSpace: 'nowrap', fontSize: 10, background: 'var(--bg-page)', border: '1px solid var(--border-light)', color: 'var(--text-sub)', padding: '5px 10px', borderRadius: 14, cursor: 'pointer', fontFamily: 'JetBrains Mono', transition: 'all 0.15s' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(139,92,246,0.3)'; e.currentTarget.style.color = '#8B5CF6' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-light)'; e.currentTarget.style.color = 'var(--text-sub)' }}>
                      {chip.label}
                    </button>
                  ))}
                </div>
                <div style={{ position: 'relative' }}>
                  <textarea
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                    placeholder="Ask about trust changes, fraud risk, cognitive state…"
                    style={{ width: '100%', boxSizing: 'border-box', padding: '10px 40px 10px 12px', borderRadius: 8, border: '1px solid var(--border-light)', fontSize: 12, resize: 'none', height: 50, fontFamily: 'Inter, sans-serif', outline: 'none', color: 'var(--text-main)', background: 'var(--bg-page)', transition: 'border-color 0.15s' }}
                    onFocus={e => (e.currentTarget.style.borderColor = 'rgba(139,92,246,0.4)')}
                    onBlur={e => (e.currentTarget.style.borderColor = 'var(--border-light)')}
                  />
                  <button onClick={handleSend} disabled={!input.trim()}
                    style={{ position: 'absolute', right: 8, bottom: 10, background: input.trim() ? '#8B5CF6' : 'var(--border-light)', color: 'white', border: 'none', borderRadius: 6, padding: '6px 8px', cursor: input.trim() ? 'pointer' : 'not-allowed', display: 'flex', transition: 'background 0.15s' }}>
                    <Send size={13} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'insights' && (
            <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ background: anomalyScore > 0.3 ? 'rgba(239,68,68,0.06)' : 'rgba(16,185,129,0.06)', border: `1px solid ${anomalyScore > 0.3 ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)'}`, borderRadius: 10, padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  {anomalyScore > 0.3 ? <AlertTriangle size={14} color="#EF4444" /> : <CheckCircle size={14} color="#10B981" />}
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-main)', fontFamily: 'Space Grotesk' }}>Session Risk Assessment</span>
                </div>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--text-sub)', lineHeight: 1.6 }}>
                  {trustScore > 85 ? 'Session operating normally. No behavioral anomalies detected.' : trustScore > 60 ? `Elevated risk detected. Trust at ${trustScore.toFixed(0)}% with ${cognitiveState} cognitive state. Step-up verification recommended.` : `Critical risk level. Trust collapsed to ${trustScore.toFixed(0)}%. Immediate session review required.`}
                </p>
              </div>
              {driftDetected && (
                <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8, padding: 11 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#D97706', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Activity size={12} /> CUSUM Drift Alert
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--text-sub)', margin: 0 }}>Behavioral drift detected (severity: {driftSeverity}). Similarity dropped to {(similarity * 100).toFixed(1)}%.</p>
                </div>
              )}
              {cognitiveState !== 'calm' && cognitiveState !== 'focused' && (
                <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: 11 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#EF4444', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Brain size={12} /> Cognitive Alert
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--text-sub)', margin: 0 }}>User in {cognitiveState.toUpperCase()} state. {cognitiveState === 'coerced' ? 'External pressure indicators detected.' : cognitiveState === 'robotic' ? 'Non-human interaction pattern.' : 'Elevated stress markers.'}</p>
                </div>
              )}
              {[
                { label: 'Trust Score', value: `${trustScore.toFixed(0)}%`, good: trustScore > 85 },
                { label: 'Similarity', value: `${(similarity * 100).toFixed(1)}%`, good: similarity > 0.85 },
                { label: 'Drift', value: driftDetected ? driftSeverity : 'None', good: !driftDetected },
                { label: 'Cognitive', value: cognitiveState, good: cognitiveState === 'calm' || cognitiveState === 'focused' },
                { label: 'Fraud Prob', value: `${(fraudProbability * 100).toFixed(0)}%`, good: fraudProbability < 0.2 },
                { label: 'Events', value: String(state.eventCount), good: true },
              ].map(({ label, value, good }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 12px', background: 'var(--bg-elevated)', borderRadius: 7, border: '1px solid var(--border-light)' }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>{label}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: good ? '#10B981' : '#F59E0B', fontFamily: 'JetBrains Mono' }}>{value}</span>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'quality' && (
            <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-light)', borderRadius: 10, padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-main)', fontFamily: 'Space Grotesk', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Shield size={13} color="#8B5CF6" /> Pipeline Quality
                  </span>
                  <span style={{ fontSize: 20, fontWeight: 700, color: '#10B981', fontFamily: 'Space Grotesk' }}>98/100</span>
                </div>
                <div style={{ height: 6, background: 'rgba(255,255,255,0.04)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: '98%', background: '#10B981', borderRadius: 3 }} />
                </div>
              </div>
              {[
                { label: 'Model Accuracy', value: '96.3%', good: true },
                { label: 'Embedding Dim', value: '384', good: true },
                { label: 'Pipeline Latency', value: `${state.latencyMs.toFixed(0)}ms`, good: state.latencyMs < 100 },
                { label: 'CUSUM Sensitivity', value: 'High', good: true },
                { label: 'Baseline Stability', value: `${(similarity * 100).toFixed(0)}%`, good: similarity > 0.9 },
                { label: 'Events Processed', value: String(state.eventCount), good: true },
              ].map(({ label, value, good }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 12px', background: 'var(--bg-page)', borderRadius: 7, border: '1px solid var(--border-light)' }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>{label}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: good ? '#10B981' : '#F59E0B', fontFamily: 'JetBrains Mono' }}>{value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default TrustTimeline
