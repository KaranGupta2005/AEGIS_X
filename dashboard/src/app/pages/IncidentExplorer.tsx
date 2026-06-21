import React, { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { FileWarning, CheckCircle, Brain, TrendingDown, AlertTriangle, Zap, Shield, Wifi } from 'lucide-react'
import { useStore } from '../../services/store'
import { getExplanation } from '../../services/api'

const ICONS: Record<string, React.ReactNode> = {
  cognitive_stability: <Brain size={15} />,
  drift_detection: <TrendingDown size={15} />,
  transaction_normality: <AlertTriangle size={15} />,
  temporal_dynamics: <Zap size={15} />,
  behavioral_similarity: <Shield size={15} />,
}

const IncidentExplorer: React.FC = () => {
  const { state } = useStore()
  const { trustScore, similarity, cognitiveState, cognitiveStability, driftDetected, driftSeverity, velocity, entropy, decision, reasons, explanation, isConnected } = state

  const [explainData, setExplainData] = useState<any>(null)

  useEffect(() => {
    if (trustScore < 85 || cognitiveState !== 'calm') {
      getExplanation({
        trust_score: trustScore / 100,
        similarity,
        cognitive_state: cognitiveState,
        cognitive_stability: cognitiveStability,
        drift_detected: driftDetected,
        drift_severity: driftSeverity,
        velocity,
        entropy,
        decision,
      }).then(setExplainData).catch(() => {})
    }
  }, [cognitiveState, decision])

  const riskColor = trustScore > 85 ? '#10b981' : trustScore > 60 ? '#f59e0b' : trustScore > 40 ? '#f97316' : '#ef4444'
  const riskLevel = trustScore > 85 ? 'LOW' : trustScore > 60 ? 'MEDIUM' : trustScore > 40 ? 'HIGH' : 'CRITICAL'
  const incidentType = explainData?.incident_type || (cognitiveState === 'robotic' ? 'AUTOMATED_ACTIVITY' : cognitiveState === 'coerced' || cognitiveState === 'panicked' ? 'SOCIAL_ENGINEERING' : driftDetected ? 'BEHAVIORAL_DRIFT' : 'NORMAL_ACTIVITY')

  const rootCauses = explainData?.root_causes || reasons.map((r: string) => ({ cause: r, impact: 'medium', detail: r, component: 'general' }))
  const summary = explainData?.summary || explanation || 'Session operating within normal parameters.'
  const actions = explainData?.recommended_actions || ['No action required — session operating normally.']

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 className="heading" style={{ fontSize: 24, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
          <FileWarning size={20} color="#f59e0b" /> Incident Explorer
        </h1>
        <p className="mono" style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Wifi size={10} color={isConnected ? '#10b981' : '#ef4444'} />
          Root cause analysis from live backend explainability engine
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Root Causes */}
        <div className="card-base" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div className="label-xs">ROOT CAUSES</div>
            <span className="mono" style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 4, color: riskColor, background: `${riskColor}12`, border: `1px solid ${riskColor}25` }}>
              {riskLevel}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {rootCauses.length > 0 ? rootCauses.slice(0, 6).map((rc: any, i: number) => (
              <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-light)', borderRadius: 10, padding: '12px 14px', display: 'flex', gap: 12 }}>
                <div style={{ color: rc.impact === 'high' ? '#ef4444' : '#f59e0b', flexShrink: 0, marginTop: 2 }}>
                  {ICONS[rc.component] || <AlertTriangle size={15} />}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                    <span className="heading" style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-main)' }}>{rc.cause}</span>
                    <span className="mono" style={{ fontSize: 8, padding: '1px 5px', borderRadius: 3, color: rc.impact === 'high' ? '#ef4444' : '#f59e0b', background: rc.impact === 'high' ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.08)' }}>
                      {(rc.impact || 'medium').toUpperCase()}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-sub)', lineHeight: 1.5 }}>{rc.detail}</div>
                </div>
              </motion.div>
            )) : (
              <p className="mono" style={{ fontSize: 11, color: 'var(--text-muted)', padding: 16, textAlign: 'center' }}>No incidents detected. System operating normally.</p>
            )}
          </div>
        </div>

        {/* Right: Summary + Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: `${riskColor}06`, border: `1px solid ${riskColor}25`, borderRadius: 'var(--radius-md)', padding: 20 }}>
            <div className="label-xs" style={{ marginBottom: 6 }}>INCIDENT TYPE</div>
            <div className="mono" style={{ fontSize: 20, fontWeight: 700, color: riskColor }}>{incidentType.replace(/_/g, ' ')}</div>
            <div style={{ fontSize: 12, color: 'var(--text-sub)', marginTop: 6 }}>{explainData?.incident_description || ''}</div>
            <div style={{ display: 'flex', gap: 20, marginTop: 14 }}>
              <div>
                <span className="label-xs">TRUST</span>
                <div className="heading" style={{ fontSize: 16, fontWeight: 700, color: riskColor, marginTop: 2 }}>{trustScore.toFixed(0)}%</div>
              </div>
              <div>
                <span className="label-xs">SIMILARITY</span>
                <div className="heading" style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-main)', marginTop: 2 }}>{(similarity * 100).toFixed(1)}%</div>
              </div>
              <div>
                <span className="label-xs">STATE</span>
                <div className="heading" style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-main)', marginTop: 2 }}>{cognitiveState.toUpperCase()}</div>
              </div>
            </div>
          </div>

          <div className="card-base" style={{ padding: 20 }}>
            <div className="label-xs" style={{ marginBottom: 10 }}>EXECUTIVE SUMMARY</div>
            <p style={{ fontSize: 12, color: 'var(--text-sub)', lineHeight: 1.7, margin: 0 }}>{summary}</p>
          </div>

          <div className="card-base" style={{ padding: 20 }}>
            <div className="label-xs" style={{ marginBottom: 10 }}>RECOMMENDED ACTIONS</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {actions.map((action: string, i: number) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <CheckCircle size={13} color="#10b981" style={{ flexShrink: 0, marginTop: 2 }} />
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
