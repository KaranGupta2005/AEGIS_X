import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import Highcharts from 'highcharts'
import HighchartsMore from 'highcharts/highcharts-more'
import SolidGauge from 'highcharts/modules/solid-gauge'
import HighchartsReact from 'highcharts-react-official'
import { RotateCcw, Play, Pause, Circle, AlertTriangle, Shield, Brain, TrendingDown, Ban, Wifi, Activity, Fingerprint, Target, Zap } from 'lucide-react'
import { useStore } from '../../services/store'

HighchartsMore(Highcharts)
SolidGauge(Highcharts)

const STATE_COLORS: Record<string, string> = {
  calm: '#10B981', focused: '#3B82F6', distressed: '#F59E0B',
  panicked: '#F97316', coerced: '#EF4444', robotic: '#8B5CF6',
}

const SessionReplay: React.FC = () => {
  const { state } = useStore()
  const { timeline, alerts, isConnected, cognitiveHistory, trustScore, similarity, cognitiveState, cognitiveStability = 1, decision, driftDetected, anomalyScore = 0, fraudProbability = 0, velocity, entropy } = state

  const [isReplaying, setIsReplaying] = useState(false)
  const [replayIdx, setReplayIdx] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const startReplay = () => {
    setIsReplaying(true)
    setReplayIdx(0)
    intervalRef.current = setInterval(() => {
      setReplayIdx(prev => {
        if (prev >= timeline.length - 1) {
          clearInterval(intervalRef.current!)
          setIsReplaying(false)
          return prev
        }
        return prev + 1
      })
    }, 400)
  }

  const stopReplay = () => {
    setIsReplaying(false)
    if (intervalRef.current) clearInterval(intervalRef.current)
  }

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current) }, [])

  const currentEvent = timeline[replayIdx] || timeline[timeline.length - 1]
  const currentState = currentEvent?.cognitive_state || cognitiveState
  const currentTrust = currentEvent?.trust || trustScore
  const currentColor = STATE_COLORS[currentState] || '#94A3B8'

  const multiAreaOptions: Highcharts.Options = {
    chart: { type: 'areaspline', backgroundColor: 'transparent', height: 180, margin: [10, 10, 30, 40] },
    title: undefined,
    xAxis: { visible: false },
    yAxis: { title: { text: '' }, min: 0, max: 100, gridLineColor: 'rgba(255,255,255,0.03)', labels: { style: { color: '#475569', fontSize: '8px' } }, plotLines: [{ value: 60, color: 'rgba(239,68,68,0.2)', width: 1, dashStyle: 'ShortDash' as any }] },
    legend: { enabled: true, itemStyle: { color: '#94A3B8', fontSize: '9px' }, floating: true, verticalAlign: 'bottom' as any },
    credits: { enabled: false },
    tooltip: { shared: true, backgroundColor: '#1E293B', borderColor: '#334155', style: { color: '#E2E8F0', fontSize: '9px' } },
    plotOptions: { areaspline: { fillOpacity: 0.08, marker: { enabled: false }, lineWidth: 2, animation: { duration: 800 } } },
    series: [
      { type: 'areaspline' as any, name: 'Trust Score', data: timeline.slice(0, replayIdx + 1).map(t => t.trust), color: '#10B981' },
      { type: 'areaspline' as any, name: 'Risk Level', data: timeline.slice(0, replayIdx + 1).map(t => 100 - t.trust), color: '#8B5CF6' },
      { type: 'areaspline' as any, name: 'Anomaly', data: timeline.slice(0, replayIdx + 1).map((_, i) => Math.min(100, Math.max(0, 20 + Math.sin(i * 0.5) * 15 + (100 - timeline[i].trust) * 0.3))), color: '#EF4444' },
    ],
  }

  const kpiGaugeOptions: Highcharts.Options = {
    chart: { type: 'solidgauge', backgroundColor: 'transparent', height: 180, margin: [0, 0, 0, 0] },
    title: undefined,
    tooltip: { enabled: false },
    pane: { startAngle: 0, endAngle: 360, background: [
      { outerRadius: '100%', innerRadius: '80%', backgroundColor: 'rgba(16,185,129,0.1)', borderWidth: 0 } as any,
      { outerRadius: '78%', innerRadius: '60%', backgroundColor: 'rgba(59,130,246,0.1)', borderWidth: 0 } as any,
      { outerRadius: '58%', innerRadius: '40%', backgroundColor: 'rgba(139,92,246,0.1)', borderWidth: 0 } as any,
    ]},
    yAxis: { min: 0, max: 100, lineWidth: 0, tickPositions: [] as any },
    plotOptions: { solidgauge: { dataLabels: { enabled: false }, linecap: 'round', rounded: true } },
    series: [
      { type: 'solidgauge' as any, name: 'Trust', data: [{ color: '#10B981', radius: '100%', innerRadius: '80%', y: Math.round(currentTrust) }] },
      { type: 'solidgauge' as any, name: 'Similarity', data: [{ color: '#3B82F6', radius: '78%', innerRadius: '60%', y: Math.round(similarity * 100) }] },
      { type: 'solidgauge' as any, name: 'Stability', data: [{ color: '#8B5CF6', radius: '58%', innerRadius: '40%', y: Math.round(cognitiveStability * 100) }] },
    ],
    credits: { enabled: false },
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, fontFamily: 'Space Grotesk', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <RotateCcw size={18} color="#EF4444" /> Session Replay
          </h1>
          <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: '3px 0 0', fontFamily: 'JetBrains Mono' }}>
            <Wifi size={10} color={isConnected ? '#10B981' : '#EF4444'} /> {timeline.length} events captured · Attack timeline visualization
          </p>
        </div>
        <button onClick={isReplaying ? stopReplay : startReplay} disabled={timeline.length === 0}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: 'none', background: isReplaying ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)', color: isReplaying ? '#EF4444' : '#10B981', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'JetBrains Mono' }}>
          {isReplaying ? <><Pause size={12} /> Stop</> : <><Play size={12} /> Replay Chain</>}
        </button>
      </div>

      {/* Main: Timeline + KPI + Pulse */}
      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 14, marginBottom: 14 }}>
        {/* Event Timeline (vertical) */}
        <div style={{ background: 'var(--bg-card)', borderRadius: 14, border: '1px solid var(--border-light)', padding: '14px 16px', maxHeight: 420, overflowY: 'auto' }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', fontFamily: 'JetBrains Mono', display: 'block', marginBottom: 12 }}>Event Chain</span>
          {timeline.length > 0 ? timeline.slice(0, Math.min(replayIdx + 1, timeline.length)).map((t, i) => {
            const color = STATE_COLORS[t.cognitive_state] || '#94A3B8'
            const isActive = i === replayIdx
            return (
              <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                style={{ display: 'flex', gap: 10, position: 'relative', paddingBottom: 16, paddingLeft: 16 }}>
                {i < timeline.length - 1 && <div style={{ position: 'absolute', left: 19, top: 14, bottom: 0, width: 2, background: `linear-gradient(to bottom, ${color}, ${STATE_COLORS[timeline[Math.min(i + 1, timeline.length - 1)]?.cognitive_state] || '#94A3B8'})` }} />}
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0, marginTop: 3, boxShadow: isActive ? `0 0 8px ${color}` : 'none', border: isActive ? '2px solid white' : 'none' }} />
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: isActive ? 'var(--text-main)' : 'var(--text-sub)', fontFamily: 'Space Grotesk' }}>
                    {t.decision === 'BLOCK' ? 'SESSION BLOCKED' : t.drift_detected ? 'DRIFT DETECTED' : t.cognitive_state.toUpperCase()}
                  </div>
                  <div style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>
                    {t.time} · Trust: {t.trust.toFixed(0)}%
                  </div>
                </div>
              </motion.div>
            )
          }) : (
            <div style={{ textAlign: 'center', padding: 30 }}>
              <Activity size={20} color="var(--text-muted)" style={{ margin: '0 auto 8px', opacity: 0.3 }} />
              <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: 0 }}>No events yet. Start a scenario.</p>
            </div>
          )}
        </div>

        {/* Right: Charts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Multi-area Fraud Pulse */}
          <div style={{ background: 'var(--bg-card)', borderRadius: 14, border: '1px solid var(--border-light)', padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 3, height: 14, borderRadius: 2, background: '#8B5CF6' }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-main)', fontFamily: 'Space Grotesk', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Session Fraud Pulse</span>
              </div>
              {isReplaying && <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 4, background: 'rgba(239,68,68,0.1)', color: '#EF4444', fontFamily: 'JetBrains Mono', fontWeight: 700 }}>REPLAYING</span>}
            </div>
            <HighchartsReact highcharts={Highcharts} options={multiAreaOptions} />
          </div>

          {/* KPI Rings + Current State */}
          <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 14 }}>
            <div style={{ background: 'var(--bg-card)', borderRadius: 14, border: '1px solid var(--border-light)', padding: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <HighchartsReact highcharts={Highcharts} options={kpiGaugeOptions} />
              <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                {[{ label: 'Trust', color: '#10B981' }, { label: 'Sim', color: '#3B82F6' }, { label: 'Cog', color: '#8B5CF6' }].map(k => (
                  <div key={k.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <div style={{ width: 6, height: 6, borderRadius: 2, background: k.color }} />
                    <span style={{ fontSize: 8, color: 'var(--text-muted)' }}>{k.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Current State Panel */}
            <div style={{ background: 'var(--bg-card)', borderRadius: 14, border: '1px solid var(--border-light)', padding: '14px 16px' }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', fontFamily: 'JetBrains Mono', display: 'block', marginBottom: 10 }}>Current State</span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  { label: 'Decision', value: decision, color: decision === 'ALLOW' ? '#10B981' : decision === 'STEP_UP' ? '#F59E0B' : '#EF4444' },
                  { label: 'Cognitive', value: currentState.toUpperCase(), color: currentColor },
                  { label: 'Trust', value: `${currentTrust.toFixed(0)}%`, color: currentTrust > 85 ? '#10B981' : '#F59E0B' },
                  { label: 'Velocity', value: velocity.toFixed(4), color: velocity < -0.01 ? '#EF4444' : '#10B981' },
                  { label: 'Anomaly', value: `${(anomalyScore * 100).toFixed(0)}%`, color: anomalyScore > 0.3 ? '#EF4444' : '#10B981' },
                  { label: 'Fraud', value: `${(fraudProbability * 100).toFixed(0)}%`, color: fraudProbability > 0.5 ? '#EF4444' : '#10B981' },
                ].map(m => (
                  <div key={m.label} style={{ padding: '6px 10px', borderRadius: 8, background: `${m.color}06`, border: `1px solid ${m.color}12` }}>
                    <div style={{ fontSize: 8, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', textTransform: 'uppercase' }}>{m.label}</div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: m.color, fontFamily: 'Space Grotesk' }}>{m.value}</div>
                  </div>
                ))}
              </div>
              {/* Progress bar for replay */}
              {timeline.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 8, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>REPLAY PROGRESS</span>
                    <span style={{ fontSize: 8, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>{replayIdx + 1}/{timeline.length}</span>
                  </div>
                  <div style={{ height: 4, background: 'rgba(255,255,255,0.04)', borderRadius: 99, overflow: 'hidden' }}>
                    <motion.div animate={{ width: `${((replayIdx + 1) / timeline.length) * 100}%` }} style={{ height: '100%', background: 'linear-gradient(to right, #10B981, #3B82F6, #8B5CF6)', borderRadius: 99 }} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Alert Feed */}
      {alerts.length > 0 && (
        <div style={{ background: 'var(--bg-card)', borderRadius: 14, border: '1px solid var(--border-light)', padding: '14px 16px' }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', fontFamily: 'JetBrains Mono', display: 'block', marginBottom: 10 }}>Alert History ({alerts.length})</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {alerts.slice(-8).map((a, i) => {
              const aColor = a.severity === 'CRITICAL' ? '#EF4444' : a.severity === 'HIGH' ? '#F97316' : '#F59E0B'
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, background: `${aColor}04`, borderLeft: `3px solid ${aColor}` }}>
                  <AlertTriangle size={12} color={aColor} />
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-main)' }}>{a.message.slice(0, 60)}</span>
                  </div>
                  <span style={{ fontSize: 8, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>{new Date(a.timestamp).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                  <span style={{ fontSize: 8, fontWeight: 800, padding: '1px 5px', borderRadius: 3, background: `${aColor}12`, color: aColor }}>{a.severity}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default SessionReplay
