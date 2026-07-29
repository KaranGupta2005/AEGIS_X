import React from 'react'
import { AreaChart, Area, XAxis, YAxis, ReferenceLine, Tooltip, ResponsiveContainer } from 'recharts'
import { TimelineEntry } from '../../services/store'

interface LiveTrustChartProps {
  timeline: TimelineEntry[]
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  const t = payload[0].value as number
  const color = t > 85 ? '#3B82F6' : t > 60 ? '#F59E0B' : '#EF4444'
  return (
    <div style={{ background: 'var(--bg-elevated)', border: `1px solid var(--border-medium)`, borderRadius: 8, padding: '6px 10px', boxShadow: 'var(--shadow-md)' }}>
      <div style={{ fontSize: 14, fontWeight: 800, color, fontFamily: 'Space Grotesk' }}>{t.toFixed(1)}%</div>
      <div style={{ fontSize: 8, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>{payload[0].payload.cognitive_state?.toUpperCase()}</div>
    </div>
  )
}

export const LiveTrustChart: React.FC<LiveTrustChartProps> = ({ timeline }) => {
  const data = timeline.slice(-40)
  
  // Dynamic color based on latest trust value
  const latestTrust = data.length > 0 ? data[data.length - 1].trust : 95
  const chartColor = latestTrust > 78 ? '#3B82F6' : latestTrust > 50 ? '#F59E0B' : '#EF4444'
  const gradId = `trustGrad_${Math.round(latestTrust)}`

  return (
    <div style={{ height: 80, width: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={chartColor} stopOpacity={0.40} />
              <stop offset="100%" stopColor={chartColor} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <XAxis hide />
          <YAxis hide domain={[0, 100]} />
          <ReferenceLine y={78} stroke="rgba(59,130,246,0.25)" strokeDasharray="3 3" />
          <ReferenceLine y={50} stroke="rgba(239,68,68,0.30)" strokeDasharray="3 3" />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="trust"
            stroke={chartColor}
            strokeWidth={2.5}
            fill={`url(#${gradId})`}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
