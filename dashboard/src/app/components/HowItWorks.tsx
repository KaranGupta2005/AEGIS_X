import React, { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Check, Radio, Shield, Brain, TrendingDown, Fingerprint, ChevronLeft, ChevronRight } from 'lucide-react'

const steps = [
  {
    badge: 'SDK CAPTURE',
    badgeColor: '#60a5fa',
    icon: <Radio size={22} />,
    title: 'Behavioral Telemetry',
    desc: 'The React Native SDK captures 16 behavioral signals every 2 seconds — typing cadence, swipe velocity, hesitation patterns, gyroscope data — and streams them via WebSocket.',
    code: `// SDK streams every 2 seconds
{
  "typing_speed_cps": 3.8,
  "hesitation_ratio": 0.08,
  "swipe_velocity": 1.2,
  "gyroscope_variance": 0.015,
  "correction_rate": 0.04
}`,
  },
  {
    badge: 'EMBEDDING',
    badgeColor: '#818cf8',
    icon: <Fingerprint size={22} />,
    title: '384-D Behavioral Fingerprint',
    desc: 'Raw features are serialized into natural language descriptions, then embedded via MiniLM-L6-v2 into a 384-dimensional semantic vector — the user\'s behavioral identity.',
    code: `// Text serialization → MiniLM
"Typing speed normal. Low hesitation.
 Stable swipe velocity. Natural rhythm."
      ↓
[0.064, -0.130, 0.067, ...] // 384-dim`,
  },
  {
    badge: 'DRIFT DETECTION',
    badgeColor: '#3b82f6',
    icon: <TrendingDown size={22} />,
    title: 'CUSUM Change-Point Analysis',
    desc: 'Cumulative Sum detects gradual behavioral drift (account takeover) and instant jumps (malware injection) that single-threshold checks miss.',
    code: `// CUSUM accumulates deviation
S(t) = S(t-1) + (expected - actual)

if S(t) > threshold:
    DRIFT_DETECTED = True
    // Alert: progressive takeover`,
  },
  {
    badge: 'TRUST DECISION',
    badgeColor: '#06b6d4',
    icon: <Shield size={22} />,
    title: 'ALLOW / STEP-UP / BLOCK',
    desc: 'The Trust Engine computes T(t) from all signals, tracks velocity dT/dt and acceleration d²T/dt², then the Decision Engine issues the final verdict with full explainability.',
    code: `// Trust Score Formula
T(t) = 0.40 × similarity
     + 0.20 × device_trust
     + 0.20 × transaction
     + 0.20 × cognitive

// Decision: T=0.42 → BLOCK
// Reason: "Coercion detected"`,
  },
]

export default function HowItWorks() {
  const [activeStep, setActiveStep] = useState(0)
  const step = steps[activeStep]

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 32px' }}>
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <h2 style={{ fontSize: 40, fontWeight: 700, color: '#111827', fontFamily: 'Space Grotesk', letterSpacing: '-0.03em', margin: '0 0 12px' }}>
          How AEGIS-X Works
        </h2>
        <p style={{ fontSize: 15, color: '#4B5563', maxWidth: 500, margin: '0 auto', lineHeight: 1.7 }}>
          From raw behavioral signals to trust decisions in under 100 milliseconds, no human intervention required.
        </p>
      </div>

      {/* Step indicator circles */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: 40 }}>
        {steps.map((s, i) => (
          <React.Fragment key={i}>
            <motion.button
              onClick={() => setActiveStep(i)}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              style={{
                width: 36, height: 36, borderRadius: '50%', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: i < activeStep ? s.badgeColor : i === activeStep ? s.badgeColor : 'rgba(255,255,255,0.06)',
                boxShadow: i === activeStep ? `0 0 16px ${s.badgeColor}50` : 'none',
                transition: 'all 0.3s',
              }}
            >
              {i < activeStep ? (
                <Check size={16} color="white" />
              ) : (
                <span style={{ fontSize: 12, fontWeight: 700, color: i === activeStep ? 'white' : 'rgba(255,255,255,0.3)', fontFamily: 'JetBrains Mono' }}>{i + 1}</span>
              )}
            </motion.button>
            {i < steps.length - 1 && (
              <div style={{ width: 60, height: 2, background: i < activeStep ? steps[i].badgeColor : 'rgba(255,255,255,0.08)', borderRadius: 1, transition: 'background 0.4s' }} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Step content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeStep}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.35 }}
          style={{ background: '#3B82F6', boxShadow: '0 25px 50px -12px rgba(59, 130, 246, 0.25)', border: 'none', borderRadius: 16, padding: 32, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, alignItems: 'start' }}
        >
          {/* Left: description */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}>
                {step.icon}
              </div>
              <span style={{ fontSize: 10, letterSpacing: '0.12em', color: '#ffffff', fontFamily: 'JetBrains Mono', fontWeight: 600 }}>{step.badge}</span>
            </div>
            <h3 style={{ fontSize: 22, fontWeight: 700, color: '#ffffff', fontFamily: 'Space Grotesk', margin: '0 0 12px', lineHeight: 1.2 }}>
              {step.title}
            </h3>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.9)', lineHeight: 1.7, margin: 0 }}>
              {step.desc}
            </p>
          </div>

          {/* Right: code block */}
          <div style={{ background: '#ffffff', border: 'none', borderRadius: 12, padding: '16px 20px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF4444', opacity: 0.6 }} />
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#F59E0B', opacity: 0.6 }} />
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981', opacity: 0.6 }} />
              <span style={{ marginLeft: 8, fontSize: 10, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>pipeline.py</span>
            </div>
            <pre style={{ margin: 0, fontSize: 11, lineHeight: 1.7, color: '#1E3A8A', fontFamily: 'JetBrains Mono', whiteSpace: 'pre-wrap', overflowX: 'auto' }}>
              {step.code}
            </pre>
            {/* Subtle gradient overlay */}
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 24, background: 'linear-gradient(transparent, rgba(248,250,252,0.8))', pointerEvents: 'none' }} />
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Nav buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
        <button
          onClick={() => setActiveStep(Math.max(0, activeStep - 1))}
          disabled={activeStep === 0}
          style={{ padding: '8px 18px', borderRadius: 8, fontSize: 13, fontFamily: 'Space Grotesk', fontWeight: 500, cursor: activeStep === 0 ? 'not-allowed' : 'pointer', background: '#ffffff', border: '1px solid rgba(0,0,0,0.1)', color: activeStep === 0 ? '#d1d5db' : '#4B5563', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s' }}
        >
          <ChevronLeft size={14} /> Previous
        </button>
        <button
          onClick={() => setActiveStep(Math.min(steps.length - 1, activeStep + 1))}
          disabled={activeStep === steps.length - 1}
          style={{ padding: '8px 18px', borderRadius: 8, fontSize: 13, fontFamily: 'Space Grotesk', fontWeight: 600, cursor: activeStep === steps.length - 1 ? 'not-allowed' : 'pointer', background: activeStep === steps.length - 1 ? 'rgba(255,255,255,0.04)' : 'linear-gradient(135deg, #2563eb, #1d4ed8)', border: 'none', color: activeStep === steps.length - 1 ? 'rgba(255,255,255,0.2)' : 'white', display: 'flex', alignItems: 'center', gap: 6, boxShadow: activeStep === steps.length - 1 ? 'none' : '0 0 16px rgba(37,99,235,0.3)', transition: 'all 0.2s' }}
        >
          Next Step <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}
