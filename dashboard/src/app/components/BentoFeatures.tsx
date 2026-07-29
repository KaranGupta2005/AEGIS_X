import React from 'react'
import { motion } from 'motion/react'
import { Shield, Brain, TrendingDown, Fingerprint, Zap, Lock, AlertTriangle, CheckCircle } from 'lucide-react'

const SkeletonTrust = () => (
  <div style={{ padding: '16px', background: 'rgba(37,99,235,0.03)', border: '1px solid rgba(37,99,235,0.1)', borderRadius: 12, marginTop: 8 }}>
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4, marginBottom: 12 }}>
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(30,58,138,0.5)' }} />
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(96,165,250,0.5)' }} />
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(6,182,212,0.5)' }} />
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {[
        { label: 'Behavioral Similarity', value: '94%', color: '#06b6d4', width: '94%' },
        { label: 'Cognitive Stability', value: '35%', color: '#1e3a8a', width: '35%' },
        { label: 'Transaction Normal', value: '42%', color: '#60a5fa', width: '42%' },
      ].map((bar, i) => (
        <div key={i}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', marginBottom: 4 }}>
            <span>{bar.label}</span><span>{bar.value}</span>
          </div>
          <div style={{ height: 6, width: '100%', background: 'rgba(37,99,235,0.06)', borderRadius: 4, overflow: 'hidden' }}>
            <motion.div initial={{ width: 0 }} whileInView={{ width: bar.width }} transition={{ duration: 1.2, delay: i * 0.2 }} viewport={{ once: true }}
              style={{ height: '100%', background: bar.color, borderRadius: 4 }} />
          </div>
        </div>
      ))}
    </div>
  </div>
)

const SkeletonDrift = () => (
  <div style={{ padding: 12, marginTop: 8 }}>
    <svg viewBox="0 0 300 80" style={{ width: '100%', height: 80 }}>
      <defs>
        <linearGradient id="driftLine" x1="0" x2="1">
          <stop offset="0%" stopColor="#06b6d4" />
          <stop offset="60%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#1e3a8a" />
        </linearGradient>
      </defs>
      <line x1="0" y1="20" x2="300" y2="20" stroke="rgba(6,182,212,0.3)" strokeWidth="1" strokeDasharray="3,3" />
      <text x="270" y="16" fill="rgba(6,182,212,0.6)" fontSize="7" fontFamily="JetBrains Mono">ALLOW</text>
      <line x1="0" y1="50" x2="300" y2="50" stroke="rgba(30,58,138,0.3)" strokeWidth="1" strokeDasharray="3,3" />
      <text x="270" y="46" fill="rgba(30,58,138,0.6)" fontSize="7" fontFamily="JetBrains Mono">BLOCK</text>
      <polyline points="0,18 30,17 60,19 90,22 120,28 150,35 180,42 210,50 240,58 270,64 300,68"
        stroke="url(#driftLine)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {[90, 150, 210].map((x, i) => (
        <circle key={i} cx={x} cy={[22, 35, 50][i]} r="3" fill={['#60a5fa', '#3b82f6', '#1e3a8a'][i]} />
      ))}
    </svg>
    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
      <span style={{ fontSize: 9, color: '#3b82f6', background: 'rgba(59,130,246,0.08)', padding: '2px 8px', borderRadius: 10, fontFamily: 'JetBrains Mono', border: '1px solid rgba(59,130,246,0.2)' }}>DRIFT DETECTED</span>
      <span style={{ fontSize: 9, color: '#1e3a8a', background: 'rgba(30,58,138,0.08)', padding: '2px 8px', borderRadius: 10, fontFamily: 'JetBrains Mono', border: '1px solid rgba(30,58,138,0.2)' }}>CUSUM: 0.42</span>
    </div>
  </div>
)

const SkeletonSecurity = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
    {[
      { label: 'Anti-Poisoning Gate', desc: 'Baseline updates only when T > 0.90', color: '#06b6d4' },
      { label: 'EMA Adaptation', desc: 'Concept drift handled with decay=0.95', color: '#3b82f6' },
      { label: 'Zero Raw Exposure', desc: 'Only embeddings leave device scope', color: '#818cf8' },
    ].map((item, i) => (
      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'rgba(37,99,235,0.03)', border: '1px solid rgba(37,99,235,0.08)', borderRadius: 8 }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: item.color, boxShadow: `0 0 6px ${item.color}` }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#111827', fontFamily: 'Space Grotesk' }}>{item.label}</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{item.desc}</div>
        </div>
        <CheckCircle size={14} color={item.color} />
      </div>
    ))}
  </div>
)

const SkeletonCognitive = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
    <div style={{ background: 'rgba(37,99,235,0.03)', border: '1px solid rgba(37,99,235,0.1)', borderRadius: 10, padding: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <span style={{ fontSize: 10, color: '#818cf8', fontFamily: 'JetBrains Mono', fontWeight: 600 }}>AI CLASSIFIER</span>
      </div>
      <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.6 }}>
        State detected: <strong style={{ color: '#1e3a8a' }}>PANICKED</strong>
        <br />Hesitation +340% · Corrections +4x baseline
      </div>
    </div>
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
      {['CALM', 'FOCUSED', 'DISTRESSED', 'PANICKED', 'COERCED', 'ROBOTIC'].map((s, i) => (
        <span key={s} style={{
          fontSize: 8, padding: '2px 6px', borderRadius: 8, fontFamily: 'JetBrains Mono', fontWeight: 500,
          color: i === 3 ? '#1e3a8a' : 'var(--text-muted)',
          background: i === 3 ? 'rgba(30,58,138,0.1)' : 'rgba(37,99,235,0.04)',
          border: `1px solid ${i === 3 ? 'rgba(30,58,138,0.3)' : 'rgba(37,99,235,0.08)'}`,
        }}>{s}</span>
      ))}
    </div>
  </div>
)

export default function BentoFeatures() {
  const features = [
    {
      badge: 'TRUST ENGINE', badgeColor: '#06b6d4',
      title: 'Real-Time Trust Scoring',
      desc: 'T(t) = 0.40×Sim + 0.20×Device + 0.20×Tx + 0.20×Cognitive. Computed every 2 seconds.',
      skeleton: <SkeletonTrust />,
      className: 'col-span-4 border-b border-r',
    },
    {
      badge: 'DRIFT', badgeColor: '#3b82f6',
      title: 'CUSUM Change-Point Detection',
      desc: 'Catches gradual account takeover that single-threshold checks miss entirely.',
      skeleton: <SkeletonDrift />,
      className: 'col-span-2 border-b',
    },
    {
      badge: 'COGNITIVE', badgeColor: '#2563eb',
      title: 'State Machine Classifier',
      desc: 'HistGradient Boosted Classifier (80.8% accuracy on 25K realistic samples) detects coercion, panic, and automation patterns with real-world boundary overlap.',
      skeleton: <SkeletonCognitive />,
      className: 'col-span-3 border-r',
    },
    {
      badge: 'SECURITY', badgeColor: '#818cf8',
      title: 'Enterprise-Grade Architecture',
      desc: 'Zero-PII, anti-poisoning gates, and deterministic fallbacks built for banking compliance.',
      skeleton: <SkeletonSecurity />,
      className: 'col-span-3',
    },
  ]

  return (
    <div style={{ position: 'relative', zIndex: 20, padding: '80px 0', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ padding: '0 32px', textAlign: 'center', marginBottom: 48 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(37,99,235,0.07)', border: '1px solid rgba(37,99,235,0.18)', borderRadius: 20, padding: '5px 14px', marginBottom: 20 }}>
          <Zap size={11} color="#2563eb" />
          <span style={{ fontSize: 11, color: '#2563eb', fontFamily: 'JetBrains Mono', letterSpacing: '0.08em' }}>THE PLATFORM</span>
        </div>
        {/* Heading with animated corner brackets */}
        <div style={{ position: 'relative', display: 'inline-block', padding: '18px 32px' }}>
          <motion.div animate={{ width: [0, 60, 60], height: [0, 0, 60] }} transition={{ duration: 2.8, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }} style={{ position: 'absolute', top: 0, right: 0, borderTop: '4px solid #2563eb', borderRight: '4px solid #2563eb', borderRadius: '0 10px 0 0', pointerEvents: 'none', opacity: 0.8 }} />
          <motion.div animate={{ width: [0, 55, 55], height: [0, 0, 55] }} transition={{ duration: 2.8, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut', delay: 1.4 }} style={{ position: 'absolute', bottom: 0, left: 0, borderBottom: '4px solid #3b82f6', borderLeft: '4px solid #3b82f6', borderRadius: '0 0 0 10px', pointerEvents: 'none', opacity: 0.8 }} />
          <motion.div animate={{ width: [0, 40, 40], height: [0, 0, 40] }} transition={{ duration: 3.2, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut', delay: 0.7 }} style={{ position: 'absolute', top: 0, left: 0, borderTop: '3px solid #818cf8', borderLeft: '3px solid #818cf8', borderRadius: '10px 0 0 0', pointerEvents: 'none', opacity: 0.6 }} />
          <motion.div animate={{ width: [0, 45, 45], height: [0, 0, 45] }} transition={{ duration: 3, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut', delay: 2.1 }} style={{ position: 'absolute', bottom: 0, right: 0, borderBottom: '3px solid #60a5fa', borderRight: '3px solid #60a5fa', borderRadius: '0 0 10px 0', pointerEvents: 'none', opacity: 0.6 }} />
          <h2 style={{ fontSize: 44, fontWeight: 700, color: '#111827', fontFamily: 'Space Grotesk, sans-serif', letterSpacing: '-0.03em', margin: '0 0 14px', lineHeight: 1.1 }}>
            Built for <span style={{ color: '#2563eb' }}>Precision</span>
          </h2>
        </div>
        <p style={{ fontSize: 16, color: '#4B5563', maxWidth: 520, margin: '0 auto', lineHeight: 1.7 }}>
          Every feature is engineered for real-time security, not complexity.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 20, background: '#ffffff', boxShadow: '0 20px 40px rgba(0,0,0,0.08)', overflow: 'hidden', margin: '0 32px' }}>
        {features.map((f, i) => {
          // Alternating corner positions: even = top-right + bottom-left, odd = top-left + bottom-right
          const isEven = i % 2 === 0
          // Different shades of blue for each card
          const shades = ['#3b82f6', '#2563eb', '#1d4ed8', '#60a5fa', '#818cf8', '#6366f1']
          const shade = shades[i % shades.length]
          // Different thicknesses
          const thicknesses = [4, 4.5, 3.5, 5, 4, 4.5]
          const thickness = thicknesses[i % thicknesses.length]
          // Different corner sizes
          const cornerSize = 36 + (i % 3) * 10

          return (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1, duration: 0.5 }}
            whileHover={{ scale: 1.02, borderColor: `${f.badgeColor}40` }}
            style={{ padding: 28, gridColumn: f.className.includes('col-span-4') ? 'span 4' : f.className.includes('col-span-3') ? 'span 3' : 'span 2', borderBottom: f.className.includes('border-b') ? '1px solid rgba(0,0,0,0.08)' : 'none', borderRight: f.className.includes('border-r') ? '1px solid rgba(0,0,0,0.08)' : 'none', cursor: 'default', transition: 'all 0.3s', position: 'relative', overflow: 'hidden' }}
          >
            {/* Animated corner brackets — alternating positions */}
            {isEven ? (
              <>
                {/* Top-right corner */}
                <motion.div
                  animate={{ width: [0, cornerSize, cornerSize], height: [0, 0, cornerSize] }}
                  transition={{ duration: 2.5 + i * 0.3, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut', delay: i * 0.4 }}
                  style={{ position: 'absolute', top: 8, right: 8, borderTop: `${thickness}px solid ${shade}`, borderRight: `${thickness}px solid ${shade}`, borderRadius: '0 8px 0 0', opacity: 0.85, pointerEvents: 'none' }}
                />
                {/* Bottom-left corner */}
                <motion.div
                  animate={{ width: [0, cornerSize, cornerSize], height: [0, 0, cornerSize] }}
                  transition={{ duration: 2.5 + i * 0.3, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut', delay: i * 0.4 + 1.2 }}
                  style={{ position: 'absolute', bottom: 8, left: 8, borderBottom: `${thickness}px solid ${shade}`, borderLeft: `${thickness}px solid ${shade}`, borderRadius: '0 0 0 8px', opacity: 0.85, pointerEvents: 'none' }}
                />
              </>
            ) : (
              <>
                {/* Top-left corner */}
                <motion.div
                  animate={{ width: [0, cornerSize, cornerSize], height: [0, 0, cornerSize] }}
                  transition={{ duration: 2.8 + i * 0.2, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut', delay: i * 0.3 }}
                  style={{ position: 'absolute', top: 8, left: 8, borderTop: `${thickness}px solid ${shade}`, borderLeft: `${thickness}px solid ${shade}`, borderRadius: '8px 0 0 0', opacity: 0.85, pointerEvents: 'none' }}
                />
                {/* Bottom-right corner */}
                <motion.div
                  animate={{ width: [0, cornerSize, cornerSize], height: [0, 0, cornerSize] }}
                  transition={{ duration: 2.8 + i * 0.2, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut', delay: i * 0.3 + 1.4 }}
                  style={{ position: 'absolute', bottom: 8, right: 8, borderBottom: `${thickness}px solid ${shade}`, borderRight: `${thickness}px solid ${shade}`, borderRadius: '0 0 8px 0', opacity: 0.85, pointerEvents: 'none' }}
                />
              </>
            )}

            <motion.div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 30% 30%, ${f.badgeColor}06, transparent 70%)`, opacity: 0 }} whileHover={{ opacity: 1 }} transition={{ duration: 0.3 }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <motion.span initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 + 0.1 }} style={{ fontSize: 9, letterSpacing: '0.12em', color: f.badgeColor, fontFamily: 'JetBrains Mono', fontWeight: 600, textTransform: 'uppercase', display: 'inline-block' }}>{f.badge}</motion.span>
              <motion.h3 initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 + 0.2, duration: 0.5 }} style={{ fontSize: 20, fontWeight: 700, color: '#111827', fontFamily: 'Space Grotesk', margin: '8px 0 6px', lineHeight: 1.2 }}>{f.title}</motion.h3>
              <motion.p initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 + 0.3, duration: 0.5 }} style={{ fontSize: 13, color: '#4B5563', lineHeight: 1.6, maxWidth: 400 }}>{f.desc}</motion.p>
              <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 + 0.4, duration: 0.5 }}>
                {f.skeleton}
              </motion.div>
            </div>
          </motion.div>
          )
        })}
      </div>
    </div>
  )
}
