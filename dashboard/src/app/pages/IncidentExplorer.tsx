import React, { useState } from 'react'
import { motion } from 'motion/react'
import { FileWarning, CheckCircle, AlertTriangle, Shield, Zap, Brain, TrendingDown } from 'lucide-react'

const INCIDENTS = {
  social_engineering: {
    type: 'SOCIAL ENGINEERING',
    color: '#ef4444',
    description: 'Possible social engineering / scam call coercion.',
    trustScore: 0.43,
    similarity: 0.72,
    riskLevel: 'HIGH',
    rootCauses: [
      { impact: 'high', cause: 'Acute psychological distress', detail: 'Elevated hesitation, high correction frequency, and motor control degradation suggest severe stress.', icon: <Brain size={16} /> },
      { impact: 'high', cause: 'CUSUM drift alert (high)', detail: 'Change-point detection triggered — significant cumulative behavioral deviation.', icon: <TrendingDown size={16} /> },
      { impact: 'medium', cause: 'Abnormal transaction pattern', detail: '₹2,00,000 to new/unknown beneficiary at unusual time.', icon: <AlertTriangle size={16} /> },
      { impact: 'medium', cause: 'Accelerating trust decay', detail: 'Trust score declining at -0.05/step — situation actively worsening.', icon: <Zap size={16} /> },
      { impact: 'medium', cause: 'Behavioral instability', detail: 'Oscillating behavior — user alternating between compliance and resistance.', icon: <Shield size={16} /> },
    ],
    summary: 'User behavior deviated significantly from baseline. Trust score declined from 0.95 to 0.43 over 6 observations. Cognitive state escalated from CALM to PANICKED to COERCED. Multiple hesitation spikes and motor control anomalies detected. The session ended in a blocked state due to critical trust failure.',
    actions: [
      'Immediately block pending transaction.',
      'Flag session for fraud investigation team review.',
      'Contact customer through verified phone number.',
      'Do NOT use in-app messaging (scammer may be reading screen).',
    ],
  },
  account_takeover: {
    type: 'ACCOUNT TAKEOVER',
    color: '#f59e0b',
    description: 'Gradual behavioral drift from established baseline.',
    trustScore: 0.55,
    similarity: 0.62,
    riskLevel: 'HIGH',
    rootCauses: [
      { impact: 'high', cause: 'Severe behavioral identity mismatch', detail: 'Behavioral similarity at 62% — significant deviation from verified user baseline.', icon: <Shield size={16} /> },
      { impact: 'high', cause: 'CUSUM drift alert (high)', detail: 'Progressive cumulative deviation over 20 observations.', icon: <TrendingDown size={16} /> },
      { impact: 'medium', cause: 'Accelerating trust decay', detail: 'Trust declining consistently with negative velocity.', icon: <Zap size={16} /> },
    ],
    summary: 'Session exhibited progressive behavioral drift from the established baseline over 20 steps. Typing rhythm, swipe velocity, and touch pressure all shifted systematically — consistent with a different actor gaining control of the device. Trust declined from 0.96 to 0.55.',
    actions: [
      'Immediately block pending transaction.',
      'Request customer re-authentication through separate channel.',
      'Initiate device security verification.',
    ],
  },
  automated_activity: {
    type: 'AUTOMATED ACTIVITY',
    color: '#8b5cf6',
    description: 'Scripted or remotely-controlled device activity.',
    trustScore: 0.38,
    similarity: 0.85,
    riskLevel: 'CRITICAL',
    rootCauses: [
      { impact: 'high', cause: 'Automated interaction pattern', detail: 'Near-zero variance across all behavioral features — characteristic of scripted input.', icon: <Brain size={16} /> },
      { impact: 'high', cause: 'CUSUM drift alert (critical)', detail: 'Catastrophic behavioral change detected instantly.', icon: <TrendingDown size={16} /> },
      { impact: 'medium', cause: 'Abnormal transaction pattern', detail: '₹5,00,000 to unknown beneficiary — rapid automated transfer.', icon: <AlertTriangle size={16} /> },
    ],
    summary: 'Device is being controlled remotely. All behavioral inputs show machine precision — zero hesitation, zero corrections, perfect swipe linearity. Gyroscope shows device is completely stationary. This is consistent with screen-mirroring malware executing automated fund transfers.',
    actions: [
      'Immediately block pending transaction.',
      'Temporarily lock account pending device verification.',
      'Initiate device security scan request.',
      'Flag for security operations team.',
    ],
  },
}

type IncidentType = keyof typeof INCIDENTS

const IncidentExplorer: React.FC = () => {
  const [selected, setSelected] = useState<IncidentType>('social_engineering')
  const incident = INCIDENTS[selected]

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, fontFamily: 'Space Grotesk', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
          <FileWarning size={20} color="#f59e0b" /> Incident Explorer
        </h1>
        <p style={{ color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', fontSize: 12, marginTop: 4 }}>
          Root cause analysis • Explainability engine • Compliance narratives
        </p>
      </div>

      {/* Incident selector */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
        {(Object.keys(INCIDENTS) as IncidentType[]).map(key => {
          const inc = INCIDENTS[key]
          return (
            <button key={key} onClick={() => setSelected(key)} style={{
              padding: '10px 16px', borderRadius: 10, fontSize: 12, fontWeight: 600,
              fontFamily: 'JetBrains Mono', cursor: 'pointer',
              background: selected === key ? `${inc.color}15` : 'var(--bg-card)',
              border: `1px solid ${selected === key ? inc.color : 'var(--border-light)'}`,
              color: selected === key ? inc.color : 'var(--text-sub)',
            }}>
              {inc.type}
            </button>
          )
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Left: Root Causes */}
        <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-light)', borderRadius: 16, padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', letterSpacing: '0.08em' }}>ROOT CAUSES</div>
            <span style={{
              fontSize: 10, fontWeight: 700, fontFamily: 'JetBrains Mono', padding: '3px 8px', borderRadius: 4,
              color: incident.color, background: `${incident.color}15`, border: `1px solid ${incident.color}30`,
            }}>
              {incident.riskLevel}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {incident.rootCauses.map((rc, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                style={{
                  background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-light)',
                  borderRadius: 10, padding: '12px 14px', display: 'flex', gap: 12,
                }}
              >
                <div style={{ color: rc.impact === 'high' ? '#ef4444' : '#f59e0b', flexShrink: 0, marginTop: 2 }}>{rc.icon}</div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-main)', fontFamily: 'Space Grotesk' }}>{rc.cause}</span>
                    <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, fontFamily: 'JetBrains Mono', color: rc.impact === 'high' ? '#ef4444' : '#f59e0b', background: rc.impact === 'high' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)' }}>
                      {rc.impact.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-sub)', lineHeight: 1.5 }}>{rc.detail}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Right: Summary + Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Incident Header */}
          <div style={{ background: `${incident.color}08`, border: `1px solid ${incident.color}30`, borderRadius: 12, padding: 20 }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', marginBottom: 6 }}>INCIDENT TYPE</div>
            <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'JetBrains Mono', color: incident.color }}>{incident.type}</div>
            <div style={{ fontSize: 12, color: 'var(--text-sub)', marginTop: 6 }}>{incident.description}</div>
            <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
              <div><span style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>TRUST</span><div style={{ fontSize: 16, fontWeight: 700, color: incident.color, fontFamily: 'Space Grotesk' }}>{(incident.trustScore * 100).toFixed(0)}%</div></div>
              <div><span style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>SIMILARITY</span><div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-main)', fontFamily: 'Space Grotesk' }}>{(incident.similarity * 100).toFixed(0)}%</div></div>
            </div>
          </div>

          {/* Executive Summary */}
          <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-light)', borderRadius: 12, padding: 20 }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', marginBottom: 10, letterSpacing: '0.08em' }}>EXECUTIVE SUMMARY</div>
            <p style={{ fontSize: 12, color: 'var(--text-sub)', lineHeight: 1.7, margin: 0 }}>{incident.summary}</p>
          </div>

          {/* Recommended Actions */}
          <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-light)', borderRadius: 12, padding: 20 }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', marginBottom: 10, letterSpacing: '0.08em' }}>RECOMMENDED ACTIONS</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {incident.actions.map((action, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <CheckCircle size={14} color="#10b981" style={{ flexShrink: 0, marginTop: 1 }} />
                  <span style={{ fontSize: 12, color: 'var(--text-main)', lineHeight: 1.5 }}>{action}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default IncidentExplorer
