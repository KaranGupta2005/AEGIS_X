import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { motion } from 'motion/react'
import {
  ArrowRight, Shield, Brain, Activity, Fingerprint, Zap, Lock,
  ChevronRight, Sparkles, Layers, Radio, TrendingDown, AlertTriangle,
  CheckCircle, Eye,
} from 'lucide-react'
import CardSwap, { Card } from '../components/CardSwap'
import { Card1, Card2, Card3, Card4, Card5 } from '../components/LandingCards'
import BentoFeatures from '../components/BentoFeatures'
import HowItWorks from '../components/HowItWorks'
import GradientText from '../components/GradientText'
import FlipWords from '../components/FlipWords'
import RippleGrid from '../components/RippleGrid'
import FinalCard from '../components/FinalCard'

const LandingPage: React.FC = () => {
  const navigate = useNavigate()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 24)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  return (
    <div style={{ background: 'var(--bg-page)', minHeight: '100vh', color: 'var(--text-main)', fontFamily: 'Inter, sans-serif', overflowX: 'hidden' }}>

      {/* ── NAVBAR — MediaGuard floating pill (no dropdowns) ── */}
      <motion.nav
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, display: 'flex', justifyContent: 'center', paddingTop: 20 }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', gap: 4,
          backdropFilter: 'blur(16px)', borderRadius: 999, padding: '8px 12px',
          background: scrolled ? 'rgba(10,13,20,0.92)' : 'rgba(10,13,20,0.5)',
          border: scrolled ? '1px solid rgba(16,185,129,0.2)' : '1px solid rgba(255,255,255,0.05)',
          boxShadow: scrolled ? '0 4px 30px rgba(16,185,129,0.1)' : 'none',
          transition: 'all 0.3s',
        }}>
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 999, background: 'transparent', border: 'none', cursor: 'pointer' }}>
            <Shield size={16} color="#10B981" />
            <span style={{ fontSize: 14, fontWeight: 800, color: 'white', fontFamily: 'Space Grotesk', letterSpacing: '-0.02em' }}>
              AEGIS-X<span style={{ color: '#10B981' }}>'26</span>
            </span>
          </button>
          <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />
          {['Pipeline', 'Features', 'Architecture'].map(label => (
            <button key={label} onClick={() => {
              const el = document.getElementById(label.toLowerCase())
              el?.scrollIntoView({ behavior: 'smooth' })
            }} style={{ padding: '6px 14px', fontSize: 11, fontWeight: 600, color: '#94A3B8', borderRadius: 999, background: 'transparent', border: 'none', cursor: 'pointer', transition: 'color 0.2s, background 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'white'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
              onMouseLeave={e => { e.currentTarget.style.color = '#94A3B8'; e.currentTarget.style.background = 'transparent' }}>
              {label}
            </button>
          ))}
          <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={() => navigate('/app/monitor')}
            style={{ marginLeft: 8, padding: '8px 20px', background: '#10B981', color: '#0A0D14', fontSize: 11, fontWeight: 800, borderRadius: 999, border: 'none', cursor: 'pointer', boxShadow: '0 0 20px rgba(16,185,129,0.35)', transition: 'all 0.2s' }}>
            Launch →
          </motion.button>
        </div>
      </motion.nav>

      {/* ── HERO — with RippleGrid + FlipWords ── */}
      <section style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', paddingTop: 80, position: 'relative', overflow: 'hidden' }}>
        <RippleGrid rows={12} cols={26} cellSize={56} />
        <div style={{ position: 'absolute', top: '15%', left: '8%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)', filter: 'blur(40px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '10%', right: '15%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.05) 0%, transparent 70%)', filter: 'blur(40px)', pointerEvents: 'none' }} />

        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 40px', width: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, alignItems: 'center', position: 'relative', zIndex: 1 }}>
          {/* LEFT */}
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: 'easeOut' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 20, padding: '6px 14px', marginBottom: 28 }}>
              <Sparkles size={12} color="#10B981" />
              <span style={{ fontSize: 12, color: '#10B981', fontFamily: 'JetBrains Mono', fontWeight: 500 }}>Cyber Security PSBs Hackathon 2026</span>
            </div>

            <h1 style={{ fontSize: 58, fontWeight: 700, color: 'var(--text-main)', fontFamily: 'Space Grotesk, sans-serif', lineHeight: 1.1, letterSpacing: '-0.03em', margin: '0 0 8px' }}>
              Continuous Trust
            </h1>
            <h1 style={{ fontSize: 58, fontWeight: 700, fontFamily: 'Space Grotesk, sans-serif', lineHeight: 1.1, letterSpacing: '-0.03em', margin: '0 0 24px' }}>
              <FlipWords words={['Infrastructure', 'Authentication', 'Intelligence', 'Protection']} interval={2600} />
            </h1>

            <p style={{ fontSize: 18, color: 'var(--text-sub)', lineHeight: 1.7, margin: '0 0 36px', maxWidth: 520 }}>
              AEGIS-X replaces one-time passwords with a living mathematical system — behavioral embeddings, CUSUM drift detection, and cognitive state analysis that terminate sessions the millisecond they drift.
            </p>

            <div style={{ display: 'flex', gap: 32, marginBottom: 40 }}>
              {[
                { val: '<100ms', label: 'Trust Latency' },
                { val: '96.3%', label: 'Cognitive Accuracy' },
                { val: '384-D', label: 'Embedding Space' },
              ].map((stat, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 + i * 0.1 }}>
                  <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-main)', fontFamily: 'Space Grotesk', lineHeight: 1 }}>{stat.val}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, fontFamily: 'JetBrains Mono' }}>{stat.label}</div>
                </motion.div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
              <motion.button onClick={() => navigate('/app/monitor')} whileHover={{ scale: 1.03, boxShadow: '0 8px 40px rgba(16,185,129,0.4)' }} whileTap={{ scale: 0.98 }}
                style={{ background: 'linear-gradient(135deg, #10B981, #059669)', border: 'none', color: 'white', padding: '14px 28px', borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'Space Grotesk', fontWeight: 600, boxShadow: '0 0 30px rgba(16,185,129,0.3)', fontSize: 15 }}>
                Open Dashboard <ArrowRight size={16} />
              </motion.button>
              <motion.button onClick={() => navigate('/app/incident')} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-sub)', padding: '14px 28px', borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'Space Grotesk', fontWeight: 500, fontSize: 15, transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(16,185,129,0.4)'; e.currentTarget.style.color = '#10B981' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'var(--text-sub)' }}>
                Explore Features <ChevronRight size={16} />
              </motion.button>
            </div>

            <div style={{ display: 'flex', gap: 20, marginTop: 36 }}>
              {['Zero-Day Detection', 'Anti-Coercion', 'Bank-Grade'].map((badge, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <CheckCircle size={12} color="#059669" />
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>{badge}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* RIGHT: CardSwap */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 0.3 }} style={{ position: 'relative', height: 560, display: 'flex', justifyContent: 'center' }}>
            <div style={{ position: 'relative', height: 560, width: '100%' }}>
              <CardSwap width={460} height={340} cardDistance={55} verticalDistance={65} delay={4500} pauseOnHover={true} skewAmount={5}>
                <Card><Card1 /></Card>
                <Card><Card2 /></Card>
                <Card><Card3 /></Card>
                <Card><Card4 /></Card>
                <Card><Card5 /></Card>
              </CardSwap>
            </div>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <div style={{ position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, zIndex: 1 }}>
          <span style={{ fontSize: 10, color: '#9CA3AF', letterSpacing: '0.12em', fontFamily: 'JetBrains Mono' }}>SCROLL TO EXPLORE</span>
          <motion.div animate={{ y: [0, 6, 0] }} transition={{ repeat: Infinity, duration: 1.8 }} style={{ width: 1, height: 30, background: 'linear-gradient(to bottom, rgba(16,185,129,0.5), transparent)' }} />
        </div>
      </section>

      {/* ── BENTO FEATURES ── */}
      <section id="features" style={{ padding: '40px 0', background: 'var(--bg-panel, #12151E)' }}>
        <BentoFeatures />
      </section>

      {/* ── HOW IT WORKS — Stepper ── */}
      <section id="pipeline" style={{ padding: '80px 40px', background: 'var(--bg-page)' }}>
        <HowItWorks />
      </section>

      {/* ── CTA SECTION — MediaGuard light-card style ── */}
      <section id="architecture" style={{ padding: '80px 40px', position: 'relative' }}>
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          style={{
            maxWidth: 800, margin: '0 auto', borderRadius: 28, overflow: 'hidden',
            background: 'linear-gradient(180deg, #f0fdf9 0%, #ecfdf5 40%, #f8fafc 100%)',
            padding: '64px 48px', textAlign: 'center', position: 'relative',
            boxShadow: '0 20px 80px rgba(0,0,0,0.15)',
          }}
        >
          {/* Grid pattern background */}
          <div style={{ position: 'absolute', inset: 0, opacity: 0.4, backgroundImage: 'linear-gradient(rgba(16,185,129,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,0.08) 1px, transparent 1px)', backgroundSize: '40px 40px', pointerEvents: 'none' }} />
          {/* Large watermark */}
          <div style={{ position: 'absolute', bottom: -20, right: -10, fontSize: 180, fontWeight: 900, color: 'rgba(16,185,129,0.04)', fontFamily: 'Space Grotesk', lineHeight: 1, pointerEvents: 'none' }}>AI</div>

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 999, padding: '6px 16px', marginBottom: 24 }}>
              <Zap size={12} color="#059669" />
              <span style={{ fontSize: 10, fontWeight: 700, color: '#059669', letterSpacing: '0.15em', fontFamily: 'JetBrains Mono' }}>READY TO DEPLOY</span>
            </div>

            <h2 style={{ fontSize: 48, fontWeight: 800, color: '#0F172A', fontFamily: 'Space Grotesk', letterSpacing: '-0.03em', margin: '0 0 4px', lineHeight: 1.1 }}>
              Deploy the Engine.
            </h2>
            <h2 style={{ fontSize: 48, fontWeight: 800, color: '#059669', fontFamily: 'Space Grotesk', letterSpacing: '-0.03em', margin: '0 0 20px', lineHeight: 1.1 }}>
              Protect Your Users.
            </h2>

            <p style={{ fontSize: 16, color: '#475569', lineHeight: 1.7, maxWidth: 520, margin: '0 auto 36px' }}>
              One WebSocket connection. Full trust pipeline every 2 seconds — detect, classify, decide, and explain — while you watch the results stream live on the command center dashboard.
            </p>

            <motion.button
              onClick={() => navigate('/app/monitor')}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '16px 32px', borderRadius: 999,
                background: '#0F172A', color: 'white',
                fontSize: 14, fontWeight: 700, fontFamily: 'Space Grotesk',
                border: 'none', cursor: 'pointer',
                boxShadow: '0 8px 30px rgba(15,23,42,0.25)',
                transition: 'all 0.2s',
              }}
            >
              <Shield size={15} /> Initialize Command Center <ArrowRight size={15} />
            </motion.button>

            <p style={{ fontSize: 9, color: '#94A3B8', fontFamily: 'JetBrains Mono', letterSpacing: '0.15em', marginTop: 28 }}>
              CYBER SECURITY PSBs HACKATHON 2026 · DFS & IBA · CENTRAL BANK OF INDIA
            </p>
          </div>
        </motion.div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: '1px solid var(--border-light)', padding: '30px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Shield size={16} color="#10B981" />
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-main)', fontFamily: 'Space Grotesk' }}>AEGIS-X</span>
          <span style={{ fontSize: 12, color: '#64748B' }}>· Continuous Trust Infrastructure</span>
        </div>
        <div style={{ display: 'flex', gap: 24 }}>
          {['DFS & IBA Initiative', 'Central Bank of India', 'MNNIT Allahabad'].map((item, i) => (
            <span key={i} style={{ fontSize: 12, color: '#64748B', cursor: 'pointer', transition: 'color 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-sub)')}
              onMouseLeave={e => (e.currentTarget.style.color = '#64748B')}>
              {item}
            </span>
          ))}
        </div>
      </footer>
    </div>
  )
}

export default LandingPage
