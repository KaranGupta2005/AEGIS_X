import React from 'react'
import { motion } from 'motion/react'
import { AnimatedNumber } from '../common/AnimatedNumber'

interface TrustGaugeProps {
  value: number // 0-100
  decision: string
}

const COLORS = {
  ALLOW: { fill: '#10B981', glow: 'rgba(16,185,129,0.25)', label: 'SECURE' },
  STEP_UP: { fill: '#F59E0B', glow: 'rgba(245,158,11,0.25)', label: 'VERIFY' },
  BLOCK: { fill: '#EF4444', glow: 'rgba(239,68,68,0.3)', label: 'BLOCKED' },
}

export const TrustGauge: React.FC<TrustGaugeProps> = ({ value, decision }) => {
  const scheme = COLORS[decision as keyof typeof COLORS] ?? COLORS.ALLOW
  const pct = Math.max(0, Math.min(100, value))

  // Arc from -210° to +30° (240° sweep), gauge style
  const cx = 80, cy = 80, r = 62
  const startAngle = -210 * (Math.PI / 180)
  const sweep = 240 * (Math.PI / 180)
  const endAngle = startAngle + (sweep * pct) / 100

  const arcX1 = cx + r * Math.cos(startAngle)
  const arcY1 = cy + r * Math.sin(startAngle)
  const arcX2 = cx + r * Math.cos(endAngle)
  const arcY2 = cy + r * Math.sin(endAngle)
  const largeArc = (sweep * pct) / 100 > Math.PI ? 1 : 0

  const fullEndAngle = startAngle + sweep
  const fX2 = cx + r * Math.cos(fullEndAngle)
  const fY2 = cy + r * Math.sin(fullEndAngle)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg width={160} height={120} viewBox="0 0 160 120" style={{ filter: `drop-shadow(0 0 12px ${scheme.glow})` }}>
        {/* Track */}
        <path
          d={`M ${arcX1} ${arcY1} A ${r} ${r} 0 1 1 ${fX2} ${fY2}`}
          fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={8} strokeLinecap="round"
        />
        {/* Fill arc */}
        {pct > 0 && (
          <motion.path
            d={`M ${arcX1} ${arcY1} A ${r} ${r} 0 ${largeArc} 1 ${arcX2} ${arcY2}`}
            fill="none" stroke={scheme.fill} strokeWidth={8} strokeLinecap="round"
            initial={false}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          />
        )}
        {/* Tick marks */}
        {[0, 25, 50, 75, 100].map(tick => {
          const a = startAngle + (sweep * tick) / 100
          const x1 = cx + (r - 10) * Math.cos(a)
          const y1 = cy + (r - 10) * Math.sin(a)
          const x2 = cx + r * Math.cos(a)
          const y2 = cy + r * Math.sin(a)
          return <line key={tick} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255,255,255,0.15)" strokeWidth={1.5} />
        })}
        {/* Labels */}
        <text x={22} y={106} fill="rgba(255,255,255,0.25)" fontSize={7} fontFamily="JetBrains Mono" textAnchor="middle">0</text>
        <text x={138} y={106} fill="rgba(255,255,255,0.25)" fontSize={7} fontFamily="JetBrains Mono" textAnchor="middle">100</text>
      </svg>

      {/* Center value */}
      <div style={{ marginTop: -48, textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <motion.div
          key={Math.round(value)}
          initial={{ scale: 1.15, opacity: 0.6 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
          style={{ fontSize: 38, fontWeight: 900, color: scheme.fill, fontFamily: 'Space Grotesk', lineHeight: 1 }}
        >
          <AnimatedNumber value={Math.round(value)} decimals={0} suffix="%" />
        </motion.div>
        <motion.div
          animate={{ color: scheme.fill }}
          transition={{ duration: 0.3 }}
          style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', marginTop: 4, fontFamily: 'JetBrains Mono' }}
        >
          {scheme.label}
        </motion.div>
      </div>
    </div>
  )
}
