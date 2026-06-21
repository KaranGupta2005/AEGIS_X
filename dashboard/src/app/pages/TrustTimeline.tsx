import React, { useEffect, useRef } from 'react'
import { motion } from 'motion/react'
import { TrendingDown, Wifi, Clock, AlertTriangle } from 'lucide-react'
import { useStore } from '../../services/store'

const TrustTimeline: React.FC = () => {
  const { state } = useStore()
  const { timeline, trustScore, isConnected, velocity, acceleration, entropy, driftDetected, cognitiveState } = state
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartInstanceRef = useRef<any>(null)

  const data = timeline.map(t => ({ ...t, trustPercent: t.trust }))
  const minTrust = data.length > 0 ? Math.min(...data.map(d => d.trustPercent)) : 95
  const maxTrust = data.length > 0 ? Math.max(...data.map(d => d.trustPercent)) : 99
  const finalTrust = data.length > 0 ? data[data.length - 1].trustPercent : trustScore
  const getColor = (t: number) => t > 85 ? '#10B981' : t > 60 ? '#F59E0B' : '#EF4444'

  const eventMarkers = data.filter(d => d.drift_detected || d.cognitive_state === 'panicked' || d.cognitive_state === 'coerced' || d.decision === 'BLOCK')

  useEffect(() => {
    if (!chartContainerRef.current) return
    let cancelled = false

    ;(async () => {
      const Highcharts = (await import('highcharts')).default
      if (cancelled || !chartContainerRef.current) return

      const animateSVGPath = (svgElem: any, animation: any, callback?: any) => {
        const length = svgElem.element.getTotalLength()
        svgElem.attr({ 'stroke-dasharray': length, 'stroke-dashoffset': length, opacity: 1 })
        svgElem.animate({ 'stroke-dashoffset': 0 }, animation, callback)
      }

      ;(Highcharts as any).seriesTypes.line.prototype.animate = function (init: boolean) {
        const series = this
        const animation = (Highcharts as any).animObject(series.options.animation)
        if (!init && series.graph) {
          animateSVGPath(series.graph, animation)
        }
      }

      const trustData = data.map(d => d.trustPercent)
      const simData = data.map(d => (d.similarity || 0) * 100)
      const velData = data.map(d => {
        const idx = timeline.indexOf(d)
        return idx > 0 ? (timeline[idx].trust - timeline[idx - 1].trust) : 0
      })

      chartInstanceRef.current = Highcharts.chart(chartContainerRef.current!, {
        chart: { type: 'spline', backgroundColor: 'transparent', height: 360, style: { fontFamily: 'Inter, sans-serif' } },
        title: { text: 'Trust Score Evolution', style: { color: '#F1F5F9', fontSize: '14px', fontWeight: '700', fontFamily: 'Space Grotesk' } },
        subtitle: { text: `${data.length} observations · Real-time behavioral analysis`, style: { color: '#64748B', fontSize: '10px', fontFamily: 'JetBrains Mono' } },
        xAxis: { categories: data.map(d => d.time), labels: { style: { color: '#64748B', fontSize: '9px', fontFamily: 'JetBrains Mono' } }, lineColor: 'rgba(255,255,255,0.05)', tickColor: 'rgba(255,255,255,0.05)' },
        yAxis: [
          { title: { text: 'Trust Score (%)', style: { color: '#10B981', fontSize: '10px' } }, labels: { style: { color: '#64748B', fontSize: '9px' } }, gridLineColor: 'rgba(255,255,255,0.04)', min: 0, max: 100, plotLines: [{ color: 'rgba(16,185,129,0.4)', width: 1, value: 85, dashStyle: 'Dash' as any, label: { text: 'ALLOW', align: 'right' as any, x: -10, style: { color: '#10B981', fontSize: '8px', fontFamily: 'JetBrains Mono' } } }, { color: 'rgba(239,68,68,0.4)', width: 1, value: 60, dashStyle: 'Dash' as any, label: { text: 'BLOCK', align: 'right' as any, x: -10, style: { color: '#EF4444', fontSize: '8px', fontFamily: 'JetBrains Mono' } } }] },
          { title: { text: 'Similarity (%)', style: { color: '#3B82F6', fontSize: '10px' } }, labels: { style: { color: '#64748B', fontSize: '9px' } }, gridLineWidth: 0, opposite: true, min: 0, max: 100 },
          { title: { text: 'Velocity (dT/dt)', style: { color: '#8B5CF6', fontSize: '10px' } }, labels: { style: { color: '#64748B', fontSize: '9px' } }, gridLineWidth: 0, opposite: true },
        ],
        legend: { itemStyle: { color: '#94A3B8', fontSize: '10px', fontFamily: 'JetBrains Mono' }, itemHoverStyle: { color: '#F1F5F9' } },
        plotOptions: { series: { animation: { duration: 1200 }, marker: { enabled: false }, lineWidth: 2.5 } },
        series: [
          { type: 'spline', name: 'Trust Score', data: trustData, yAxis: 0, color: '#10B981', animation: { duration: 1200 } } as any,
          { type: 'spline', name: 'Similarity', data: simData, yAxis: 1, color: '#3B82F6', dashStyle: 'ShortDot', lineWidth: 1.5, animation: { duration: 1200, defer: 800 } } as any,
          { type: 'spline', name: 'Velocity', data: velData, yAxis: 2, color: '#8B5CF6', dashStyle: 'ShortDash', lineWidth: 1.5, animation: { duration: 1200, defer: 1600 } } as any,
        ],
        tooltip: { shared: true, backgroundColor: '#1E293B', borderColor: '#334155', style: { color: '#E2E8F0', fontSize: '11px', fontFamily: 'JetBrains Mono' } },
        credits: { enabled: false },
      } as any)
    })()

    return () => { cancelled = true; chartInstanceRef.current?.destroy() }
  }, [data.length > 0 ? data[data.length - 1]?.time : ''])

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, fontFamily: 'Space Grotesk', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <TrendingDown size={18} color="#3B82F6" /> Trust Timeline
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 10, marginTop: 3, fontFamily: 'JetBrains Mono', display: 'flex', alignItems: 'center', gap: 5 }}>
            <Wifi size={10} color={isConnected ? '#10B981' : '#EF4444'} />
            Live T(t) evolution — {data.length} observations
          </p>
        </div>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'CURRENT', value: `${finalTrust.toFixed(0)}%`, color: getColor(finalTrust) },
          { label: 'PEAK', value: `${maxTrust.toFixed(0)}%`, color: '#10B981' },
          { label: 'MIN', value: `${minTrust.toFixed(0)}%`, color: getColor(minTrust) },
          { label: 'VELOCITY', value: `${velocity >= 0 ? '+' : ''}${velocity.toFixed(4)}`, color: velocity < -0.01 ? '#EF4444' : '#10B981' },
          { label: 'ENTROPY', value: entropy.toFixed(3), color: '#8B5CF6' },
        ].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            style={{ background: 'var(--bg-card)', borderRadius: 10, padding: '12px 14px', border: '1px solid var(--border-light)' }}>
            <div style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--text-muted)', marginBottom: 3, fontFamily: 'JetBrains Mono' }}>{s.label}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: s.color, fontFamily: 'Space Grotesk' }}>{s.value}</div>
          </motion.div>
        ))}
      </div>

      {/* Highcharts Animated Spline */}
      <div style={{ background: 'var(--bg-card)', borderRadius: 14, padding: '20px 16px', border: '1px solid var(--border-light)', marginBottom: 14 }}>
        {data.length > 0 ? (
          <div ref={chartContainerRef} style={{ width: '100%' }} />
        ) : (
          <div style={{ height: 360, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: 12, fontFamily: 'JetBrains Mono' }}>Waiting for data... Switch scenario on Live Monitor.</p>
          </div>
        )}
      </div>

      {/* Event Markers */}
      {eventMarkers.length > 0 && (
        <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: '14px 16px', border: '1px solid var(--border-light)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-main)', marginBottom: 10, fontFamily: 'Space Grotesk' }}>Critical Events</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {eventMarkers.slice(-8).map((d, i) => (
              <motion.div key={i} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.12)', borderRadius: 6 }}>
                <AlertTriangle size={10} color="#EF4444" />
                <span style={{ fontSize: 9, color: '#EF4444', fontWeight: 600, fontFamily: 'JetBrains Mono' }}>
                  {d.time} — {d.decision === 'BLOCK' ? 'BLOCKED' : d.cognitive_state.toUpperCase()}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default TrustTimeline
