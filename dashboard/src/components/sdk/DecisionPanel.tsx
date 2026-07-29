import React from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { ShieldCheck, ShieldAlert, ShieldX } from 'lucide-react'

interface DecisionPanelProps {
  decision: string
  confidence: number
  reasons: string[]
  explanation: string
  cognitiveState: string
}

const DECISION_META = {
  ALLOW: { icon: ShieldCheck, color: '#10B981', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)', label: 'TRANSACTION ALLOWED' },
  STEP_UP: { icon: ShieldAlert, color: '#F59E0B', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)', label: 'STEP-UP REQUIRED' },
  BLOCK: { icon: ShieldX, color: '#EF4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.25)', label: 'SESSION BLOCKED' },
}

export const DecisionPanel: React.FC<DecisionPanelProps> = ({
  decision, confidence, reasons, explanation, cognitiveState,
}) => {
  const meta = DECISION_META[decision as keyof typeof DECISION_META] ?? DECISION_META.ALLOW
  const Icon = meta.icon

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={decision}
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.97 }}
        transition={{ duration: 0.2 }}
        style={{
          borderRadius: 12, background: meta.bg,
          border: `1px solid ${meta.border}`,
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: `1px solid ${meta.border}` }}>
          <Icon size={16} color={meta.color} />
          <span style={{ fontSize: 11, fontWeight: 800, color: meta.color, fontFamily: 'Space Grotesk', letterSpacing: '0.05em' }}>
            {meta.label}
          </span>
          <div style={{ marginLeft: 'auto', fontSize: 9, color: meta.color, background: `${meta.color}15`, padding: '2px 7px', borderRadius: 10, fontFamily: 'JetBrains Mono', fontWeight: 700 }}>
            {Math.round(confidence * 100)}% conf
          </div>
        </div>

        {/* Explanation */}
        <div style={{ padding: '8px 12px' }}>
          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, margin: 0 }}>
            {decision === 'ALLOW'
              ? 'Behavioral fingerprint consistent with enrolled user. All trust signals within normal range.'
              : decision === 'STEP_UP'
              ? `Elevated risk signals detected (${cognitiveState}). Additional verification required before proceeding.`
              : cognitiveState === 'coerced'
              ? 'CRITICAL: Dictation pattern detected. Likely social engineering in progress.'
              : cognitiveState === 'robotic'
              ? 'CRITICAL: Non-human input signature. Remote access or automated attack detected.'
              : 'Trust collapsed below safety threshold. Transaction blocked pending investigation.'}
          </p>

          {/* Reasons chips */}
          {reasons.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
              {reasons.slice(0, 3).map((r, i) => (
                <span key={i} style={{
                  fontSize: 8, padding: '2px 7px', borderRadius: 4,
                  background: 'var(--accent-dim)', color: '#5b8cc7',
                  fontFamily: 'JetBrains Mono',
                }}>
                  {r}
                </span>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
