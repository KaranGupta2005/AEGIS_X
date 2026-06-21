import React from 'react'
import { TrendingDown, Clock, Wifi } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { useStore } from '../../services/store'

const TrustTimeline: React.FC = () => {
  const { state } = useStore()
  const { timeline, trustScore, isConnected } = state

  const data = timeline.map(t => ({ ...t, trustPercent: t.trust }))
  const minTrust = data.length > 0 ? Math.min(...data.map(d => d.trustPercent)) : 95
  const maxTrust = data.length > 0 ? Math.max(...data.map(d => d.trustPercent)) : 99
  const finalTrust = data.length > 0 ? data[data.length - 1].trustPercent : trustScore

  const getColor = (t: number) => t > 85 ? '#10b981' : t > 60 ? '#f59e0b' : '#ef4444'
  const lineColor = getColor(finalTrust)

  const eventMarkers = data.filter(d => d.drift_detected || d.cognitive_state === 'panicked' || d.cognitive_state === 'coerced' || d.decision === 'BLOCK')

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 className="heading" style={{ fontSize: 24, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <TrendingDown size={20} color="#f59e0b" /> Trust Timeline
          </h1>
          <p className="mono" style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Wifi size={10} color={isConnected ? '#10b981' : '#ef4444'} />
            Live T(t) evolution — {data.length} observations
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Current', value: `${finalTrust.toFixed(0)}%`, color: getColor(finalTrust) },
          { label: 'Peak', value: `${maxTrust.toFixed(0)}%`, color: '#10b981' },
          { label: 'Minimum', value: `${minTrust.toFixed(0)}%`, color: getColor(minTrust) },
          { label: 'Velocity', value: `${state.velocity >= 0 ? '+' : ''}${state.velocity.toFixed(4)}`, color: state.velocity < -0.01 ? '#ef4444' : '#10b981' },
        ].map((s, i) => (
          <div key={i} className="card-base" style={{ padding: '14px 16px' }}>
            <div className="label-xs" style={{ marginBottom: 4 }}>{s.label}</div>
            <div className="heading" style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="card-base" style={{ padding: 24 }}>
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height={340}>
            <AreaChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="trustGradLive" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={lineColor} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={lineColor} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="time" tick={{ fontSize: 9, fill: '#475569', fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: '#475569', fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#0c1222', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontFamily: 'JetBrains Mono', fontSize: 10 }} />
              <ReferenceLine y={85} stroke="#10b981" strokeDasharray="4 4" strokeOpacity={0.4} />
              <ReferenceLine y={60} stroke="#ef4444" strokeDasharray="4 4" strokeOpacity={0.4} />
              <Area type="monotone" dataKey="trustPercent" name="Trust %" stroke={lineColor} strokeWidth={2.5} fill="url(#trustGradLive)" dot={false} activeDot={{ r: 4, stroke: lineColor, strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ height: 340, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p className="mono" style={{ color: 'var(--text-muted)', fontSize: 12 }}>Waiting for data... Switch scenario on Live Monitor to begin.</p>
          </div>
        )}

        {eventMarkers.length > 0 && (
          <div style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {eventMarkers.slice(-5).map((d, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 6 }}>
                <Clock size={11} color="#ef4444" />
                <span className="mono" style={{ fontSize: 9, color: '#ef4444', fontWeight: 600 }}>
                  {d.time} — {d.decision === 'BLOCK' ? 'BLOCKED' : d.cognitive_state.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default TrustTimeline
