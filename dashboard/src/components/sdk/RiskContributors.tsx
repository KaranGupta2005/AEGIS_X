import React from 'react'
import { motion } from 'motion/react'

interface RiskContributorsProps {
  similarity: number
  cognitiveStability: number
  anomalyScore: number
  fraudProbability: number
  driftDetected: boolean
}

export const RiskContributors: React.FC<RiskContributorsProps> = ({
  similarity,
  cognitiveStability,
  anomalyScore,
  fraudProbability,
  driftDetected,
}) => {
  const signals = [
    { label: 'Behavioral Match', value: Math.round(similarity * 100), color: '#3B82F6', inverse: false },
    { label: 'Cognitive Stability', value: Math.round(cognitiveStability * 100), color: '#8B5CF6', inverse: false },
    { label: 'Anomaly Score', value: Math.round(anomalyScore * 100), color: '#F59E0B', inverse: true },
    { label: 'Fraud Probability', value: Math.round(fraudProbability * 100), color: '#EF4444', inverse: true },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {signals.map((s) => {
        const risk = s.inverse ? s.value : 100 - s.value
        const barColor = risk > 60 ? '#EF4444' : risk > 30 ? '#F59E0B' : s.color
        return (
          <div key={s.label}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', fontFamily: 'JetBrains Mono' }}>{s.label}</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: barColor, fontFamily: 'Space Grotesk' }}>
                {s.value}%
              </span>
            </div>
            <div style={{ height: 3, background: 'rgba(255,255,255,0.05)', borderRadius: 99, overflow: 'hidden' }}>
              <motion.div
                animate={{ width: `${s.value}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                style={{ height: '100%', background: barColor, borderRadius: 99 }}
              />
            </div>
          </div>
        )
      })}
      {driftDetected && (
        <div style={{
          marginTop: 4, padding: '5px 8px', borderRadius: 6,
          background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
          display: 'flex', alignItems: 'center', gap: 5,
        }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#F59E0B' }} />
          <span style={{ fontSize: 9, color: '#F59E0B', fontFamily: 'JetBrains Mono' }}>CUSUM drift detected</span>
        </div>
      )}
    </div>
  )
}
