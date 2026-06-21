import React from 'react'
import { motion } from 'motion/react'

const FinalCard: React.FC = () => (
  <motion.div
    initial={{ opacity: 0, y: 40 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
    style={{
      background: '#0A0D14', borderRadius: 20, overflow: 'hidden',
      border: '1px solid rgba(148,163,184,0.08)', maxWidth: 580, margin: '0 auto 40px',
      boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid rgba(148,163,184,0.06)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981', animation: 'pulse-glow 2s infinite', color: '#10B981' }} />
        <span style={{ fontSize: 9, fontWeight: 700, color: '#64748B', letterSpacing: '0.15em', fontFamily: 'JetBrains Mono' }}>TRUST PIPELINE VERDICT</span>
      </div>
      <span style={{ fontSize: 8, fontWeight: 700, color: '#EF4444', background: 'rgba(239,68,68,0.1)', padding: '3px 8px', borderRadius: 10, border: '1px solid rgba(239,68,68,0.2)', fontFamily: 'JetBrains Mono' }}>SESSION BLOCKED</span>
    </div>

    <div style={{ padding: '16px 20px', fontFamily: 'JetBrains Mono', fontSize: 11, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {[
        ['trust_score', '0.38', '#EF4444'],
        ['cognitive_state', 'COERCED', '#EF4444'],
        ['drift_severity', 'critical', '#F59E0B'],
        ['similarity', '0.62', '#F59E0B'],
        ['decision', 'BLOCK', '#EF4444'],
        ['incident_type', 'SOCIAL_ENGINEERING', '#8B5CF6'],
      ].map(([k, v, c]) => (
        <div key={k} style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#475569' }}>{k}</span>
          <span style={{ color: c, fontWeight: 700 }}>{v}</span>
        </div>
      ))}
    </div>

    <div style={{ padding: '0 20px 18px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
      <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', textAlign: 'center' }}>
        <p style={{ fontSize: 9, fontWeight: 800, color: '#FCA5A5', letterSpacing: '0.08em', margin: '0 0 2px', fontFamily: 'JetBrains Mono' }}>BLOCK TRANSACTION</p>
        <p style={{ fontSize: 8, color: '#64748B', margin: 0 }}>₹2,00,000 to unknown beneficiary</p>
      </div>
      <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', textAlign: 'center' }}>
        <p style={{ fontSize: 9, fontWeight: 800, color: '#6EE7B7', letterSpacing: '0.08em', margin: '0 0 2px', fontFamily: 'JetBrains Mono' }}>CONTACT CUSTOMER</p>
        <p style={{ fontSize: 8, color: '#64748B', margin: 0 }}>Via verified phone channel</p>
      </div>
    </div>
  </motion.div>
)

export default FinalCard
