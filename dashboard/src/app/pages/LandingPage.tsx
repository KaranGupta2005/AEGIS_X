import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { motion } from 'motion/react'
import {
  ArrowRight, Shield, Brain, Activity, Fingerprint, Eye, Zap,
  Lock, TrendingDown, AlertTriangle, CheckCircle, Sparkles,
} from 'lucide-react'

const LandingPage: React.FC = () => {
  const navigate = useNavigate()
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const heroRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleMouse = (e: MouseEvent) => {
      if (heroRef.current) {
        const rect = heroRef.current.getBoundingClientRect()
        setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
      }
    }
    window.addEventListener('mousemove', handleMouse)
    return () => window.removeEventListener('mousemove', handleMouse)
  }, [])

  return (
    <div style={{ background: 'var(--bg-page)', minHeight: '100vh', color: 'var(--text-main)', fontFamily: 'Inter, sans-serif', overflowX: 'hidden' }}>

      {/* Navbar */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: 'rgba(10,14,26,0.85)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border-light)',
        padding: '0 40px', height: 64,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 8,
            background: 'linear-gradient(135deg, #10b981, #059669)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 20px rgba(16,185,129,0.3)',
          }}>
            <Shield size={18} color="white" />
          </div>
          <span style={{ fontSize: 20, fontWeight: 700, fontFamily: 'Space Grotesk', letterSpacing: '-0.02em' }}>AEGIS-X</span>
          <span style={{ fontSize: 10, color: '#10b981', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', padding: '2px 8px', borderRadius: 20, fontFamily: 'JetBrains Mono' }}>v2.0</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
          {['Architecture', 'Trust Engine', 'Demo'].map(label => (
            <button key={label} style={{ background: 'none', border: 'none', color: 'var(--text-sub)', cursor: 'pointer', fontSize: 14, fontWeight: 500, transition: 'color 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#10b981')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-sub)')}
              onClick={() => navigate('/app/monitor')}
            >{label}</button>
          ))}
          <motion.button
            onClick={() => navigate('/app/monitor')}
            whileHover={{ scale: 1.03, boxShadow: '0 8px 32px rgba(16,185,129,0.4)' }}
            whileTap={{ scale: 0.97 }}
            style={{
              background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none',
              color: 'white', padding: '10px 22px', borderRadius: 8, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 14,
              boxShadow: '0 0 24px rgba(16,185,129,0.25)',
            }}
          >
            Launch SOC <ArrowRight size={14} />
          </motion.button>
        </div>
      </nav>

      {/* Hero */}
      <section ref={heroRef} style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', paddingTop: 64, position: 'relative', overflow: 'hidden' }}>
        {/* BG Effects */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(16,185,129,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,0.03) 1px, transparent 1px)', backgroundSize: '80px 80px' }} />
          <div style={{ position: 'absolute', top: '10%', left: '5%', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)', filter: 'blur(60px)' }} />
          <div style={{ position: 'absolute', bottom: '10%', right: '10%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%)', filter: 'blur(50px)' }} />
          <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(16,185,129,0.04) 0%, transparent 60%)', transform: `translate(${mousePos.x - 200}px, ${mousePos.y - 200}px)`, transition: 'transform 0.4s ease', pointerEvents: 'none' }} />
        </div>

        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 40px', width: '100%', display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 80, alignItems: 'center', position: 'relative', zIndex: 1 }}>
          {/* Left */}
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 20, padding: '6px 14px', marginBottom: 28 }}>
              <Sparkles size={12} color="#10b981" />
              <span style={{ fontSize: 12, color: '#10b981', fontFamily: 'JetBrains Mono', fontWeight: 500 }}>Cyber Security PSBs Hackathon 2026</span>
            </div>

            <h1 style={{ fontSize: 56, fontWeight: 700, fontFamily: 'Space Grotesk', lineHeight: 1.08, letterSpacing: '-0.03em', margin: '0 0 20px' }}>
              Continuous Trust<br />
              <span style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 40%, #3b82f6 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                Infrastructure
              </span>
            </h1>

            <p style={{ fontSize: 18, color: 'var(--text-sub)', lineHeight: 1.7, margin: '0 0 36px', maxWidth: 540 }}>
              AEGIS-X replaces one-time passwords with a living mathematical system.
              Behavioral embeddings, CUSUM drift detection, and cognitive state analysis
              terminate sessions the millisecond they drift from the verified user.
            </p>

            <div style={{ display: 'flex', gap: 32, marginBottom: 40 }}>
              {[
                { val: '<100ms', label: 'Trust Latency' },
                { val: '96.3%', label: 'Cognitive Accuracy' },
                { val: '384-D', label: 'Embedding Space' },
              ].map((stat, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.12 }}>
                  <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'Space Grotesk', color: 'var(--text-main)' }}>{stat.val}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3, fontFamily: 'JetBrains Mono' }}>{stat.label}</div>
                </motion.div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 14 }}>
              <motion.button
                onClick={() => navigate('/app/monitor')}
                whileHover={{ scale: 1.03, boxShadow: '0 8px 40px rgba(16,185,129,0.4)' }}
                whileTap={{ scale: 0.97 }}
                style={{
                  background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none',
                  color: 'white', padding: '15px 32px', borderRadius: 10, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'Space Grotesk',
                  fontWeight: 600, fontSize: 15, boxShadow: '0 0 30px rgba(16,185,129,0.3)',
                }}
              >
                Open Security Dashboard <ArrowRight size={16} />
              </motion.button>
            </div>

            <div style={{ display: 'flex', gap: 20, marginTop: 36 }}>
              {['Zero-Day Detection', 'Anti-Coercion', 'Bank-Grade'].map((badge, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <CheckCircle size={12} color="#10b981" />
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>{badge}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right: Trust visualization */}
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1, delay: 0.3 }}>
            <div style={{
              background: 'var(--bg-panel)', border: '1px solid var(--border-light)',
              borderRadius: 16, padding: 32, position: 'relative', overflow: 'hidden',
              boxShadow: '0 24px 80px rgba(0,0,0,0.4), 0 0 40px rgba(16,185,129,0.05)',
            }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(to right, #10b981, #3b82f6)' }} />

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
                <Activity size={14} color="#10b981" />
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', letterSpacing: '0.08em' }}>LIVE TRUST ENGINE</span>
                <div style={{ marginLeft: 'auto', width: 6, height: 6, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px rgba(16,185,129,0.6)', animation: 'pulse 2s infinite' }} />
              </div>

              {/* Mock trust gauge */}
              <div style={{ textAlign: 'center', marginBottom: 28 }}>
                <div style={{ fontSize: 72, fontWeight: 700, fontFamily: 'Space Grotesk', color: '#10b981', lineHeight: 1 }}>95</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', marginTop: 4 }}>TRUST SCORE</div>
              </div>

              {/* Status cards */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[
                  { label: 'Decision', value: 'ALLOW', color: '#10b981' },
                  { label: 'Cognitive', value: 'CALM', color: '#3b82f6' },
                  { label: 'Similarity', value: '0.994', color: '#8b5cf6' },
                  { label: 'Drift', value: 'NONE', color: '#10b981' },
                ].map((item, i) => (
                  <div key={i} style={{
                    background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-light)',
                    borderRadius: 8, padding: '10px 12px',
                  }}>
                    <div style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', marginBottom: 3 }}>{item.label}</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: item.color, fontFamily: 'JetBrains Mono' }}>{item.value}</div>
                  </div>
                ))}
              </div>

              {/* Mini sparkline */}
              <svg viewBox="0 0 300 40" style={{ width: '100%', height: 40, marginTop: 16 }}>
                <polyline
                  points="0,20 30,18 60,19 90,17 120,18 150,16 180,18 210,17 240,19 270,18 300,17"
                  stroke="#10b981" strokeWidth="2" fill="none" strokeLinecap="round"
                />
              </svg>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '80px 40px' }}>
        <div style={{ textAlign: 'center', marginBottom: 60 }}>
          <h2 style={{ fontSize: 36, fontWeight: 700, fontFamily: 'Space Grotesk', marginBottom: 12 }}>4-Stage Trust Pipeline</h2>
          <p style={{ fontSize: 16, color: 'var(--text-sub)', maxWidth: 600, margin: '0 auto' }}>
            Every 2 seconds, behavioral telemetry flows through four AI stages to produce a continuous trust verdict.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          {[
            { icon: <Fingerprint size={22} />, title: '384-D Behavioral Embedding', desc: 'MiniLM-L6-v2 transforms behavioral text into semantic fingerprints. Cosine similarity detects identity drift.', color: '#8b5cf6' },
            { icon: <TrendingDown size={22} />, title: 'CUSUM Drift Detection', desc: 'Cumulative sum analysis catches gradual account takeover that single-threshold checks miss entirely.', color: '#f59e0b' },
            { icon: <Brain size={22} />, title: 'Cognitive State Machine', desc: 'Random Forest (96.3% accuracy) classifies: calm → focused → distressed → panicked → coerced | robotic.', color: '#3b82f6' },
            { icon: <Zap size={22} />, title: 'Trust Score T(t)', desc: '0.40×Similarity + 0.20×Device + 0.20×Transaction + 0.20×Cognitive. Velocity and acceleration track deterioration.', color: '#10b981' },
            { icon: <AlertTriangle size={22} />, title: 'Decision Engine', desc: 'ALLOW (T>0.85) | STEP-UP (0.60-0.85) | BLOCK (T<0.60). Override rules for coercion and malware.', color: '#ef4444' },
            { icon: <Eye size={22} />, title: 'Explainability Layer', desc: 'Root cause analysis, incident classification, timeline narratives, and executive summaries for compliance.', color: '#06b6d4' },
          ].map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              style={{
                background: 'var(--bg-panel)', border: '1px solid var(--border-light)',
                borderRadius: 12, padding: 24, transition: 'all 0.2s',
              }}
              whileHover={{ borderColor: 'rgba(16,185,129,0.3)', y: -4 }}
            >
              <div style={{ width: 40, height: 40, borderRadius: 10, background: `${feature.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: feature.color, marginBottom: 16 }}>
                {feature.icon}
              </div>
              <h3 style={{ fontSize: 15, fontWeight: 600, fontFamily: 'Space Grotesk', marginBottom: 8 }}>{feature.title}</h3>
              <p style={{ fontSize: 13, color: 'var(--text-sub)', lineHeight: 1.6 }}>{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ textAlign: 'center', padding: '60px 40px 100px' }}>
        <motion.button
          onClick={() => navigate('/app/monitor')}
          whileHover={{ scale: 1.05, boxShadow: '0 12px 50px rgba(16,185,129,0.4)' }}
          whileTap={{ scale: 0.97 }}
          style={{
            background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none',
            color: 'white', padding: '18px 48px', borderRadius: 12, cursor: 'pointer',
            fontSize: 18, fontWeight: 600, fontFamily: 'Space Grotesk',
            boxShadow: '0 0 40px rgba(16,185,129,0.25)',
            display: 'inline-flex', alignItems: 'center', gap: 10,
          }}
        >
          <Lock size={18} /> Enter Security Operations Center <ArrowRight size={18} />
        </motion.button>
      </section>
    </div>
  )
}

export default LandingPage
