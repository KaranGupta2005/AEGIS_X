import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import Highcharts from 'highcharts'
import HighchartsMore from 'highcharts/highcharts-more'
import SolidGauge from 'highcharts/modules/solid-gauge'
import HighchartsReact from 'highcharts-react-official'
import { RotateCcw, Play, Pause, AlertTriangle, Shield, Brain, Wifi, Activity, Fingerprint, Target, User, CreditCard, Smartphone, MapPin } from 'lucide-react'
import { useStore } from '../../services/store'

HighchartsMore(Highcharts)
SolidGauge(Highcharts)

const STATE_COLORS: Record<string, string> = {
  calm: '#10B981', focused: '#3B82F6', distressed: '#F59E0B',
  panicked: '#F97316', coerced: '#EF4444', robotic: '#8B5CF6',
}

const SessionReplay: React.FC = () => {
  const { state } = useStore()
  const { timeline, alerts, isConnected, trustScore, similarity, cognitiveState, cognitiveStability = 1, decision, driftDetected, anomalyScore = 0, fraudProbability = 0, velocity, entropy, intentVector = { coercion_probability: 0, takeover_probability: 0, anomaly_severity: 0, robotic_probability: 0 } } = state

  const [isReplaying, setIsReplaying] = useState(false)
  const [replayIdx, setReplayIdx] = useState(timeline.length - 1)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const startReplay = () => {
    setIsReplaying(true)
    setReplayIdx(0)
    intervalRef.current = setInterval(() => {
      setReplayIdx(prev => {
        if (prev >= timeline.length - 1) { clearInterval(intervalRef.current!); setIsReplaying(false); return prev }
        return prev + 1
      })
    }, 350)
  }
  const stopReplay = () => { setIsReplaying(false); if (intervalRef.current) clearInterval(intervalRef.current) }
  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current) }, [])

  const currentTrust = timeline[replayIdx]?.trust || trustScore
  const currentState = timeline[replayIdx]?.cognitive_state || cognitiveState
  const trustColor = currentTrust > 85 ? '#10B981' : currentTrust > 60 ? '#F59E0B' : '#EF4444'

  const comboChartOptions: Highcharts.Options = {
    chart: { backgroundColor: 'transparent', height: 180, margin: [10, 10, 30, 40] },
    title: undefined,
    xAxis: { visible: false },
    yAxis: { title: { text: '' }, min: 0, max: 100, gridLineColor: 'rgba(255,255,255,0.03)', labels: { style: { color: '#475569', fontSize: '8px' } } },
    legend: { enabled: true, itemStyle: { color: '#94A3B8', fontSize: '9px' } },
    credits: { enabled: false },
    tooltip: { shared: true, backgroundColor: '#1E293B', borderColor: '#334155', style: { color: '#E2E8F0', fontSize: '9px' } },
    plotOptions: { column: { borderWidth: 0, borderRadius: 3 }, spline: { marker: { enabled: false }, lineWidth: 2.5 } },
    series: [
      { type: 'column' as any, name: 'Trust', data: timeline.slice(0, replayIdx + 1).map(t => t.trust), color: 'rgba(16,185,129,0.4)' },
      { type: 'column' as any, name: 'Risk', data: timeline.slice(0, replayIdx + 1).map(t => 100 - t.trust), color: 'rgba(139,92,246,0.3)' },
      { type: 'spline' as any, name: 'Anomaly', data: timeline.slice(0, replayIdx + 1).map((t, i) => Math.min(100, 15 + (100 - t.trust) * 0.6 + Math.sin(i * 0.7) * 10)), color: '#F59E0B' },
    ],
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, fontFamily: 'Space Grotesk', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <RotateCcw size={18} color="#EF4444" /> Session Replay
          </h1>
          <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: '3px 0 0', fontFamily: 'JetBrains Mono' }}>
            <Wifi size={10} color={isConnected ? '#10B981' : '#EF4444'} /> {timeline.length} events · {alerts.length} alerts · Attack chain visualization
          </p>
        </div>
        <button onClick={isReplaying ? stopReplay : startReplay} disabled={timeline.length === 0}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 8, border: 'none', background: isReplaying ? 'rgba(239,68,68,0.12)' : 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(59,130,246,0.15))', color: isReplaying ? '#EF4444' : '#10B981', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'JetBrains Mono', boxShadow: isReplaying ? 'none' : '0 0 20px rgba(16,185,129,0.1)' }}>
          {isReplaying ? <><Pause size={12} /> Stop Replay</> : <><Play size={12} /> Replay Chain</>}
        </button>
      </div>

      {/* Main Grid: Graph + Timeline + Gauge */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px 180px', gap: 12, marginBottom: 14 }}>
        {/* SVG Fraud/Session Graph (Trinetra style) */}
        <div style={{ background: 'var(--bg-card)', borderRadius: 14, border: '1px solid var(--border-light)', padding: '12px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 12, left: 16, zIndex: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-main)', fontFamily: 'Space Grotesk' }}>Session Entity Graph</span>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>8 entities · {driftDetected ? '8' : '7'} connections</div>
          </div>
          <svg width="100%" height="280" viewBox="0 0 600 280">
            {/* Suspected ring ellipse */}
            {fraudProbability > 0.3 && (
              <>
                <ellipse cx={300} cy={140} rx={130} ry={90} fill="none" stroke="rgba(239,68,68,0.15)" strokeWidth={1} strokeDasharray="5 4" />
                <text x={300} y={42} textAnchor="middle" style={{ fontFamily: 'JetBrains Mono', fontSize: 7, fill: 'rgba(239,68,68,0.5)', letterSpacing: '0.1em' }}>SUSPECTED ANOMALY RING</text>
                {isReplaying && <motion.ellipse cx={300} cy={140} rx={130} ry={90} fill="none" stroke="#EF4444" strokeWidth={1.5} strokeDasharray="6 3" initial={{ opacity: 0 }} animate={{ opacity: [0, 0.8, 0.3, 0.8, 0] }} transition={{ duration: 2.5 }} />}
              </>
            )}
            {/* Edges */}
            {[
              { from: [300, 120], to: [140, 70], sus: false },
              { from: [300, 120], to: [460, 70], sus: false },
              { from: [300, 120], to: [150, 200], sus: driftDetected },
              { from: [300, 120], to: [450, 200], sus: fraudProbability > 0.3 },
              { from: [300, 120], to: [300, 240], sus: false },
              { from: [150, 200], to: [300, 240], sus: false },
              { from: [450, 200], to: [540, 140], sus: fraudProbability > 0.3 },
            ].map((e, i) => (
              <line key={i} x1={e.from[0]} y1={e.from[1]} x2={e.to[0]} y2={e.to[1]}
                stroke={isReplaying && e.sus ? '#EF4444' : e.sus ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.07)'}
                strokeWidth={isReplaying && e.sus ? 2 : e.sus ? 1.5 : 0.8}
                strokeDasharray={e.sus ? '5 3' : undefined} />
            ))}
            {/* Nodes */}
            {[
              { cx: 300, cy: 120, r: 20, color: '#10B981', label: 'User Session', main: true },
              { cx: 140, cy: 70, r: 14, color: '#3B82F6', label: 'Device' },
              { cx: 460, cy: 70, r: 14, color: '#8B5CF6', label: 'IP: 10.0.x' },
              { cx: 150, cy: 200, r: 14, color: '#F59E0B', label: 'Bank Acct' },
              { cx: 450, cy: 200, r: 14, color: fraudProbability > 0.3 ? '#EF4444' : '#10B981', label: 'Beneficiary' },
              { cx: 300, cy: 240, r: 16, color: '#10B981', label: 'AEGIS-X' },
              { cx: 540, cy: 140, r: 14, color: STATE_COLORS[cognitiveState] || '#94A3B8', label: cognitiveState.slice(0, 7) },
            ].map((n, i) => (
              <g key={i}>
                {isReplaying && n.main && <circle cx={n.cx} cy={n.cy} r={n.r + 12} fill="#EF4444" opacity={0.08} />}
                <circle cx={n.cx} cy={n.cy} r={n.r + 3} fill="none" stroke={n.color} strokeWidth={0.8} opacity={0.3} />
                <circle cx={n.cx} cy={n.cy} r={n.r} fill={`${n.color}1A`} stroke={n.color} strokeWidth={1.5} />
                {fraudProbability > 0.5 && n.label === 'Beneficiary' && <circle cx={n.cx + n.r - 2} cy={n.cy - n.r + 2} r={4} fill="#EF4444" />}
                <text x={n.cx} y={n.cy + n.r + 12} textAnchor="middle" style={{ fontFamily: 'JetBrains Mono', fontSize: 8, fill: '#6B7280' }}>{n.label}</text>
              </g>
            ))}
          </svg>
          {fraudProbability > 0.3 && (
            <div style={{ marginTop: 6, padding: '6px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.12)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <AlertTriangle size={11} color="#EF4444" />
              <span style={{ fontSize: 9, color: '#EF4444', fontWeight: 600, fontFamily: 'JetBrains Mono' }}>SUSPICIOUS LINK — Fraud probability {(fraudProbability * 100).toFixed(0)}%</span>
            </div>
          )}
        </div>

        {/* Vertical Event Timeline */}
        <div style={{ background: 'var(--bg-card)', borderRadius: 14, border: '1px solid var(--border-light)', padding: '12px 14px', overflowY: 'auto', maxHeight: 340 }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', fontFamily: 'JetBrains Mono', display: 'block', marginBottom: 12 }}>Event Chain</span>
          {timeline.length > 0 ? timeline.slice(0, replayIdx + 1).map((t, i) => {
            const color = STATE_COLORS[t.cognitive_state] || '#94A3B8'
            const isActive = i === replayIdx
            const isLast = i === timeline.slice(0, replayIdx + 1).length - 1
            return (
              <div key={i} style={{ display: 'flex', gap: 10, position: 'relative', paddingBottom: isLast ? 0 : 20, paddingLeft: 4 }}>
                {!isLast && (
                  <div style={{ position: 'absolute', left: 8, top: 14, bottom: 0, width: 2, background: `linear-gradient(to bottom, ${color}, ${STATE_COLORS[timeline[Math.min(i + 1, timeline.length - 1)]?.cognitive_state] || '#94A3B8'})` }} />
                )}
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: color, flexShrink: 0, marginTop: 2, boxShadow: isActive ? `0 0 10px ${color}` : `0 0 4px ${color}60`, border: isActive ? '2px solid white' : 'none', zIndex: 1 }} />
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: isActive ? 'var(--text-main)' : 'var(--text-sub)', fontFamily: 'Space Grotesk' }}>
                    {t.decision === 'BLOCK' ? 'SESSION BLOCKED' : t.drift_detected ? 'DRIFT DETECTED' : t.cognitive_state.charAt(0).toUpperCase() + t.cognitive_state.slice(1)}
                  </div>
                  <div style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>{t.time}</div>
                </div>
              </div>
            )
          }) : (
            <div style={{ textAlign: 'center', padding: 20 }}>
              <Activity size={16} color="var(--text-muted)" style={{ margin: '0 auto 6px', opacity: 0.3 }} />
              <p style={{ fontSize: 9, color: 'var(--text-muted)', margin: 0 }}>No events</p>
            </div>
          )}
        </div>

        {/* Current State — Sleek Gauge + Spline */}
        <div style={{ background: 'var(--bg-card)', borderRadius: 14, border: '1px solid var(--border-light)', padding: '12px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ fontSize: 7, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.15em', fontFamily: 'JetBrains Mono', marginBottom: 6 }}>Current State</span>
          {/* SVG Gauge — dynamic arc based on currentTrust */}
          <svg width={140} height={80} viewBox="0 0 140 80">
            {/* Background track */}
            <path d="M 15 70 A 55 55 0 0 1 125 70" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={10} strokeLinecap="round" />
            {/* Red zone 0-40% */}
            <path d="M 15 70 A 55 55 0 0 1 59 19" fill="none" stroke="rgba(239,68,68,0.2)" strokeWidth={10} strokeLinecap="round" />
            {/* Yellow zone 40-70% */}
            <path d="M 59 19 A 55 55 0 0 1 103 19" fill="none" stroke="rgba(245,158,11,0.2)" strokeWidth={10} strokeLinecap="round" />
            {/* Green zone 70-100% */}
            <path d="M 103 19 A 55 55 0 0 1 125 70" fill="none" stroke="rgba(16,185,129,0.2)" strokeWidth={10} strokeLinecap="round" />
            {/* Dynamic value arc */}
            {(() => {
              const pct = Math.max(0, Math.min(100, currentTrust)) / 100
              const angle = Math.PI * (1 - pct)
              const ex = 70 + 55 * Math.cos(angle)
              const ey = 70 - 55 * Math.sin(angle)
              const large = pct > 0.5 ? 1 : 0
              return <path d={`M 15 70 A 55 55 0 ${large} 1 ${ex.toFixed(1)} ${ey.toFixed(1)}`} fill="none" stroke={trustColor} strokeWidth={10} strokeLinecap="round" style={{ filter: `drop-shadow(0 0 6px ${trustColor}60)`, transition: 'all 0.3s' }} />
            })()}
            <text x={70} y={52} textAnchor="middle" fill={trustColor} fontSize={24} fontWeight={900} fontFamily="Space Grotesk">{Math.round(currentTrust)}</text>
            <text x={70} y={70} textAnchor="middle" fill="#64748B" fontSize={8} fontFamily="JetBrains Mono" letterSpacing="0.08em">TRUST</text>
          </svg>
          {/* State badges */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6, width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 8px', borderRadius: 6, background: `${STATE_COLORS[currentState] || '#94A3B8'}08` }}>
              <span style={{ fontSize: 8, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>Cognitive</span>
              <span style={{ fontSize: 9, fontWeight: 800, color: STATE_COLORS[currentState] || '#94A3B8', fontFamily: 'Space Grotesk' }}>{currentState.toUpperCase()}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 8px', borderRadius: 6, background: decision === 'ALLOW' ? 'rgba(16,185,129,0.05)' : 'rgba(239,68,68,0.05)' }}>
              <span style={{ fontSize: 8, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>Decision</span>
              <span style={{ fontSize: 9, fontWeight: 800, color: decision === 'ALLOW' ? '#10B981' : decision === 'STEP_UP' ? '#F59E0B' : '#EF4444', fontFamily: 'Space Grotesk' }}>{decision}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 8px', borderRadius: 6, background: 'rgba(139,92,246,0.04)' }}>
              <span style={{ fontSize: 8, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>Velocity</span>
              <span style={{ fontSize: 9, fontWeight: 800, color: velocity < -0.01 ? '#EF4444' : '#10B981', fontFamily: 'Space Grotesk' }}>{velocity.toFixed(4)}</span>
            </div>
          </div>
          {/* Mini multi-line spline — Trust, Similarity, Fraud */}
          <div style={{ width: '100%', marginTop: 6 }}>
            <HighchartsReact highcharts={Highcharts} options={{
              chart: { type: 'spline', backgroundColor: 'transparent', height: 60, margin: [2, 2, 2, 2] },
              title: undefined, xAxis: { visible: false }, yAxis: { visible: false, min: 0, max: 100 },
              legend: { enabled: false }, credits: { enabled: false }, tooltip: { enabled: false },
              plotOptions: { spline: { marker: { enabled: false }, lineWidth: 1.5 } },
              series: [
                { type: 'spline' as any, data: timeline.slice(0, replayIdx + 1).map(t => t.trust), color: '#10B981', name: 'Trust' },
                { type: 'spline' as any, data: timeline.slice(0, replayIdx + 1).map(t => t.similarity * 100), color: '#3B82F6', name: 'Similarity' },
                { type: 'spline' as any, data: timeline.slice(0, replayIdx + 1).map((_, i) => Math.min(100, 10 + (100 - (timeline[i]?.trust || 95)) * 0.8)), color: '#EF4444', name: 'Fraud', dashStyle: 'ShortDot' as any },
              ],
            } as any} />
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 3 }}>
              {[{ label: 'Trust', color: '#10B981' }, { label: 'Sim', color: '#3B82F6' }, { label: 'Fraud', color: '#EF4444' }].map(l => (
                <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  <div style={{ width: 8, height: 2, borderRadius: 1, background: l.color }} />
                  <span style={{ fontSize: 7, color: 'var(--text-muted)' }}>{l.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Behavioral Analysis — narrow, scrollable + Alerts section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 12, marginBottom: 14 }}>
        {/* Behavioral Chart — scrollable */}
        <div style={{ background: 'var(--bg-card)', borderRadius: 14, border: '1px solid var(--border-light)', padding: '12px 14px', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <div>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-main)', fontFamily: 'Space Grotesk', fontStyle: 'italic' }}>Behavioral Analysis</span>
              <span style={{ fontSize: 8, color: 'var(--text-muted)', display: 'block', marginTop: 1 }}>Trust vs Risk vs Anomaly</span>
            </div>
            {isReplaying && <span style={{ fontSize: 8, padding: '2px 8px', borderRadius: 4, background: 'rgba(239,68,68,0.1)', color: '#EF4444', fontFamily: 'JetBrains Mono', fontWeight: 700 }}>LIVE</span>}
          </div>
          <div style={{ overflowX: 'auto', minWidth: 0 }}>
            <div style={{ minWidth: Math.max(400, timeline.length * 16) }}>
              <HighchartsReact highcharts={Highcharts} options={comboChartOptions} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 8, overflowX: 'auto' }}>
            {[
              { text: `Sim: ${(similarity * 100).toFixed(0)}%`, active: similarity < 0.85 },
              { text: `State: ${cognitiveState}`, active: cognitiveState !== 'calm' && cognitiveState !== 'focused' },
              { text: `Fraud: ${(fraudProbability * 100).toFixed(0)}%`, active: fraudProbability > 0.3 },
            ].map((f, i) => (
              <div key={i} style={{ padding: '4px 8px', borderRadius: 6, background: f.active ? 'rgba(239,68,68,0.04)' : 'rgba(255,255,255,0.02)', border: `1px solid ${f.active ? 'rgba(239,68,68,0.15)' : 'var(--border-light)'}`, display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: f.active ? '#EF4444' : '#10B981' }} />
                <span style={{ fontSize: 8, color: f.active ? '#EF4444' : 'var(--text-sub)', whiteSpace: 'nowrap' }}>{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Alerts Section */}
        <div style={{ background: 'var(--bg-card)', borderRadius: 14, border: '1px solid var(--border-light)', padding: '12px 14px', overflowY: 'auto', maxHeight: 260 }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', fontFamily: 'JetBrains Mono', display: 'block', marginBottom: 10 }}>Alerts ({alerts.length})</span>
          {alerts.length > 0 ? alerts.slice(-10).map((a, i) => {
            const aColor = a.severity === 'CRITICAL' ? '#EF4444' : a.severity === 'HIGH' ? '#F97316' : '#F59E0B'
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 0', borderBottom: i < alerts.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
                <div style={{ width: 3, borderRadius: 99, background: aColor, alignSelf: 'stretch', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-main)', display: 'block' }}>{a.message.slice(0, 55)}{a.message.length > 55 ? '…' : ''}</span>
                  <div style={{ display: 'flex', gap: 6, marginTop: 3 }}>
                    <span style={{ fontSize: 8, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>{new Date(a.timestamp).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                    <span style={{ fontSize: 7, fontWeight: 800, padding: '0px 4px', borderRadius: 2, background: `${aColor}15`, color: aColor }}>{a.severity}</span>
                  </div>
                </div>
              </div>
            )
          }) : (
            <div style={{ textAlign: 'center', padding: 20 }}>
              <Shield size={16} color="var(--text-muted)" style={{ margin: '0 auto 6px', opacity: 0.3 }} />
              <p style={{ fontSize: 9, color: 'var(--text-muted)', margin: 0 }}>No alerts triggered</p>
            </div>
          )}
        </div>
      </div>

      {/* Replay Progress */}
      {timeline.length > 0 && (
        <div style={{ background: 'var(--bg-card)', borderRadius: 14, border: '1px solid var(--border-light)', padding: '12px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Replay Progress</span>
            <span style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>{replayIdx + 1} / {timeline.length} events</span>
          </div>
          <div style={{ height: 6, background: 'rgba(255,255,255,0.04)', borderRadius: 99, overflow: 'hidden' }}>
            <motion.div animate={{ width: `${((replayIdx + 1) / Math.max(timeline.length, 1)) * 100}%` }} transition={{ duration: 0.3 }} style={{ height: '100%', background: 'linear-gradient(to right, #10B981, #3B82F6, #8B5CF6, #EF4444)', borderRadius: 99 }} />
          </div>
        </div>
      )}
    </div>
  )
}

export default SessionReplay
