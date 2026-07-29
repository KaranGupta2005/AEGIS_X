import React, { useRef, useEffect } from 'react'
import { motion } from 'motion/react'
import { TimelineEntry } from '../../services/store'

interface SessionEventLogProps {
  timeline: TimelineEntry[]
  eventCount: number
}

const DECISION_COLORS: Record<string, string> = {
  ALLOW: '#10B981', STEP_UP: '#F59E0B', BLOCK: '#EF4444',
}

const STATE_COLORS: Record<string, string> = {
  calm: '#10B981', focused: '#3B82F6', distressed: '#F59E0B',
  panicked: '#F97316', coerced: '#EF4444', robotic: '#8B5CF6',
}

export const SessionEventLog: React.FC<SessionEventLogProps> = ({ timeline, eventCount }) => {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [timeline.length])

  const recent = [...timeline].slice(-12).reverse()

  return (
    <div
      ref={scrollRef}
      style={{ height: 110, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}
      className="scrollbar-hide"
    >
      {recent.map((entry, i) => {
        const dc = DECISION_COLORS[entry.decision] || 'var(--text-muted)'
        const sc = STATE_COLORS[entry.cognitive_state] || 'var(--text-muted)'
        return (
          <motion.div
            key={entry.event_number}
            initial={i === 0 ? { opacity: 0, x: -6 } : { opacity: 1 }}
            animate={{ opacity: 1, x: 0 }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '3px 6px', borderRadius: 5,
              background: i === 0 ? 'rgba(255,255,255,0.03)' : 'transparent',
            }}
          >
            <span style={{ fontSize: 7, color: '#5b8cc7', fontFamily: 'JetBrains Mono', width: 28 }}>
              #{entry.event_number}
            </span>
            <span style={{ fontSize: 7, color: '#5b8cc7', fontFamily: 'JetBrains Mono', width: 36 }}>
              {entry.time}
            </span>
            <span style={{ fontSize: 8, fontWeight: 700, color: dc, fontFamily: 'Space Grotesk', width: 44 }}>
              {entry.decision}
            </span>
            <span style={{ fontSize: 8, fontWeight: 600, color: sc, fontFamily: 'JetBrains Mono', flex: 1 }}>
              {entry.cognitive_state}
            </span>
            <span style={{ fontSize: 8, fontWeight: 700, color: entry.trust > 85 ? '#10B981' : entry.trust > 60 ? '#F59E0B' : '#EF4444', fontFamily: 'Space Grotesk' }}>
              {entry.trust.toFixed(0)}%
            </span>
          </motion.div>
        )
      })}
    </div>
  )
}
