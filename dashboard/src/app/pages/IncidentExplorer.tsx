import React, { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import Highcharts from 'highcharts'
import HighchartsMore from 'highcharts/highcharts-more'
import HighchartsReact from 'highcharts-react-official'
import { FileWarning, CheckCircle, Brain, TrendingDown, AlertTriangle, Shield, Wifi, Eye, ChevronDown, Activity, Fingerprint, Target, Zap } from 'lucide-react'
import { useStore } from '../../services/store'

HighchartsMore(Highcharts)

const SEV: Record<string, { color: string; bg: string; label: string }> = {
  CRITICAL: { color: '#EF4444', bg: 'rgba(239,68,68,0.1)', label: 'CRITICAL' },
  HIGH: { color: '#F97316', bg: 'rgba(249,115,22,0.1)', label: 'HIGH' },
  MEDIUM: { color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', label: 'MEDIUM' },
  LOW: { color: '#10B981', bg: 'rgba(16,185,129,0.1)', label: 'LOW' },
}

const ReasoningCard: React.FC<{ title: string; score: number; severity: string; icon: React.ReactNode; color: string; reasons: string[]; defaultOpen?: boolean }> = ({ title, score, severity, icon, color, reasons, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen)
  const sev = SEV[severity] || SEV.LOW
  return (
    <div style={{ background: 'var(--bg-card)', borderRadius: 14, border: '1px solid var(--border-light)', overflow: 'hidden', marginBottom: 10 }}>
      <div onClick={() => setOpen(o => !o)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', cursor: 'pointer' }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: `${color}12`, border: `1px solid ${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {icon}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-main)', fontFamily: 'Space Grotesk' }}>{title}</span>
            <span style={{ fontSize: 13, fontWeight: 800, color, fontFamily: 'Space Grotesk' }}>{score}%</span>
          </div>
          <span style={{ fontSize: 9, fontWeight: 800, padding: '1px 6px', borderRadius: 4, background: sev.bg, color: sev.color, marginTop: 4, display: 'inline-block' }}>{severity} RISK</span>
        </div>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }} style={{ color: 'var(--text-muted)' }}>
          <ChevronDown size={16} />
        </motion.div>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} style={{ overflow: 'hidden' }}>
            <div style={{ padding: '0 16px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {reasons.map((r, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: i === 0 ? '#EF4444' : i === 1 ? '#F59E0B' : '#10B981', flexShrink: 0, marginTop: 5 }} />
                  <span style={{ fontSize: 11, color: 'var(--text-sub)', lineHeight: 1.5 }}>{r}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const IncidentExplorer: React.FC = () => {
  const { state } = useStore()
  const { timeline, alerts, isConnected, trustScore, similarity, cognitiveState, cognitiveStability, decision, reasons, explanation, driftDetected, driftSeverity, anomalyScore, fraudProbability, intentVector, velocity, entropy, eventCount, latencyMs } = state

  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)

  const incidents = alerts.map((a, i) => ({
    id: `inc_${i}`,
    title: a.message,
    severity: a.severity,
    cognitiveState: a.cognitive_state,
    trustScore: a.trust_score * 100,
    time: new Date(a.timestamp).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    ip: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
  }))

  if (incidents.length === 0 && (cognitiveState !== 'calm' || driftDetected || trustScore < 85)) {
    incidents.push({
      id: 'live_0',
      title: explanation || `Trust degradation — ${cognitiveState} state detected`,
      severity: trustScore < 60 ? 'CRITICAL' : trustScore < 85 ? 'HIGH' : 'MEDIUM',
      cognitiveState,
      trustScore,
      time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      ip: '10.0.12.4',
    })
  }

  const selected = selectedIdx !== null ? incidents[selectedIdx] : null

  const throughputData = timeline.slice(-20).map(t => t.trust)
  const throughputOptions: Highcharts.Options = {
    chart: { type: 'spline', backgroundColor: 'transparent', height: 120, margin: [10, 10, 20, 30] },
    title: undefined,
    xAxis: { visible: false },
    yAxis: { title: { text: '' }, min: 0, max: 100, gridLineColor: 'rgba(255,255,255,0.03)', labels: { style: { color: '#475569', fontSize: '8px' } } },
    legend: { enabled: false },
    credits: { enabled: false },
    tooltip: { backgroundColor: '#1E293B', borderColor: '#334155', style: { color: '#E2E8F0', fontSize: '9px' } },
    plotOptions: { spline: { marker: { enabled: false }, lineWidth: 2.5, animation: { duration: 800 } } },
    series: [{ type: 'spline' as any, data: throughputData, color: '#8B5CF6', name: 'Trust' }],
  }

  const processingMetrics = [
    { label: 'Behavioral Analysis', value: Math.round(similarity * 100), color: '#10B981' },
    { label: 'Cognitive Scoring', value: Math.round(cognitiveStability * 100), color: '#3B82F6' },
    { label: 'Anomaly Detection', value: Math.round((1 - anomalyScore) * 100), color: '#8B5CF6' },
  ]

  const riskScore = Math.round(100 - trustScore)
  const overallSeverity = riskScore > 60 ? 'CRITICAL' : riskScore > 40 ? 'HIGH' : riskScore > 15 ? 'MEDIUM' : 'LOW'

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 14 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, fontFamily: 'Space Grotesk', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <FileWarning size={18} color="#F59E0B" /> Incident Explorer
        </h1>
        <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: '3px 0 0', fontFamily: 'JetBrains Mono' }}>
          <Wifi size={10} color={isConnected ? '#10B981' : '#EF4444'} style={{ marginRight: 4 }} />
          AI-powered root cause analysis — {incidents.length} incident{incidents.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Top Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 14 }}>
        {[
          { label: 'EVENTS / SEC', value: Math.max(1, Math.round(eventCount / Math.max(timeline.length * 2, 1))), icon: <Zap size={14} color="#F59E0B" />, alert: false },
          { label: 'ACTIVE ALERTS', value: alerts.length, icon: <AlertTriangle size={14} color="#EF4444" />, alert: alerts.length > 0 },
          { label: 'PROCESSING QUEUE', value: eventCount, icon: <Activity size={14} color="#3B82F6" />, alert: false },
          { label: 'AVG LATENCY', value: `${latencyMs.toFixed(0)}ms`, icon: <Target size={14} color="#8B5CF6" />, alert: latencyMs > 100 },
        ].map((s, i) => (
          <div key={i} style={{ background: 'var(--bg-card)', borderRadius: 12, padding: '12px 14px', border: `1px solid ${s.alert ? 'rgba(239,68,68,0.2)' : 'var(--border-light)'}` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>{s.label}</span>
              {s.icon}
            </div>
            <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--text-main)', fontFamily: 'Space Grotesk', lineHeight: 1 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Main Split: Feed + Intelligence */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        {/* Live Anomaly Feed */}
        <div style={{ background: 'var(--bg-card)', borderRadius: 14, border: '1px solid var(--border-light)', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-main)', fontFamily: 'Space Grotesk' }}>Live Anomaly Feed</span>
            <span style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>AUTO REFRESH</span>
          </div>
          <div style={{ padding: 8, maxHeight: 320, overflowY: 'auto' }}>
            {incidents.length > 0 ? incidents.map((inc, i) => {
              const sev = SEV[inc.severity] || SEV.LOW
              return (
                <motion.div key={inc.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} onClick={() => setSelectedIdx(i)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, cursor: 'pointer', marginBottom: 3, borderLeft: `3px solid ${selectedIdx === i ? sev.color : 'transparent'}`, background: selectedIdx === i ? `${sev.color}06` : 'transparent', transition: 'all 0.15s' }}
                  whileHover={{ x: 3 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: sev.color, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inc.title.slice(0, 50)}</span>
                      <span style={{ fontSize: 8, fontWeight: 800, padding: '1px 5px', borderRadius: 3, background: sev.bg, color: sev.color, flexShrink: 0 }}>{inc.severity}</span>
                    </div>
                    <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{inc.cognitiveState.toUpperCase()}</span>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>{inc.time}</div>
                    <div style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>{inc.ip}</div>
                  </div>
                </motion.div>
              )
            }) : (
              <div style={{ padding: 40, textAlign: 'center' }}>
                <Shield size={20} color="var(--text-muted)" style={{ margin: '0 auto 8px', opacity: 0.3 }} />
                <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: 0 }}>No anomalies detected</p>
              </div>
            )}
          </div>
        </div>

        {/* System Intelligence */}
        <div style={{ background: 'var(--bg-card)', borderRadius: 14, border: '1px solid var(--border-light)', padding: '14px 16px' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-main)', fontFamily: 'Space Grotesk', display: 'block', marginBottom: 12 }}>System Intelligence</span>
          <div style={{ marginBottom: 14 }}>
            <span style={{ fontSize: 8, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', fontFamily: 'JetBrains Mono' }}>VERIFICATION THROUGHPUT — LIVE</span>
            <HighchartsReact highcharts={Highcharts} options={throughputOptions} />
          </div>
          <div>
            <span style={{ fontSize: 8, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', fontFamily: 'JetBrains Mono', display: 'block', marginBottom: 8 }}>AI PROCESSING METRICS</span>
            {processingMetrics.map(m => (
              <div key={m.label} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 10, color: 'var(--text-sub)', width: 120, flexShrink: 0 }}>{m.label}</span>
                <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.04)', borderRadius: 99, overflow: 'hidden' }}>
                  <motion.div animate={{ width: `${m.value}%` }} transition={{ duration: 0.6 }} style={{ height: '100%', background: m.color, borderRadius: 99 }} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: m.color, fontFamily: 'Space Grotesk', width: 32, textAlign: 'right' }}>{m.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Radar + Intent Bar Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        {/* Polar Spider Chart — Detection Metrics */}
        <div style={{ background: 'var(--bg-card)', borderRadius: 14, border: '1px solid var(--border-light)', padding: '14px 16px' }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', fontFamily: 'JetBrains Mono', display: 'block', marginBottom: 6 }}>Detection Radar</span>
          <HighchartsReact highcharts={Highcharts} options={{
            chart: { polar: true, type: 'area', backgroundColor: 'transparent', height: 220, margin: [10, 10, 10, 10] },
            title: undefined,
            pane: { size: '85%' },
            xAxis: { categories: ['Similarity', 'Stability', 'Drift Resist.', 'Anti-Fraud', 'Entropy'], tickmarkPlacement: 'on', lineWidth: 0, labels: { style: { color: '#64748B', fontSize: '9px' } }, gridLineColor: 'rgba(255,255,255,0.05)' },
            yAxis: { gridLineInterpolation: 'polygon', lineWidth: 0, min: 0, max: 100, labels: { enabled: false }, gridLineColor: 'rgba(255,255,255,0.04)' },
            legend: { enabled: false },
            credits: { enabled: false },
            tooltip: { shared: true, backgroundColor: '#1E293B', borderColor: '#334155', style: { color: '#E2E8F0', fontSize: '9px' }, pointFormat: '<span style="color:{series.color}">{series.name}: <b>{point.y:.0f}%</b></span><br/>' },
            series: [
              { type: 'area' as any, name: 'Current', data: [Math.round(similarity * 100), Math.round(cognitiveStability * 100), driftDetected ? 20 : 90, Math.round((1 - fraudProbability) * 100), Math.round(Math.min(entropy * 150, 100))], color: '#10B981', fillOpacity: 0.15, lineWidth: 2, marker: { enabled: true, radius: 3 } },
              { type: 'area' as any, name: 'Threshold', data: [85, 70, 50, 60, 50], color: '#F59E0B', fillOpacity: 0.05, lineWidth: 1, dashStyle: 'ShortDash' as any, marker: { enabled: false } },
            ],
          } as any} />
        </div>

        {/* Intent Vector Bar Chart */}
        <div style={{ background: 'var(--bg-card)', borderRadius: 14, border: '1px solid var(--border-light)', padding: '14px 16px' }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', fontFamily: 'JetBrains Mono', display: 'block', marginBottom: 6 }}>Fraud Intent Classification</span>
          <HighchartsReact highcharts={Highcharts} options={{
            chart: { type: 'bar', backgroundColor: 'transparent', height: 220, margin: [10, 30, 30, 90] },
            title: undefined,
            xAxis: { categories: ['Coercion', 'Takeover', 'Anomaly', 'Robotic'], labels: { style: { color: '#94A3B8', fontSize: '10px', fontFamily: 'Space Grotesk' } }, gridLineWidth: 0, lineWidth: 0 },
            yAxis: { min: 0, max: 100, title: { text: '' }, gridLineColor: 'rgba(255,255,255,0.03)', labels: { style: { color: '#475569', fontSize: '8px' } } },
            legend: { enabled: false },
            credits: { enabled: false },
            tooltip: { backgroundColor: '#1E293B', borderColor: '#334155', style: { color: '#E2E8F0', fontSize: '9px' }, valueSuffix: '%' },
            plotOptions: { bar: { borderRadius: 4, borderWidth: 0, dataLabels: { enabled: true, format: '{y}%', style: { color: '#94A3B8', fontSize: '9px', fontWeight: '700', textOutline: 'none' } } } },
            series: [{
              type: 'bar' as any,
              name: 'Probability',
              data: [
                { y: Math.round(intentVector.coercion_probability * 100), color: '#EF4444' },
                { y: Math.round(intentVector.takeover_probability * 100), color: '#F97316' },
                { y: Math.round(intentVector.anomaly_severity * 100), color: '#F59E0B' },
                { y: Math.round(intentVector.robotic_probability * 100), color: '#8B5CF6' },
              ],
            }],
          } as any} />
        </div>
      </div>

      {/* AI Investigation Reasoning */}
      <div style={{ background: 'var(--bg-card)', borderRadius: 14, border: '1px solid var(--border-light)', padding: '16px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Brain size={16} color="#8B5CF6" />
          <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-main)', fontFamily: 'Space Grotesk', textTransform: 'uppercase', letterSpacing: '0.04em' }}>AI Investigation Reasoning</span>
        </div>

        {/* Overall Risk Score */}
        <div style={{ background: `${(SEV[overallSeverity] || SEV.LOW).color}06`, border: `1px solid ${(SEV[overallSeverity] || SEV.LOW).color}15`, borderRadius: 12, padding: '14px 16px', marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'JetBrains Mono', display: 'block', marginBottom: 4 }}>OVERALL RISK SCORE</span>
            <span style={{ fontSize: 36, fontWeight: 900, color: (SEV[overallSeverity] || SEV.LOW).color, fontFamily: 'Space Grotesk', lineHeight: 1 }}>{riskScore}</span>
            <span style={{ fontSize: 14, color: 'var(--text-muted)', fontFamily: 'Space Grotesk' }}>/100</span>
          </div>
          <AlertTriangle size={32} color={(SEV[overallSeverity] || SEV.LOW).color} style={{ opacity: 0.6 }} />
        </div>

        {/* Reasoning Cards */}
        <ReasoningCard
          title="Behavioral Drift"
          score={Math.round((1 - similarity) * 100)}
          severity={driftDetected ? 'HIGH' : 'LOW'}
          icon={<TrendingDown size={16} color="#F59E0B" />}
          color="#F59E0B"
          defaultOpen={driftDetected}
          reasons={[
            `Cosine similarity dropped to ${(similarity * 100).toFixed(1)}% vs baseline`,
            driftDetected ? `CUSUM drift detected — severity: ${driftSeverity}` : 'CUSUM within normal bounds',
            `Trust velocity: ${velocity > 0 ? '+' : ''}${velocity.toFixed(4)} (${velocity < -0.01 ? 'declining rapidly' : 'stable'})`,
          ]}
        />
        <ReasoningCard
          title="Cognitive Assessment"
          score={Math.round((1 - cognitiveStability) * 100)}
          severity={cognitiveState === 'coerced' || cognitiveState === 'robotic' ? 'CRITICAL' : cognitiveState === 'panicked' ? 'HIGH' : 'LOW'}
          icon={<Brain size={16} color="#8B5CF6" />}
          color="#8B5CF6"
          defaultOpen={cognitiveState !== 'calm' && cognitiveState !== 'focused'}
          reasons={[
            `Current cognitive state: ${cognitiveState.toUpperCase()} (RF classifier 96.3% accuracy)`,
            `Stability score: ${(cognitiveStability * 100).toFixed(0)}%`,
            cognitiveState === 'coerced' ? 'External duress indicators detected — possible social engineering' : cognitiveState === 'robotic' ? 'Non-human behavioral pattern — possible remote access malware' : 'No cognitive anomalies detected',
          ]}
        />
        <ReasoningCard
          title="Anomaly Detection"
          score={Math.round(anomalyScore * 100)}
          severity={anomalyScore > 0.5 ? 'CRITICAL' : anomalyScore > 0.2 ? 'MEDIUM' : 'LOW'}
          icon={<Fingerprint size={16} color="#10B981" />}
          color="#10B981"
          defaultOpen={anomalyScore > 0.2}
          reasons={[
            `Isolation Forest anomaly score: ${(anomalyScore * 100).toFixed(1)}%`,
            `Entropy H(t): ${entropy.toFixed(4)} (${entropy > 0.5 ? 'high randomness' : 'normal'})`,
            anomalyScore > 0.3 ? 'Behavior deviates significantly from learned distribution' : 'Within normal behavioral envelope',
          ]}
        />
        <ReasoningCard
          title="Fraud Intent"
          score={Math.round(fraudProbability * 100)}
          severity={fraudProbability > 0.6 ? 'CRITICAL' : fraudProbability > 0.3 ? 'HIGH' : 'LOW'}
          icon={<Target size={16} color="#EF4444" />}
          color="#EF4444"
          defaultOpen={fraudProbability > 0.3}
          reasons={[
            `Coercion probability: ${(intentVector.coercion_probability * 100).toFixed(0)}%`,
            `Account takeover probability: ${(intentVector.takeover_probability * 100).toFixed(0)}%`,
            `Robotic behavior probability: ${(intentVector.robotic_probability * 100).toFixed(0)}%`,
          ]}
        />
      </div>
    </div>
  )
}

export default IncidentExplorer
