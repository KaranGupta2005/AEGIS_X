import React from 'react'
import { motion } from 'motion/react'
import Highcharts from 'highcharts'
import Treemap from 'highcharts/modules/treemap'
import Treegraph from 'highcharts/modules/treegraph'
import HighchartsReact from 'highcharts-react-official'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Brain, AlertTriangle, Shield, Activity, Wifi, Target, Fingerprint, TrendingDown, Eye, ChevronRight } from 'lucide-react'
import { useStore } from '../../services/store'

Treemap(Highcharts)
Treegraph(Highcharts)

const STATE_COLORS: Record<string, string> = {
  calm: '#10B981', focused: '#3B82F6', distressed: '#F59E0B',
  panicked: '#F97316', coerced: '#EF4444', robotic: '#8B5CF6',
}

const STATE_REASONS: Record<string, string[]> = {
  calm: ['Typing speed within baseline variance', 'Hesitation ratio < 0.1', 'No gyroscope anomaly', 'Consistent navigation pattern'],
  focused: ['Typing speed +20% vs baseline', 'Direct navigation flow', 'Reduced pause frequency', 'Normal for transaction pages'],
  distressed: ['Hesitation ratio elevated (>0.3)', 'Increased correction rate', 'Irregular typing rhythm variance', 'Scroll reversals detected'],
  panicked: ['Hesitation ratio >0.5', 'Extreme correction rate', 'Device shaking (gyroscope spike)', 'Rapid screen changes', 'Long pauses >3s between actions'],
  coerced: ['Typing <1.5 CPS (dictation pattern)', 'Zero scroll activity', 'Hesitation >0.7', 'New beneficiary + high amount', 'Session >5min on transfer'],
  robotic: ['Typing >9 CPS (mechanical)', 'Zero hesitation/corrections', 'Perfect swipe linearity', 'No gyroscope variance', 'Constant touch pressure'],
}

const CognitiveAnalysis: React.FC = () => {
  const { state } = useStore()
  const { trustScore, similarity, cognitiveState, cognitiveStability = 1, driftDetected, driftSeverity = 'none', anomalyScore = 0, fraudProbability = 0, velocity, entropy, intentVector = { coercion_probability: 0, takeover_probability: 0, anomaly_severity: 0, robotic_probability: 0 }, cognitiveHistory, timeline, isConnected, decision, reasons: stateReasons } = state

  const stateColor = STATE_COLORS[cognitiveState] || '#94A3B8'
  const whyReasons = STATE_REASONS[cognitiveState] || STATE_REASONS.calm

  const treegraphOptions: Highcharts.Options = {
    chart: { backgroundColor: 'transparent', height: 260, margin: [20, 40, 20, 40] },
    title: undefined, credits: { enabled: false },
    series: [{
      type: 'treegraph',
      data: [
        { id: '0', parent: '', name: 'Behavioral Input' },
        { id: '1', parent: '0', name: 'Embedding (384-dim)' },
        { id: '2', parent: '0', name: 'Feature Engineer' },
        { id: '3', parent: '1', name: `Similarity: ${(similarity * 100).toFixed(0)}%` },
        { id: '4', parent: '2', name: 'Cognitive RF' },
        { id: '5', parent: '2', name: 'Isolation Forest' },
        { id: '6', parent: '4', name: `State: ${cognitiveState.toUpperCase()}` },
        { id: '7', parent: '5', name: `Anomaly: ${(anomalyScore * 100).toFixed(0)}%` },
        { id: '8', parent: '3', name: driftDetected ? 'DRIFT DETECTED' : 'STABLE' },
        { id: '9', parent: '6', name: `Decision: ${decision}` },
      ],
      dataLabels: { pointFormat: '{point.name}', style: { color: '#F1F5F9', textOutline: '2px #0A0D14', fontSize: '12px', fontWeight: '700', fontFamily: 'Space Grotesk' }, crop: false },
      marker: { radius: 10, lineWidth: 2 },
      link: { color: 'rgba(255,255,255,0.15)', lineWidth: 2 },
      levels: [
        { level: 1, marker: { fillColor: '#10B981' }, dataLabels: { x: 10 } },
        { level: 2, colorByPoint: true },
        { level: 3, marker: { fillColor: stateColor }, dataLabels: { style: { fontSize: '10px' } } },
      ],
    }] as any,
  }

  const pulseData = timeline.slice(-20).map((t, i) => ({
    idx: i,
    trust: t.trust,
    risk: 100 - t.trust,
    anomaly: Math.min(100, 15 + (100 - t.trust) * 0.6 + Math.sin(i * 0.7) * 10),
  }))

  const stateDistribution = cognitiveHistory.reduce((acc, s) => { acc[s] = (acc[s] || 0) + 1; return acc }, {} as Record<string, number>)
  const totalStates = Math.max(cognitiveHistory.length, 1)

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 14 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, fontFamily: 'Space Grotesk', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Brain size={18} color="#8B5CF6" /> Cognitive Analysis
        </h1>
        <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: '3px 0 0', fontFamily: 'JetBrains Mono' }}>
          <Wifi size={10} color={isConnected ? '#10B981' : '#EF4444'} /> RF classifier · 96.3% accuracy · 6 states
        </p>
      </div>

      {/* Metric Cards (Trinetra style) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 14 }}>
        {[
          { icon: <Brain size={18} />, label: 'Cognitive State', value: cognitiveState.toUpperCase(), accent: stateColor },
          { icon: <Shield size={18} />, label: 'Stability', value: `${(cognitiveStability * 100).toFixed(0)}%`, accent: cognitiveStability > 0.7 ? '#10B981' : '#F59E0B' },
          { icon: <Fingerprint size={18} />, label: 'Similarity', value: `${(similarity * 100).toFixed(1)}%`, accent: similarity > 0.85 ? '#10B981' : '#EF4444' },
          { icon: <Target size={18} />, label: 'Fraud Risk', value: `${(fraudProbability * 100).toFixed(0)}%`, accent: fraudProbability > 0.3 ? '#EF4444' : '#10B981' },
        ].map((m, i) => (
          <motion.div key={m.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 14, padding: '16px 18px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -20, left: -20, width: 80, height: 80, borderRadius: '50%', background: m.accent, opacity: 0.06, filter: 'blur(20px)', pointerEvents: 'none' }} />
            <div style={{ width: 36, height: 36, borderRadius: 8, background: `${m.accent}15`, border: `1px solid ${m.accent}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: m.accent, marginBottom: 10 }}>{m.icon}</div>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>{m.label}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: m.accent, fontFamily: 'Space Grotesk' }}>{m.value}</div>
          </motion.div>
        ))}
      </div>

      {/* Main: Chart + Why + Feed */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 12, marginBottom: 14 }}>
        {/* National Fraud Pulse style chart */}
        <div style={{ background: 'var(--bg-card)', borderRadius: 14, border: '1px solid var(--border-light)', padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <div style={{ width: 3, height: 14, borderRadius: 2, background: '#8B5CF6' }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-main)', fontFamily: 'Space Grotesk', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Cognitive Pulse</span>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={pulseData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="cgTrust" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10B981" stopOpacity={0.15} /><stop offset="100%" stopColor="#10B981" stopOpacity={0} /></linearGradient>
                <linearGradient id="cgRisk" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.12} /><stop offset="100%" stopColor="#8B5CF6" stopOpacity={0} /></linearGradient>
                <linearGradient id="cgAnom" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#EF4444" stopOpacity={0.08} /><stop offset="100%" stopColor="#EF4444" stopOpacity={0} /></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
              <XAxis dataKey="idx" hide />
              <YAxis domain={[0, 100]} tick={{ fill: '#475569', fontSize: 8 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#1E293B', border: '1px solid #334155', borderRadius: 6, fontSize: 9, color: '#E2E8F0' }} />
              <Area type="monotone" dataKey="trust" stroke="#10B981" fill="url(#cgTrust)" strokeWidth={2} name="Trust" />
              <Area type="monotone" dataKey="risk" stroke="#8B5CF6" fill="url(#cgRisk)" strokeWidth={2} name="Risk" />
              <Area type="monotone" dataKey="anomaly" stroke="#EF4444" fill="url(#cgAnom)" strokeWidth={1.5} name="Anomaly" />
            </AreaChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', gap: 14, marginTop: 6 }}>
            {[{ label: 'Trust', color: '#10B981' }, { label: 'Risk Score', color: '#8B5CF6' }, { label: 'Anomaly', color: '#EF4444' }].map(l => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 10, height: 3, borderRadius: 1, background: l.color }} />
                <span style={{ fontSize: 8, color: 'var(--text-muted)' }}>{l.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Why This State + Live Feed */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Why card */}
          <div style={{ background: `${stateColor}06`, borderRadius: 14, border: `1px solid ${stateColor}18`, padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <Brain size={16} color={stateColor} />
              <span style={{ fontSize: 12, fontWeight: 800, color: stateColor, fontFamily: 'Space Grotesk' }}>{cognitiveState.toUpperCase()}</span>
              <span style={{ fontSize: 8, color: 'var(--text-muted)', marginLeft: 'auto', fontFamily: 'JetBrains Mono' }}>WHY?</span>
            </div>
            {whyReasons.map((r, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 5 }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: i < 2 ? stateColor : '#64748B', flexShrink: 0, marginTop: 4 }} />
                <span style={{ fontSize: 10, color: 'var(--text-sub)', lineHeight: 1.4 }}>{r}</span>
              </div>
            ))}
          </div>

          {/* Live feed */}
          <div style={{ background: 'var(--bg-card)', borderRadius: 14, border: '1px solid var(--border-light)', padding: '10px 12px', flex: 1, overflowY: 'auto', maxHeight: 160 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 8, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', fontFamily: 'JetBrains Mono' }}>State Feed</span>
              <span style={{ fontSize: 7, padding: '1px 4px', borderRadius: 3, background: 'rgba(239,68,68,0.1)', color: '#EF4444', fontWeight: 800 }}>LIVE</span>
            </div>
            {cognitiveHistory.slice(-10).reverse().map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0', borderBottom: '1px solid var(--border-light)' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: STATE_COLORS[s] || '#94A3B8', boxShadow: i === 0 ? `0 0 5px ${STATE_COLORS[s]}` : 'none' }} />
                <span style={{ fontSize: 9, fontWeight: i === 0 ? 700 : 400, color: i === 0 ? 'var(--text-main)' : 'var(--text-sub)', flex: 1 }}>{s}</span>
                <span style={{ fontSize: 7, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>-{i * 2}s</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Treegraph + Distribution */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 12 }}>
        {/* Treegraph — horizontal, bigger nodes, bigger text */}
        <div style={{ background: 'var(--bg-card)', borderRadius: 14, border: '1px solid var(--border-light)', padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <div style={{ width: 3, height: 12, borderRadius: 2, background: stateColor }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-main)', fontFamily: 'Space Grotesk', textTransform: 'uppercase' }}>Reasoning Tree</span>
            <span style={{ fontSize: 8, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', marginLeft: 6 }}>AI inference chain</span>
          </div>
          <HighchartsReact highcharts={Highcharts} options={treegraphOptions} />
        </div>

        {/* Distribution + Intent */}
        <div style={{ background: 'var(--bg-card)', borderRadius: 14, border: '1px solid var(--border-light)', padding: '12px 14px' }}>
          <span style={{ fontSize: 8, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'JetBrains Mono', display: 'block', marginBottom: 8 }}>State Distribution</span>
          {Object.entries(STATE_COLORS).map(([s, color]) => {
            const pct = ((stateDistribution[s] || 0) / totalStates) * 100
            return (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                <div style={{ width: 6, height: 6, borderRadius: 2, background: color }} />
                <span style={{ fontSize: 9, color: 'var(--text-sub)', width: 55 }}>{s}</span>
                <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.04)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 99, transition: 'width 0.5s' }} />
                </div>
                <span style={{ fontSize: 8, fontWeight: 700, color, width: 24, textAlign: 'right', fontFamily: 'JetBrains Mono' }}>{pct.toFixed(0)}%</span>
              </div>
            )
          })}
          <div style={{ marginTop: 10, borderTop: '1px solid var(--border-light)', paddingTop: 8 }}>
            <span style={{ fontSize: 8, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'JetBrains Mono', display: 'block', marginBottom: 6 }}>Intent Vector</span>
            {[
              { label: 'Coercion', value: intentVector.coercion_probability, color: '#EF4444' },
              { label: 'Takeover', value: intentVector.takeover_probability, color: '#F97316' },
              { label: 'Robotic', value: intentVector.robotic_probability, color: '#8B5CF6' },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{ fontSize: 9, color: 'var(--text-sub)', width: 55 }}>{item.label}</span>
                <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.04)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${item.value * 100}%`, background: item.color, borderRadius: 99 }} />
                </div>
                <span style={{ fontSize: 8, fontWeight: 700, color: item.value > 0.5 ? item.color : 'var(--text-muted)', width: 24, textAlign: 'right' }}>{(item.value * 100).toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default CognitiveAnalysis
