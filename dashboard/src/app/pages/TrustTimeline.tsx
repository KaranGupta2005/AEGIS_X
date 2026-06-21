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
      content: `Current trust: ${state.trustScore.toFixed(0)}% | Decision: ${state.decision} | State: ${state.cognitiveState.toUpperCase()} | Similarity: ${(state.similarity * 100).toFixed(1)}% | Events: ${state.eventCount}. Try asking: "Why did trust drop?", "What's the fraud probability?", "Analyze cognitive state"`,
      severity: 'LOW',
    })
  }

  return {
    id: `ai_${Date.now()}`,
    role: 'ai',
    content: 'AEGIS-X AI · Reasoning complete',
    cards,
  }
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
  const { timeline, trustScore, isConnected, velocity, similarity, cognitiveState, driftDetected, entropy } = state

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const handleSend = () => {
    if (!input.trim()) return
    const userMsg: Message = { id: `user_${Date.now()}`, role: 'user', content: input }
    const aiMsg = generateAIResponse(input, state)
    setMessages(prev => [...prev, userMsg, aiMsg])
    setInput('')
  }

  const data = timeline.map(t => t.trust)
  const trustColor = trustScore > 85 ? '#10B981' : trustScore > 60 ? '#F59E0B' : '#EF4444'

  const chartOptions: Highcharts.Options = {
    chart: { type: 'areaspline', backgroundColor: 'transparent', height: 280, margin: [10, 10, 30, 40] },
    title: undefined,
    xAxis: { visible: false },
    yAxis: {
      title: { text: '' }, min: 0, max: 100,
      gridLineColor: 'rgba(255,255,255,0.03)',
      labels: { style: { color: '#64748B', fontSize: '9px' } },
      plotLines: [
        { value: 85, color: 'rgba(16,185,129,0.3)', width: 1, dashStyle: 'ShortDash' as any, label: { text: 'ALLOW', style: { color: '#10B981', fontSize: '8px' }, align: 'right' as any } },
        { value: 60, color: 'rgba(239,68,68,0.3)', width: 1, dashStyle: 'ShortDash' as any, label: { text: 'BLOCK', style: { color: '#EF4444', fontSize: '8px' }, align: 'right' as any } },
      ],
    },
    legend: { enabled: false },
    credits: { enabled: false },
    tooltip: { backgroundColor: '#1E293B', borderColor: '#334155', style: { color: '#E2E8F0', fontSize: '10px' }, valueSuffix: '%' },
    plotOptions: { areaspline: { fillColor: { linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 }, stops: [[0, `${trustColor}25`], [1, `${trustColor}00`]] as any }, marker: { enabled: false }, lineWidth: 2.5, animation: { duration: 1000 } } },
    series: [{ type: 'areaspline' as any, name: 'Trust Score', data, color: trustColor }],
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 14, height: 'calc(100vh - 100px)' }}>
      {/* Left: Chart */}
      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0, fontFamily: 'Space Grotesk', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <TrendingDown size={16} color="#F59E0B" /> Trust Timeline
            </h1>
            <p style={{ fontSize: 9, color: 'var(--text-muted)', margin: '2px 0 0', fontFamily: 'JetBrains Mono' }}>
              <Wifi size={9} color={isConnected ? '#10B981' : '#EF4444'} /> Live T(t) — {data.length} observations
            </p>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            {[
              { label: 'TRUST', value: `${trustScore.toFixed(0)}%`, color: trustColor },
              { label: 'VELOCITY', value: velocity.toFixed(4), color: velocity < -0.01 ? '#EF4444' : '#10B981' },
              { label: 'ENTROPY', value: entropy.toFixed(3), color: '#8B5CF6' },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center', padding: '4px 10px', borderRadius: 8, background: 'var(--bg-card)', border: '1px solid var(--border-light)' }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: s.color, fontFamily: 'Space Grotesk' }}>{s.value}</div>
                <div style={{ fontSize: 7, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: 'var(--bg-card)', borderRadius: 14, border: '1px solid var(--border-light)', padding: 16, flex: 1 }}>
          {data.length > 0 ? (
            <HighchartsReact highcharts={Highcharts} options={chartOptions} />
          ) : (
            <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>Waiting for data...</p>
            </div>
          )}
        </div>
      </div>

      {/* Right: AI Copilot */}
      <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--bg-card)', borderRadius: 14, border: '1px solid var(--border-light)', overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-light)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Brain size={16} color="#8B5CF6" />
            <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-main)', fontFamily: 'Space Grotesk' }}>AI Investigator</span>
          </div>
          <p style={{ fontSize: 9, color: 'var(--text-muted)', margin: '3px 0 0', fontFamily: 'JetBrains Mono' }}>Session #{state.userId?.slice(0, 8) || 'demo'} · Reasoning Workspace</p>
        </div>

        {/* Chat Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px' }}>
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <Brain size={28} color="var(--text-muted)" style={{ margin: '0 auto 10px', opacity: 0.3 }} />
              <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '0 0 12px' }}>Ask about trust changes, cognitive state, fraud probability, or drift detection.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {['Why did trust drop?', 'Analyze cognitive state', "What's the fraud probability?"].map(q => (
                  <button key={q} onClick={() => { setInput(q); setTimeout(handleSend, 50) }} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border-light)', background: 'transparent', color: 'var(--text-sub)', fontSize: 10, cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(139,92,246,0.3)'; e.currentTarget.style.color = '#8B5CF6' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-light)'; e.currentTarget.style.color = 'var(--text-sub)' }}>
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map(msg => (
            <div key={msg.id} style={{ marginBottom: 14 }}>
              {msg.role === 'user' ? (
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <div style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '12px 12px 4px 12px', padding: '8px 14px', maxWidth: '85%' }}>
                    <span style={{ fontSize: 8, fontWeight: 700, color: '#8B5CF6', display: 'block', marginBottom: 3 }}>Analyst</span>
                    <span style={{ fontSize: 11, color: 'var(--text-main)' }}>{msg.content}</span>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <div style={{ width: 24, height: 24, borderRadius: 6, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Shield size={12} color="#10B981" />
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#10B981', fontFamily: 'JetBrains Mono' }}>AEGIS-X AI</span>
                    <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>· Reasoning complete</span>
                  </div>
                  {msg.cards?.map((card, i) => <AICardComponent key={i} card={card} />)}
                </div>
              )}
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        {/* Input */}
        <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border-light)' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Ask the AI investigator..."
              style={{ flex: 1, height: 36, padding: '0 12px', borderRadius: 8, border: '1px solid var(--border-light)', background: 'rgba(255,255,255,0.03)', color: 'var(--text-main)', fontSize: 11, outline: 'none', transition: 'border-color 0.2s' }}
              onFocus={e => (e.currentTarget.style.borderColor = 'rgba(139,92,246,0.4)')}
              onBlur={e => (e.currentTarget.style.borderColor = 'var(--border-light)')}
            />
            <button onClick={handleSend} style={{ width: 36, height: 36, borderRadius: 8, border: 'none', background: '#8B5CF6', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Send size={14} />
            </button>
          </div>
          <p style={{ fontSize: 8, color: 'var(--text-muted)', margin: '6px 0 0', fontFamily: 'JetBrains Mono' }}>
            <CheckCircle size={8} color="#10B981" style={{ marginRight: 3 }} />All reasoning is logged and auditable · Session context loaded
          </p>
        </div>
      </div>
    </div>
  )
}

export default TrustTimeline
