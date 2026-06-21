import React, { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  Shield, Activity, Brain, Fingerprint, AlertTriangle, Radio,
  Wifi, WifiOff, Target,
} from 'lucide-react'
import { useStore } from '../../services/store'
import { SimulatorScenario } from '../../services/api'
import Stepper, { Step } from '../components/Stepper'

const SCENARIOS: { key: SimulatorScenario; label: string; color: string }[] = [
  { key: 'normal', label: 'Normal User', color: '#10B981' },
  { key: 'scam', label: 'Scam Victim', color: '#F59E0B' },
  { key: 'malware', label: 'Malware Bot', color: '#EF4444' },
]

function getTrustColor(score: number) {
  if (score > 85) return '#10B981'
  if (score > 60) return '#F59E0B'
  if (score > 40) return '#F97316'
  return '#EF4444'
}

const TrustGauge: React.FC<{ value: number; color: string }> = ({ value, color }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<any>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const Highcharts = (await import('highcharts')).default
      const More = (await import('highcharts/highcharts-more.src.js' as any)).default
      if (typeof More === 'function') More(Highcharts)
      if (cancelled || !containerRef.current) return

      chartRef.current = Highcharts.chart(containerRef.current, {
        chart: { type: 'gauge', backgroundColor: 'transparent', height: 180, margin: [0, 0, 0, 0] },
        title: undefined,
        pane: { startAngle: -90, endAngle: 90, background: undefined },
        yAxis: {
          min: 0, max: 100, lineWidth: 0, tickWidth: 0, labels: { enabled: false },
          plotBands: [
            { from: 0, to: 40, color: 'rgba(239,68,68,0.15)', innerRadius: '85%', outerRadius: '100%' },
            { from: 40, to: 70, color: 'rgba(245,158,11,0.15)', innerRadius: '85%', outerRadius: '100%' },
            { from: 70, to: 100, color: 'rgba(16,185,129,0.15)', innerRadius: '85%', outerRadius: '100%' },
          ],
        },
        series: [{
          type: 'gauge',
          data: [Math.round(value)],
          dial: { radius: '75%', backgroundColor: color, baseWidth: 6, topWidth: 1, baseLength: '0%', rearLength: '0%' },
          pivot: { backgroundColor: color, radius: 5 },
          dataLabels: { enabled: true, format: `<div style="text-align:center"><span style="font-size:32px;font-weight:800;color:${color};font-family:Space Grotesk">{y}</span><br/><span style="font-size:9px;color:#64748B;font-family:JetBrains Mono">TRUST SCORE</span></div>`, borderWidth: 0, y: 20, useHTML: true },
        }],
        tooltip: { enabled: false },
        credits: { enabled: false },
      } as any)
    })()
    return () => { cancelled = true; chartRef.current?.destroy() }
  }, [])

  useEffect(() => {
    if (chartRef.current?.series?.[0]) {
      chartRef.current.series[0].points[0]?.update(Math.round(value), true)
    }
  }, [value])

  return <div ref={containerRef} style={{ width: '100%', height: 180 }} />
}

const StatCard: React.FC<{ label: string; value: string; sub: string; color: string; icon: React.ReactNode }> = ({ label, value, sub, color, icon }) => (
  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -2 }} transition={{ duration: 0.25 }}
    style={{ background: 'var(--bg-card)', borderRadius: 14, padding: '16px 18px', border: '1px solid var(--border-light)' }}>
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
      <div>
        <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--text-muted)', margin: '0 0 5px', fontFamily: 'JetBrains Mono' }}>{label}</p>
        <p style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-main)', margin: '0 0 2px', lineHeight: 1, fontFamily: 'Space Grotesk' }}>{value}</p>
        <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: 0 }}>{sub}</p>
      </div>
      <div style={{ width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${color}12`, border: `1px solid ${color}20` }}>
        {icon}
      </div>
    </div>
  </motion.div>
)

const TrustSpline: React.FC<{ data: any[]; trustColor: string }> = ({ data, trustColor }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<any>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const Highcharts = (await import('highcharts')).default
      if (cancelled || !containerRef.current) return

      const animateSVGPath = (svgElem: any, animation: any) => {
        const length = svgElem.element.getTotalLength()
        svgElem.attr({ 'stroke-dasharray': length, 'stroke-dashoffset': length, opacity: 1 })
        svgElem.animate({ 'stroke-dashoffset': 0 }, animation)
      }

      ;(Highcharts as any).seriesTypes.line.prototype.animate = function (init: boolean) {
        if (!init) animateSVGPath(this.graph, (Highcharts as any).animObject(this.options.animation))
      }

      chartRef.current = Highcharts.chart(containerRef.current, {
        chart: { type: 'spline', backgroundColor: 'transparent', height: 140, margin: [10, 10, 25, 35] },
        title: undefined,
        xAxis: { visible: false },
        yAxis: [
          { title: { text: 'Trust %', style: { color: trustColor, fontSize: '9px' } }, min: 0, max: 100, gridLineColor: 'rgba(255,255,255,0.04)', labels: { style: { color: '#64748B', fontSize: '9px' } } },
          { title: { text: 'Similarity', style: { color: '#3B82F6', fontSize: '9px' } }, min: 0, max: 100, opposite: true, gridLineWidth: 0, labels: { style: { color: '#64748B', fontSize: '9px' } } },
        ],
        legend: { enabled: false },
        credits: { enabled: false },
        tooltip: { shared: true, backgroundColor: '#1E293B', borderColor: '#334155', style: { color: '#E2E8F0', fontSize: '10px', fontFamily: 'JetBrains Mono' } },
        plotOptions: { series: { animation: { duration: 1000 }, marker: { enabled: false }, lineWidth: 2 } },
        series: [
          { type: 'spline', name: 'Trust', yAxis: 0, data: data.map(d => d.trust), color: trustColor, animation: { duration: 1000 } },
          { type: 'spline', name: 'Similarity', yAxis: 1, data: data.map(d => d.similarity * 100), color: '#3B82F6', dashStyle: 'ShortDash', lineWidth: 1.5, animation: { duration: 1000, defer: 500 } as any },
        ],
      } as any)
    })()
    return () => { cancelled = true; chartRef.current?.destroy() }
  }, [])

  useEffect(() => {
    if (chartRef.current && data.length > 0) {
      const trustData = data.map(d => d.trust)
      const simData = data.map(d => d.similarity * 100)
      chartRef.current.series[0]?.setData(trustData, false)
      chartRef.current.series[1]?.setData(simData, true)
    }
  }, [data])

  return <div ref={containerRef} style={{ width: '100%', height: 140 }} />
}

const LiveMonitor: React.FC = () => {
  const { state, connect, switchScenario } = useStore()
  const { trustScore, decision, cognitiveState, similarity, driftDetected, driftSeverity, eventCount, velocity, acceleration, isConnected, scenario, latencyMs, confidence, entropy, trend, anomalyScore, fraudProbability, fraudTrajectory, intentVector, timeline } = state

  useEffect(() => { if (!isConnected) connect('normal') }, [])

  const trustColor = getTrustColor(trustScore)
  const cogColors: Record<string, string> = { calm: '#10B981', focused: '#3B82F6', distressed: '#F59E0B', panicked: '#F97316', coerced: '#EF4444', robotic: '#8B5CF6' }
  const cogColor = cogColors[cognitiveState] || '#94A3B8'

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, fontFamily: 'Space Grotesk', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Radio size={18} color="#10B981" /> Live Session Monitor
          </h1>
          <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: '3px 0 0', fontFamily: 'JetBrains Mono', display: 'flex', alignItems: 'center', gap: 5 }}>
            {isConnected ? <><Wifi size={10} color="#10B981" /> Pipeline active · streaming every 2s</> : <><WifiOff size={10} color="#EF4444" /> Disconnected</>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {SCENARIOS.map(s => (
            <button key={s.key} onClick={() => switchScenario(s.key)} style={{ padding: '5px 12px', borderRadius: 999, fontSize: 10, fontWeight: 700, cursor: 'pointer', background: scenario === s.key ? `${s.color}15` : 'transparent', border: `1px solid ${scenario === s.key ? s.color : 'var(--border-light)'}`, color: scenario === s.key ? s.color : 'var(--text-muted)', transition: 'all 0.15s' }}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        <StatCard label="Similarity" value={similarity.toFixed(3)} sub="Cosine baseline" color={similarity > 0.85 ? '#10B981' : '#F59E0B'} icon={<Fingerprint size={16} style={{ color: similarity > 0.85 ? '#10B981' : '#F59E0B' }} />} />
        <StatCard label="Drift" value={driftDetected ? driftSeverity.toUpperCase() : 'NONE'} sub="CUSUM detector" color={driftDetected ? '#EF4444' : '#10B981'} icon={<AlertTriangle size={16} style={{ color: driftDetected ? '#EF4444' : '#10B981' }} />} />
        <StatCard label="Events" value={String(eventCount)} sub={`${latencyMs.toFixed(0)}ms latency`} color="#3B82F6" icon={<Activity size={16} style={{ color: '#3B82F6' }} />} />
        <StatCard label="Fraud Risk" value={`${(fraudProbability * 100).toFixed(0)}%`} sub={fraudTrajectory} color={fraudProbability > 0.5 ? '#EF4444' : '#10B981'} icon={<Target size={16} style={{ color: fraudProbability > 0.5 ? '#EF4444' : '#10B981' }} />} />
      </div>

      {/* Main: Gauge + Chart + Decision */}
      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr 220px', gap: 14, marginBottom: 16 }}>
        {/* Gauge */}
        <div style={{ background: 'var(--bg-card)', borderRadius: 14, padding: '16px 10px', border: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <TrustGauge value={trustScore} color={trustColor} />
          <div style={{ display: 'flex', gap: 18, marginTop: 6 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 8, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>VELOCITY</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: velocity < -0.01 ? '#EF4444' : '#10B981', fontFamily: 'Space Grotesk' }}>{velocity > 0 ? '+' : ''}{velocity.toFixed(4)}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 8, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>TREND</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: trend === 'declining' ? '#EF4444' : '#10B981', fontFamily: 'Space Grotesk' }}>{trend.toUpperCase()}</div>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div style={{ background: 'var(--bg-card)', borderRadius: 14, padding: '14px 16px', border: '1px solid var(--border-light)' }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6, fontFamily: 'JetBrains Mono', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Trust + Similarity Timeline</div>
          <TrustSpline data={timeline.slice(-30)} trustColor={trustColor} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 8 }}>
            {[
              { label: 'ENTROPY', value: entropy.toFixed(3), color: '#8B5CF6' },
              { label: 'ACCEL', value: acceleration.toFixed(4), color: '#3B82F6' },
              { label: 'CONFIDENCE', value: `${(confidence * 100).toFixed(0)}%`, color: '#F59E0B' },
            ].map(m => (
              <div key={m.label} style={{ padding: '5px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-light)' }}>
                <div style={{ fontSize: 8, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>{m.label}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: m.color, fontFamily: 'Space Grotesk' }}>{m.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Decision Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ padding: 12, borderRadius: 10, flex: 1, background: decision === 'ALLOW' ? 'rgba(16,185,129,0.05)' : decision === 'STEP_UP' ? 'rgba(245,158,11,0.05)' : 'rgba(239,68,68,0.05)', border: `1px solid ${decision === 'ALLOW' ? 'rgba(16,185,129,0.15)' : decision === 'STEP_UP' ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)'}` }}>
            <div style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--text-muted)', marginBottom: 3, fontFamily: 'JetBrains Mono' }}>DECISION</div>
            <AnimatePresence mode="wait">
              <motion.div key={decision} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} style={{ fontSize: 20, fontWeight: 900, color: decision === 'ALLOW' ? '#10B981' : decision === 'STEP_UP' ? '#F59E0B' : '#EF4444', fontFamily: 'Space Grotesk' }}>
                {decision === 'STEP_UP' ? 'STEP-UP' : decision}
              </motion.div>
            </AnimatePresence>
          </div>
          <div style={{ padding: 12, borderRadius: 10, flex: 1, background: `${cogColor}06`, border: `1px solid ${cogColor}15` }}>
            <div style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--text-muted)', marginBottom: 3, fontFamily: 'JetBrains Mono' }}>COGNITIVE</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Brain size={14} color={cogColor} />
              <span style={{ fontSize: 14, fontWeight: 800, color: cogColor, fontFamily: 'Space Grotesk' }}>{cognitiveState.toUpperCase()}</span>
            </div>
          </div>
          <div style={{ padding: 12, borderRadius: 10, flex: 1, background: 'rgba(139,92,246,0.04)', border: '1px solid rgba(139,92,246,0.1)' }}>
            <div style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--text-muted)', marginBottom: 3, fontFamily: 'JetBrains Mono' }}>ANOMALY</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: anomalyScore > 0.3 ? '#EF4444' : '#10B981', fontFamily: 'Space Grotesk' }}>{(anomalyScore * 100).toFixed(1)}%</div>
          </div>
        </div>
      </div>

      {/* Pipeline Stepper — compact with live data */}
      <div style={{ background: 'var(--bg-card)', borderRadius: 14, padding: '14px 18px', border: '1px solid var(--border-light)', marginBottom: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-main)', marginBottom: 10, fontFamily: 'Space Grotesk' }}>Pipeline Execution</div>
        <Stepper initialStep={1} backButtonText="Prev" nextButtonText="Next">
          <Step>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <Fingerprint size={14} color="#10B981" />
              <span style={{ fontSize: 12, color: 'var(--text-main)', fontFamily: 'Space Grotesk' }}><strong>Embedding:</strong> 16-dim → 384-dim | <span style={{ color: '#3B82F6' }}>~55ms</span></span>
            </div>
          </Step>
          <Step>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <Activity size={14} color="#3B82F6" />
              <span style={{ fontSize: 12, color: 'var(--text-main)', fontFamily: 'Space Grotesk' }}><strong>Similarity:</strong> <span style={{ color: similarity > 0.85 ? '#10B981' : '#F59E0B' }}>{similarity.toFixed(4)}</span> | CUSUM: <span style={{ color: driftDetected ? '#EF4444' : '#10B981' }}>{driftDetected ? 'DRIFT' : 'OK'}</span></span>
            </div>
          </Step>
          <Step>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <Brain size={14} color="#8B5CF6" />
              <span style={{ fontSize: 12, color: 'var(--text-main)', fontFamily: 'Space Grotesk' }}><strong>Cognitive:</strong> <span style={{ color: cogColor }}>{cognitiveState.toUpperCase()}</span> | Anomaly: <span style={{ color: anomalyScore > 0.3 ? '#EF4444' : '#10B981' }}>{(anomalyScore * 100).toFixed(1)}%</span></span>
            </div>
          </Step>
          <Step>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <Shield size={14} color={trustColor} />
              <span style={{ fontSize: 12, color: 'var(--text-main)', fontFamily: 'Space Grotesk' }}><strong>T(t)=</strong><span style={{ color: trustColor }}>{trustScore.toFixed(0)}</span> → <span style={{ color: decision === 'ALLOW' ? '#10B981' : decision === 'STEP_UP' ? '#F59E0B' : '#EF4444' }}>{decision}</span> | Fraud: {(fraudProbability * 100).toFixed(0)}%</span>
            </div>
          </Step>
        </Stepper>
      </div>

      {/* Intent Vector */}
      <div style={{ background: 'var(--bg-card)', borderRadius: 14, padding: '14px 18px', border: '1px solid var(--border-light)' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-main)', marginBottom: 10, fontFamily: 'Space Grotesk' }}>Fraud Intent Vector</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {[
            { label: 'Coercion', value: intentVector.coercion_probability, color: '#EF4444' },
            { label: 'Takeover', value: intentVector.takeover_probability, color: '#F97316' },
            { label: 'Anomaly', value: intentVector.anomaly_severity, color: '#F59E0B' },
            { label: 'Robotic', value: intentVector.robotic_probability, color: '#8B5CF6' },
          ].map(item => (
            <div key={item.label} style={{ padding: '10px 12px', borderRadius: 8, background: `${item.color}05`, border: `1px solid ${item.color}10` }}>
              <div style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 3, fontFamily: 'JetBrains Mono' }}>{item.label}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: item.value > 0.5 ? item.color : 'var(--text-sub)', fontFamily: 'Space Grotesk' }}>{(item.value * 100).toFixed(0)}%</div>
              <div style={{ height: 3, background: 'rgba(255,255,255,0.04)', borderRadius: 99, overflow: 'hidden', marginTop: 5 }}>
                <motion.div animate={{ width: `${item.value * 100}%` }} transition={{ duration: 0.5 }} style={{ height: '100%', background: item.color, borderRadius: 99 }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Alert */}
      <AnimatePresence>
        {(cognitiveState === 'panicked' || cognitiveState === 'coerced' || cognitiveState === 'robotic') && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
            <AlertTriangle size={16} color="#EF4444" />
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#EF4444', fontFamily: 'Space Grotesk' }}>
                {cognitiveState === 'robotic' ? 'AUTOMATED BEHAVIOR' : cognitiveState === 'coerced' ? 'COERCION DETECTED' : 'COGNITIVE DISTRESS'}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-sub)', marginTop: 1, fontFamily: 'JetBrains Mono' }}>
                {state.reasons[0] || 'Behavioral anomaly detected'}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default LiveMonitor
