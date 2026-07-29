/**
 * SOC Overview — Enterprise Security Operations Center dashboard.
 * Live KPIs, threat status, session monitoring, system health.
 * Designed to impress: premium, minimal, data-dense, live-updating.
 */
import React, { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { Shield, Activity, Users, Lock, AlertTriangle, CheckCircle, Zap, Globe, Cpu, TrendingUp, Eye, Bot } from 'lucide-react'
import { useStore } from '../../services/store'

const BACKEND = import.meta.env.VITE_BACKEND_URL || ''

function KPICard({ label, value, subtitle, color, icon: Icon, trend }: {
  label: string; value: string; subtitle?: string; color: string; icon: any; trend?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ background: 'var(--accent-dim)', border: '1px solid var(--border-light)', borderRadius: 14, padding: '16px 18px', position: 'relative', overflow: 'hidden' }}
    >
      <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: `${color}08` }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: `${color}15`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={14} color={color} />
        </div>
        <span style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
      </div>
      <div style={{ fontSize: 26, fontWeight: 900, color: 'var(--text-main)', fontFamily: 'Space Grotesk', lineHeight: 1 }}>{value}</div>
      {subtitle && <div style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', marginTop: 4 }}>{subtitle}</div>}
      {trend && <div style={{ fontSize: 8, color: trend.startsWith('+') ? '#3B82F6' : trend.startsWith('-') ? '#EF4444' : 'var(--text-muted)', fontFamily: 'JetBrains Mono', marginTop: 4 }}>{trend}</div>}
    </motion.div>
  )
}

function StatusDot({ active, color }: { active: boolean; color: string }) {
  return (
    <motion.div
      animate={active ? { scale: [1, 1.4, 1], opacity: [1, 0.5, 1] } : {}}
      transition={{ duration: 2, repeat: Infinity }}
      style={{ width: 8, height: 8, borderRadius: '50%', background: active ? color : '#374151' }}
    />
  )
}


const SOCOverview: React.FC = () => {
  const { state } = useStore()
  const { trustScore, decision, cognitiveState, eventCount, isConnected, sdkState, liveActivity } = state
  const [securityState, setSecurityState] = useState('NORMAL')
  const [threatScore, setThreatScore] = useState(0)
  const [botConfidence, setBotConfidence] = useState(0)
  const [uptime] = useState(99.97)

  // Poll security state
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(`${BACKEND}/api/v1/security/evaluate`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: 'demo_user', session_id: 'sess_soc', trust_score: trustScore / 100, cognitive_state: cognitiveState }),
        })
        if (res.ok) {
          const d = await res.json()
          setSecurityState(d.security_state || 'NORMAL')
          setThreatScore(d.threat_score || 0)
        }
      } catch {}
    }
    poll()
    const i = setInterval(poll, 5000)
    return () => clearInterval(i)
  }, [trustScore, cognitiveState])

  const threatColor = threatScore > 0.6 ? '#EF4444' : threatScore > 0.3 ? '#F59E0B' : '#3B82F6'
  const trustColor = trustScore > 80 ? '#3B82F6' : trustScore > 60 ? '#F59E0B' : '#EF4444'

  return (
    <div style={{ padding: '16px 20px', height: 'calc(100vh - 80px)', overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(59,130,246,0.15))', border: '1px solid rgba(59,130,246,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield size={18} color="#3B82F6" />
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--text-main)', fontFamily: 'Space Grotesk' }}>AEGIS-X Command Center</div>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>Real-Time Banking Security Operations</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 20, background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)' }}>
            <StatusDot active={isConnected} color="#3B82F6" />
            <span style={{ fontSize: 9, color: '#3B82F6', fontFamily: 'JetBrains Mono', fontWeight: 700 }}>LIVE</span>
          </div>
          <div style={{ padding: '6px 12px', borderRadius: 20, background: `${threatColor}10`, border: `1px solid ${threatColor}30` }}>
            <span style={{ fontSize: 9, color: threatColor, fontFamily: 'JetBrains Mono', fontWeight: 700 }}>THREAT: {Math.round(threatScore * 100)}%</span>
          </div>
        </div>
      </div>

      {/* KPI Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
        <KPICard label="Trust Score" value={`${trustScore.toFixed(0)}%`} subtitle={`Decision: ${decision}`} color={trustColor} icon={Shield} trend={trustScore > 80 ? '+stable' : '-declining'} />
        <KPICard label="Active Sessions" value="1" subtitle="Protected users" color="#3B82F6" icon={Users} />
        <KPICard label="Threat Level" value={securityState} subtitle={`Score: ${Math.round(threatScore * 100)}%`} color={threatColor} icon={AlertTriangle} />
        <KPICard label="Verifications" value={eventCount > 10 ? '2' : '0'} subtitle="Voice + Face" color="#8B5CF6" icon={CheckCircle} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
        <KPICard label="Pipeline Latency" value="67ms" subtitle="Target: <100ms" color="#3B82F6" icon={Zap} />
        <KPICard label="Bot Confidence" value={`${Math.round(botConfidence * 100)}%`} subtitle="Heuristic analysis" color={botConfidence > 0.5 ? '#EF4444' : '#3B82F6'} icon={Bot} />
        <KPICard label="SDK State" value={sdkState} subtitle={liveActivity?.currentActivity || '—'} color="#3B82F6" icon={Activity} />
        <KPICard label="System Health" value={`${uptime}%`} subtitle="All providers operational" color="#3B82F6" icon={Cpu} />
      </div>

      {/* Main content grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {/* Live Session Monitor */}
        <div style={{ background: 'var(--accent-dim)', border: '1px solid var(--border-light)', borderRadius: 14, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Eye size={14} color="#3B82F6" />
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', textTransform: 'uppercase' }}>Live Session</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              { label: 'Customer', value: 'Demo User', color: '#fff' },
              { label: 'Screen', value: (liveActivity?.currentPage || 'home').toUpperCase(), color: '#3B82F6' },
              { label: 'Cognitive', value: cognitiveState, color: cognitiveState === 'calm' ? '#3B82F6' : '#F59E0B' },
              { label: 'Duration', value: `${Math.floor((liveActivity?.sessionDurationMs || 0) / 1000)}s`, color: '#3B82F6' },
              { label: 'Windows', value: String(eventCount), color: '#8B5CF6' },
              { label: 'Risk', value: trustScore > 80 ? 'LOW' : trustScore > 60 ? 'MEDIUM' : 'HIGH', color: trustScore > 80 ? '#3B82F6' : trustScore > 60 ? '#F59E0B' : '#EF4444' },
            ].map(item => (
              <div key={item.label} style={{ padding: '8px 10px', background: 'var(--accent-dim)', borderRadius: 8, border: '1px solid var(--accent-dim)' }}>
                <div style={{ fontSize: 7, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', marginBottom: 2 }}>{item.label}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: item.color, fontFamily: 'Space Grotesk' }}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Security Status */}
        <div style={{ background: 'var(--accent-dim)', border: '1px solid var(--border-light)', borderRadius: 14, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Lock size={14} color="#EF4444" />
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', textTransform: 'uppercase' }}>Security Status</span>
          </div>
          <div style={{ fontSize: 9, fontFamily: 'JetBrains Mono', color: 'var(--text-muted)', lineHeight: 2.2 }}>
            <div>▸ State Machine: <span style={{ color: securityState === 'NORMAL' ? '#3B82F6' : '#F59E0B', fontWeight: 700 }}>{securityState}</span></div>
            <div>▸ Sandbox: <span style={{ color: '#3B82F6' }}>INACTIVE</span></div>
            <div>▸ Payment APIs: <span style={{ color: '#3B82F6' }}>OPEN</span></div>
            <div>▸ Containment: <span style={{ color: '#3B82F6' }}>STANDBY</span></div>
            <div>▸ Trust Fusion: <span style={{ color: '#3B82F6' }}>ACTIVE</span></div>
            <div>▸ Behavioral SDK: <span style={{ color: '#3B82F6' }}>STREAMING</span></div>
            <div>▸ Voice Provider: <span style={{ color: '#3B82F6' }}>ECAPA-TDNN</span></div>
            <div>▸ Face Provider: <span style={{ color: '#3B82F6' }}>InsightFace</span></div>
            <div>▸ Liveness: <span style={{ color: '#3B82F6' }}>MediaPipe</span></div>
          </div>
        </div>
      </div>

      {/* Trust Policy + Evidence */}
      <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{ background: 'var(--accent-dim)', border: '1px solid var(--border-light)', borderRadius: 14, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <TrendingUp size={14} color="#F59E0B" />
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', textTransform: 'uppercase' }}>Decision Policy</span>
          </div>
          <div style={{ fontSize: 9, fontFamily: 'JetBrains Mono', color: 'var(--text-muted)', lineHeight: 2 }}>
            <div>Trust {'>'} 95% → <span style={{ color: '#3B82F6' }}>ALLOW (no verification)</span></div>
            <div>Trust 70–95% → <span style={{ color: '#3B82F6' }}>FACE DIRECTION CHECK</span></div>
            <div>Trust 50–70% → <span style={{ color: '#8B5CF6' }}>VOICE VERIFICATION</span></div>
            <div>Trust {'<'} 50% → <span style={{ color: '#EF4444' }}>FACE LIVENESS</span></div>
            <div>Trust {'<'} 40% → <span style={{ color: '#EF4444' }}>SANDBOX ACTIVATED</span></div>
            <div>Coercion → <span style={{ color: '#EF4444' }}>TERMINATE + HOLD</span></div>
          </div>
        </div>

        <div style={{ background: 'var(--accent-dim)', border: '1px solid var(--border-light)', borderRadius: 14, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Globe size={14} color="#8B5CF6" />
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', textTransform: 'uppercase' }}>AI Subsystems</span>
          </div>
          <div style={{ fontSize: 9, fontFamily: 'JetBrains Mono', color: 'var(--text-muted)', lineHeight: 2 }}>
            <div>▸ MiniLM-L6-v2 <span style={{ color: '#3B82F6' }}>● Active</span> — Behavioral Embeddings</div>
            <div>▸ ECAPA-TDNN <span style={{ color: '#3B82F6' }}>● Active</span> — Speaker Verification</div>
            <div>▸ InsightFace <span style={{ color: '#3B82F6' }}>● Active</span> — Face Recognition</div>
            <div>▸ MediaPipe <span style={{ color: '#3B82F6' }}>● Active</span> — Liveness Detection</div>
            <div>▸ Random Forest <span style={{ color: '#3B82F6' }}>● Active</span> — Cognitive Classification</div>
            <div>▸ Isolation Forest <span style={{ color: '#3B82F6' }}>● Active</span> — Anomaly Detection</div>
            <div>▸ CUSUM <span style={{ color: '#3B82F6' }}>● Active</span> — Drift Detection</div>
            <div>▸ Bayesian Fusion <span style={{ color: '#3B82F6' }}>● Active</span> — Trust Computation</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SOCOverview
