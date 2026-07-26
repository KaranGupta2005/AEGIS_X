import React from 'react'
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip } from 'recharts'
import { motion } from 'motion/react'

interface FraudIntentRadarProps {
  coercion: number
  takeover: number
  anomaly: number
  robotic: number
  fraudProbability: number
}

export const FraudIntentRadar: React.FC<FraudIntentRadarProps> = ({
  coercion, takeover, anomaly, robotic, fraudProbability,
}) => {
  const data = [
    { subject: 'Coercion', value: Math.round(coercion * 100) },
    { subject: 'Takeover', value: Math.round(takeover * 100) },
    { subject: 'Anomaly', value: Math.round(anomaly * 100) },
    { subject: 'Robotic', value: Math.round(robotic * 100) },
    { subject: 'Fraud', value: Math.round(fraudProbability * 100) },
  ]

  const maxVal = Math.max(...data.map(d => d.value))
  const radarColor = maxVal > 60 ? '#EF4444' : maxVal > 30 ? '#F59E0B' : '#10B981'

  return (
    <div style={{ position: 'relative', height: 120 }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} margin={{ top: 4, right: 16, bottom: 4, left: 16 }}>
          <PolarGrid stroke="rgba(255,255,255,0.06)" />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 8, fontFamily: 'JetBrains Mono' }}
          />
          <Radar
            dataKey="value"
            stroke={radarColor}
            fill={radarColor}
            fillOpacity={0.12}
            strokeWidth={1.5}
            isAnimationActive={false}
          />
          <Tooltip
            contentStyle={{
              background: 'rgba(8,12,20,0.95)', border: `1px solid ${radarColor}30`,
              borderRadius: 8, fontSize: 10, fontFamily: 'Space Grotesk',
            }}
            labelStyle={{ color: 'rgba(255,255,255,0.6)' }}
            itemStyle={{ color: radarColor }}
            formatter={(v: number) => [`${v}%`, '']}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}
