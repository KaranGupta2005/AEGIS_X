/**
 * Security Operations — Containment status, threat monitoring,
 * sandbox status, bot detection, and forensic reports.
 */
import React, { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { Shield, AlertTriangle, Bot, Lock, Activity, Eye, FileText } from 'lucide-react'
import { useStore } from '../../services/store'

const BACKEND = import.meta.env.VITE_BACKEND_URL || ''

const STATE_COLORS: Record<string, string> = {
  NORMAL: '#10B981', MONITORING: '#3B82F6', SUSPICIOUS: '#F59E0B',
  CONTAINMENT: '#EF4444', VERIFICATION: '#8B5CF6', RECOVERY: '#10B981', TERMINATED: '#6B7280',
}

function MetricCard({ label, value, color, icon: Icon }: { label: string; value: string; color: string; icon?: any }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        {Icon && <Icon size={14} color={color} />}
        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', fontFamily: 'JetBrains Mono' }}>{label}</span>
      </div>
      <div style={{ fontSize: 16, fontWeight: 800, color, fontFamily: 'Space Grotesk' }}>{value}</div>
    </div>
  )
}

const SecurityOps: React.FC = () => {
  const { state } = useStore()
  const { trustScore, decision, cognitiveState, eventCount } = state
  const [secStatus, setSecStatus] = useState<any>(null)
  const [botData, setBotData] = useState<any>(null)
  const userId = 'demo_user'
  const sessionId = 'sess_demo'

  useEffect(() => {
    const poll = async () => {
      try {
        const evalRes = await fetch(`${BACKEND}/api/v1/security/evaluate`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: userId, session_id: sessionId,
            trust_score: trustScore / 100,
            cognitive_state: cognitiveState,
            drift_detected: trustScore < 70,
            drift_severity: trustScore < 50 ? 'high' : trustScore < 70 ? 'medium' : 'none',
            velocity: 0, anomaly_score: trustScore < 60 ? 0.6 : 0.1,
          }),
        })
        if (evalRes.ok) setSecStatus(await evalRes.json())

        const botRes = await fetch(`${BACKEND}/api/v1/security/intelligence/bot/${userId}/${sessionId}`)
        if (botRes.ok) setBotData(await botRes.json())
      } catch {}
    }
    poll()
    const interval = setInterval(poll, 4000)
    return () => clearInterval(interval)
  }, [trustScore, cognitiveState])

  const secState = secStatus?.security_state || 'NORMAL'
  const stateColor = STATE_COLORS[secState] || '#6B7280'

  return (
    <div style={{ padding: '20px 24px', height: 'calc(100vh - 80px)', overflowY: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Shield size={18} color="#EF4444" />
        </div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'white', fontFamily: 'Space Grotesk' }}>Security Operations</div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontFamily: 'JetBrains Mono' }}>Deception & Secure Transaction Sandbox</div>
        </div>
        {/* Live state badge */}
        <motion.div key={secState} initial={{ scale: 0.8 }} animate={{ scale: 1 }}
          style={{ marginLeft: 'auto', padding: '6px 14px', borderRadius: 20, background: `${stateColor}15`, border: `1px solid ${stateColor}40` }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: stateColor, fontFamily: 'Space Grotesk' }}>{secState}</span>
        </motion.div>
      </div>

      {/* Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
        <MetricCard label="Security State" value={secState} color={stateColor} icon={Shield} />
        <MetricCard label="Threat Score" value={`${Math.round((secStatus?.threat_score ?? 0) * 100)}%`} color={secStatus?.threat_score > 0.5 ? '#EF4444' : '#10B981'} icon={AlertTriangle} />
        <MetricCard label="Bot Confidence" value={`${Math.round((botData?.confidence ?? 0) * 100)}%`} color={(botData?.confidence ?? 0) > 0.5 ? '#EF4444' : '#10B981'} icon={Bot} />
        <MetricCard label="Sandbox" value={secStatus?.sandbox_active ? 'ACTIVE' : 'INACTIVE'} color={secStatus?.sandbox_active ? '#EF4444' : '#10B981'} icon={Lock} />
      </div>

      {/* Security State Flow */}
      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.3)', fontFamily: 'JetBrains Mono', marginBottom: 10, textTransform: 'uppercase' }}>State Machine</div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
          {['NORMAL', 'MONITORING', 'SUSPICIOUS', 'CONTAINMENT', 'VERIFICATION', 'RECOVERY', 'TERMINATED'].map((s, i) => (
            <React.Fragment key={s}>
              <div style={{ padding: '4px 10px', borderRadius: 6, background: s === secState ? `${STATE_COLORS[s]}20` : 'rgba(255,255,255,0.03)', border: `1px solid ${s === secState ? STATE_COLORS[s] : 'rgba(255,255,255,0.06)'}`, fontSize: 8, fontWeight: 700, color: s === secState ? STATE_COLORS[s] : 'rgba(255,255,255,0.3)', fontFamily: 'JetBrains Mono' }}>
                {s}
              </div>
              {i < 6 && <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: 10 }}>→</span>}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Threat Reasons + Bot Indicators */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 14 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.3)', fontFamily: 'JetBrains Mono', marginBottom: 8, textTransform: 'uppercase' }}>Threat Reasons</div>
          {(secStatus?.reasons || ['No threats detected']).map((r: string, i: number) => (
            <div key={i} style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontFamily: 'Space Grotesk', padding: '3px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>• {r}</div>
          ))}
        </div>
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 14 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.3)', fontFamily: 'JetBrains Mono', marginBottom: 8, textTransform: 'uppercase' }}>Bot Indicators</div>
          {botData && Object.entries(botData).filter(([k, v]) => k !== 'confidence' && v === true).map(([k]) => (
            <div key={k} style={{ fontSize: 10, color: '#EF4444', fontFamily: 'JetBrains Mono', padding: '3px 0' }}>⚠ {k.replace(/_/g, ' ')}</div>
          ))}
          {(!botData || Object.values(botData).filter(v => v === true).length === 0) && (
            <div style={{ fontSize: 10, color: '#10B981', fontFamily: 'Space Grotesk' }}>No bot indicators detected</div>
          )}
        </div>
      </div>

      {/* Policy Info */}
      <div style={{ marginTop: 16, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 14 }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.3)', fontFamily: 'JetBrains Mono', marginBottom: 8, textTransform: 'uppercase' }}>Trust Policy</div>
        <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono', color: 'rgba(255,255,255,0.5)', lineHeight: 2 }}>
          <div>▸ Trust {'>'} 80% → <span style={{ color: '#10B981' }}>NORMAL</span></div>
          <div>▸ Trust 60–80% → <span style={{ color: '#3B82F6' }}>MONITORING</span> (increased observation)</div>
          <div>▸ Trust 40–60% → <span style={{ color: '#F59E0B' }}>SUSPICIOUS</span> (containment prep)</div>
          <div>▸ Trust {'<'} 40% → <span style={{ color: '#EF4444' }}>CONTAINMENT</span> (sandbox active, APIs isolated)</div>
          <div>▸ Critical → <span style={{ color: '#6B7280' }}>TERMINATED</span> (all operations frozen)</div>
        </div>
      </div>
    </div>
  )
}

export default SecurityOps
