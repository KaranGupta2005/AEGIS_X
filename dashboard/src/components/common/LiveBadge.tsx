import React from 'react'
import { motion } from 'motion/react'

interface LiveBadgeProps {
  connected: boolean
  label?: string
}

export const LiveBadge: React.FC<LiveBadgeProps> = ({ connected, label = 'LIVE' }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
    <div style={{ position: 'relative', width: 7, height: 7 }}>
      <div style={{
        width: 7, height: 7, borderRadius: '50%',
        background: connected ? '#3B82F6' : 'var(--text-muted)',
      }} />
      {connected && (
        <motion.div
          animate={{ scale: [1, 2.2, 1], opacity: [0.6, 0, 0.6] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute', inset: 0,
            borderRadius: '50%', background: '#3B82F6',
          }}
        />
      )}
    </div>
    <span style={{
      fontSize: 9, fontWeight: 700, letterSpacing: '0.12em',
      color: connected ? '#3B82F6' : 'var(--text-muted)',
      fontFamily: 'JetBrains Mono',
    }}>
      {connected ? label : 'OFFLINE'}
    </span>
  </div>
)
