import React from 'react'
import { motion } from 'motion/react'

const STATES = ['calm', 'focused', 'distressed', 'panicked', 'coerced', 'robotic'] as const
type CogState = typeof STATES[number]

const STATE_META: Record<CogState, { color: string; icon: string; desc: string }> = {
  calm:       { color: '#10B981', icon: '◎', desc: 'Normal interaction' },
  focused:    { color: '#3B82F6', icon: '◉', desc: 'Concentrated activity' },
  distressed: { color: '#F59E0B', icon: '◈', desc: 'Elevated stress signals' },
  panicked:   { color: '#F97316', icon: '◆', desc: 'Severe cognitive distress' },
  coerced:    { color: '#EF4444', icon: '⬡', desc: 'External pressure detected' },
  robotic:    { color: '#8B5CF6', icon: '⬢', desc: 'Non-human input pattern' },
}

interface CognitiveStatePanelProps {
  state: string
  stability: number
}

export const CognitiveStatePanel: React.FC<CognitiveStatePanelProps> = ({ state, stability }) => {
  const meta = STATE_META[state as CogState] ?? STATE_META.calm

  return (
    <div>
      {/* Current state header */}
      <motion.div
        key={state}
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
          borderRadius: 10, background: `${meta.color}08`,
          border: `1px solid ${meta.color}25`, marginBottom: 8,
        }}
      >
        <span style={{ fontSize: 18, color: meta.color }}>{meta.icon}</span>
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, color: meta.color, fontFamily: 'Space Grotesk', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {state}
          </div>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', fontFamily: 'JetBrains Mono' }}>{meta.desc}</div>
        </div>
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: meta.color, fontFamily: 'Space Grotesk' }}>
            {Math.round(stability * 100)}%
          </div>
          <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.3)', fontFamily: 'JetBrains Mono' }}>STABILITY</div>
        </div>
      </motion.div>

      {/* State machine pills */}
      <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        {STATES.map((s) => {
          const m = STATE_META[s]
          const active = s === state
          return (
            <motion.span
              key={s}
              animate={{
                background: active ? `${m.color}18` : 'rgba(255,255,255,0.02)',
                borderColor: active ? `${m.color}60` : 'transparent',
                color: active ? m.color : 'rgba(255,255,255,0.25)',
              }}
              transition={{ duration: 0.25 }}
              style={{
                fontSize: 8, padding: '2px 7px', borderRadius: 5,
                border: '1px solid', fontWeight: active ? 800 : 400,
                fontFamily: 'JetBrains Mono',
              }}
            >
              {s}
            </motion.span>
          )
        })}
      </div>
    </div>
  )
}
