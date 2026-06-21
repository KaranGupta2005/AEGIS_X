import React, { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { TrendingDown, Clock } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Area, AreaChart } from 'recharts'

type Scenario = 'normal' | 'scam' | 'malware'

function generateData(scenario: Scenario, length: number) {
  const data = []
  let trust = 95
  for (let i = 0; i < length; i++) {
    const time = `${String(Math.floor(i / 30) + 10).padStart(2, '0')}:${String((i * 2) % 60).padStart(2, '0')}`
    if (scenario === 'normal') {
      trust = Math.min(99, Math.max(90, trust + (Math.random() * 3 - 1.5)))
    } else if (scenario === 'scam') {
      if (i < 5) trust = Math.min(98, Math.max(90, trust + (Math.random() * 2 - 1)))
      else trust = Math.max(25, trust - (Math.random() * 6 + 1.5))
    } else {
      if (i < 4) trust = Math.min(98, Math.max(92, trust + (Math.random() * 2 - 1)))
      else trust = Math.max(15, trust - (Math.random() * 12 + 4))
    }
    data.push({
      time,
      trust: +trust.toFixed(1),
      event: i === 5 && scenario === 'scam' ? 'PANIC DETECTED' : i === 4 && scenario === 'malware' ? 'MALWARE INJECTED' : null,
    })
  }
  return data
}

const TrustTimeline: React.FC = () => {
  const [scenario, setScenario] = useState<Scenario>('normal')
  const [data, setData] = useState(generateData('normal', 25))

  useEffect(() => {
    setData(generateData(scenario, 25))
  }, [scenario])

  const minTrust = Math.min(...data.map(d => d.trust))
  const maxTrust = Math.max(...data.map(d => d.trust))
  const finalTrust = data[data.length - 1]?.trust || 0

  const getColor = (t: number) => t > 85 ? '#10b981' : t > 60 ? '#f59e0b' : '#ef4444'

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, fontFamily: 'Space Grotesk', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <TrendingDown size={20} color="#f59e0b" /> Trust Timeline
          </h1>
          <p style={{ color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', fontSize: 12, marginTop: 4 }}>
            Trust Score T(t) evolution over session lifetime
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['normal', 'scam', 'malware'] as Scenario[]).map(s => (
            <button key={s} onClick={() => setScenario(s)} style={{
              padding: '8px 14px', borderRadius: 8, fontSize: 11, fontWeight: 600,
              fontFamily: 'JetBrains Mono', cursor: 'pointer',
              background: scenario === s ? 'rgba(16,185,129,0.1)' : 'var(--bg-card)',
              border: `1px solid ${scenario === s ? '#10b981' : 'var(--border-light)'}`,
              color: scenario === s ? '#10b981' : 'var(--text-sub)',
            }}>
              {s === 'normal' ? 'Normal' : s === 'scam' ? 'Scam Victim' : 'Malware'}
            </button>
          ))}
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Current', value: `${finalTrust.toFixed(0)}%`, color: getColor(finalTrust) },
          { label: 'Peak', value: `${maxTrust.toFixed(0)}%`, color: '#10b981' },
          { label: 'Minimum', value: `${minTrust.toFixed(0)}%`, color: getColor(minTrust) },
          { label: 'Observations', value: String(data.length), color: '#3b82f6' },
        ].map((s, i) => (
          <div key={i} style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-light)', borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', marginBottom: 4, letterSpacing: '0.08em' }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'Space Grotesk', color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-light)', borderRadius: 16, padding: 24 }}>
        <ResponsiveContainer width="100%" height={340}>
          <AreaChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="trustGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={getColor(finalTrust)} stopOpacity={0.3} />
                <stop offset="100%" stopColor={getColor(finalTrust)} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#64748b', fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#64748b', fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: '#1a2035', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontFamily: 'JetBrains Mono', fontSize: 11 }}
              labelStyle={{ color: '#94a3b8' }}
            />
            <ReferenceLine y={85} stroke="#10b981" strokeDasharray="4 4" strokeOpacity={0.5} label={{ value: 'ALLOW', position: 'right', fontSize: 9, fill: '#10b981' }} />
            <ReferenceLine y={60} stroke="#ef4444" strokeDasharray="4 4" strokeOpacity={0.5} label={{ value: 'BLOCK', position: 'right', fontSize: 9, fill: '#ef4444' }} />
            <Area type="monotone" dataKey="trust" stroke={getColor(finalTrust)} strokeWidth={2.5} fill="url(#trustGrad)" dot={false} activeDot={{ r: 4, stroke: getColor(finalTrust), strokeWidth: 2 }} />
          </AreaChart>
        </ResponsiveContainer>

        {/* Event markers */}
        {data.filter(d => d.event).length > 0 && (
          <div style={{ marginTop: 16, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {data.filter(d => d.event).map((d, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
                background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6,
              }}>
                <Clock size={12} color="#ef4444" />
                <span style={{ fontSize: 10, color: '#ef4444', fontFamily: 'JetBrains Mono', fontWeight: 600 }}>
                  {d.time} — {d.event}
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
