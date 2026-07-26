import React from 'react'
import { AreaChart, Area, XAxis, YAxis, ReferenceLine, Tooltip, ResponsiveContainer } from 'recharts'
import { TimelineEntry } from '../../services/store'

interface LiveTrustChartProps {
  timeline: TimelineEntry[]
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  const t = payload[0].value as number
  const color = t > 85 ? '#10B981' : t > 60 ? '#F59E0B' : '#EF4444'
  return (
    <div style={{ background: 'rgba(8,12,20,0.95)', border: `1px solid ${color}30`, borderRadius: 8, padding: '6px 10px' }}>
      <div style={{ fontSize: 14, fontWeight: 800, color, fontFamily: 'Space Grotesk' }}>{t.toFixed(1)}%</div>
      <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)', fontFamily: 'JetBrains Mono' }}>{payload[0].payload.cognitive_state?.toUpperCase()}</div>
    </div>
  )
}

export const LiveTrustChart: React.FC<LiveTrustChartProps> = ({ timeline }) => {
  const data = timeline.slice(-40)

  return (
    <div style={{ height: 80, width: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="trustGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10B981" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis hide />
          <YAxis hide domain={[0, 100]} />
          <ReferenceLine y={85} stroke="rgba(16,185,129,0.2)" strokeDasharray="3 3" />
          <ReferenceLine y={60} stroke="rgba(239,68,68,0.2)" strokeDasharray="3 3" />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="trust"
            stroke="#10B981"
            strokeWidth={2}
            fill="url(#trustGrad)"
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
