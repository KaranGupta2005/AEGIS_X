import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { motion } from 'motion/react'
import {
  ArrowRight, Shield, Radio,
  ChevronRight, Sparkles, CheckCircle, Sun, Moon,
} from 'lucide-react'
import CardSwap, { Card } from '../components/CardSwap'
import { Card1, Card2, Card3, Card4, Card5 } from '../components/LandingCards'
import BentoFeatures from '../components/BentoFeatures'
import HowItWorks from '../components/HowItWorks'
import GradientText from '../components/GradientText'
import FlipWords from '../components/FlipWords'
import RippleGrid from '../components/RippleGrid'
import TrustDonut from '../components/TrustDonut'
import MagicRings from '../components/MagicRings'
import { isAuthenticated, getUsername } from '../../services/auth'

const LandingPage: React.FC = () => {
  const navigate = useNavigate()
  const [scrolled, setScrolled] = useState(false)
  const [isDark, setIsDark] = useState(true)

  useEffect(() => {
    // Force dark theme on landing page
    const prev = document.documentElement.getAttribute('data-theme')
    document.documentElement.setAttribute('data-theme', 'dark')
    return () => {
      // Restore user's chosen theme when leaving
      const saved = localStorage.getItem('aegisx-theme') || 'light'
      document.documentElement.setAttribute('data-theme', saved)
    }
  }, [])

  const toggleTheme = () => {
    const next = isDark ? 'light' : 'dark'
    setIsDark(!isDark)
    document.documentElement.setAttribute('data-theme', next)
    localStorage.setItem('aegisx-theme', next)
  }

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 24)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  return (
    <div style={{ background: 'var(--bg-page)', minHeight: '100vh', color: 'var(--text-main)', fontFamily: 'Inter, sans-serif', overflowX: 'hidden', position: 'relative' }}>
      {/* MagicRings — WebGL shader rings follow cursor on landing page */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <MagicRings
          color="#10B981"
          colorTwo="#06B6D4"
          ringCount={6}
          speed={0.8}
          attenuation={12}
          lineThickness={1.8}
          baseRadius={0.3}
          radiusStep={0.09}
          scaleRate={0.08}
          opacity={0.7}
          noiseAmount={0.05}
          rotation={0}
          ringGap={1.5}
          fadeIn={0.7}
          fadeOut={0.5}
          followMouse={true}
          mouseInfluence={0.25}
          hoverScale={1.15}
          parallax={0.04}
          clickBurst={true}
        />
      </div>

      {/* ── NAVBAR — MediaGuard floating pill (no dropdowns) ── */}
      <motion.nav
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, display: 'flex', justifyContent: 'center', paddingTop: 20, pointerEvents: 'none' }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', gap: 4, pointerEvents: 'auto',
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
          <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />
          <button onClick={toggleTheme} title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            style={{ width: 32, height: 32, borderRadius: 999, border: 'none', background: 'rgba(255,255,255,0.06)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}>
            {isDark ? <Sun size={14} color="#F59E0B" /> : <Moon size={14} color="#94A3B8" />}
          </button>
          {isAuthenticated() ? (
            <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={() => navigate('/app/monitor')}
              style={{ marginLeft: 4, padding: '8px 20px', background: '#10B981', color: '#0A0D14', fontSize: 11, fontWeight: 800, borderRadius: 999, border: 'none', cursor: 'pointer', boxShadow: '0 0 20px rgba(16,185,129,0.35)', transition: 'all 0.2s' }}>
              Dashboard →
            </motion.button>
          ) : (
            <>
              <button onClick={() => navigate('/login')}
                style={{ padding: '6px 14px', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.7)', borderRadius: 999, background: 'transparent', border: 'none', cursor: 'pointer', transition: 'color 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'white')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}>
                Login
              </button>
              <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={() => navigate('/register')}
                style={{ padding: '8px 18px', background: '#10B981', color: '#0A0D14', fontSize: 11, fontWeight: 800, borderRadius: 999, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, boxShadow: '0 0 20px rgba(16,185,129,0.35)', transition: 'all 0.2s' }}>
                Create Account <ArrowRight size={12} />
              </motion.button>
            </>
          )}
        </div>
      </motion.nav>

      {/* ── HERO — with RippleGrid + FlipWords ── */}
      <section style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', paddingTop: 80, position: 'relative', overflow: 'hidden', zIndex: 1 }}>
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
              <motion.button onClick={() => navigate(isAuthenticated() ? '/app/monitor' : '/register')} whileHover={{ scale: 1.03, boxShadow: '0 8px 40px rgba(16,185,129,0.4)' }} whileTap={{ scale: 0.98 }}
                style={{ background: 'linear-gradient(135deg, #10B981, #059669)', border: 'none', color: 'white', padding: '14px 28px', borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'Space Grotesk', fontWeight: 600, boxShadow: '0 0 30px rgba(16,185,129,0.3)', fontSize: 15 }}>
                {isAuthenticated() ? 'Open Dashboard' : 'Get Started'} <ArrowRight size={16} />
              </motion.button>
              <motion.button onClick={() => navigate(isAuthenticated() ? '/app/incident' : '/login')} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-sub)', padding: '14px 28px', borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'Space Grotesk', fontWeight: 500, fontSize: 15, transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(16,185,129,0.4)'; e.currentTarget.style.color = '#10B981' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'var(--text-sub)' }}>
                {isAuthenticated() ? 'Explore Features' : 'Sign In'} <ChevronRight size={16} />
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
      <section id="features" style={{ padding: '40px 0', background: 'var(--bg-panel, #12151E)', position: 'relative', zIndex: 1 }}>
        <BentoFeatures />
      </section>

      {/* ── HOW IT WORKS — Stepper + Donut Chart ── */}
      <section id="pipeline" style={{ padding: '80px 40px', background: 'var(--bg-page)', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 440px', gap: 0, maxWidth: 1360, margin: '0 auto', alignItems: 'start' }}>
          <HowItWorks />
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            style={{ position: 'sticky', top: 100, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 60 }}
          >
            <TrustDonut />
          </motion.div>
        </div>
      </section>

      {/* ── INTERACTIVE DEMO — NxtDevs ChallengeTeaser style ── */}
      <section id="architecture" style={{ padding: '96px 24px', position: 'relative', overflow: 'hidden', background: 'rgba(0,0,0,0.3)', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)', zIndex: 1 }}>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 500, height: 500, background: 'rgba(16,185,129,0.06)', borderRadius: '50%', filter: 'blur(120px)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 999, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', marginBottom: 24 }}>
              <Radio size={14} color="#10B981" />
              <span style={{ fontSize: 12, fontWeight: 700, color: '#10B981', fontFamily: 'JetBrains Mono' }}>Live Pipeline</span>
            </div>
            <h2 style={{ fontSize: 44, fontWeight: 700, color: 'var(--text-main)', fontFamily: 'Space Grotesk', letterSpacing: '-0.03em', lineHeight: 1.1, margin: '0 0 20px' }}>
              Don't just block.<br />
              <GradientText colors={['#10B981','#06B6D4','#3B82F6','#10B981']} animationSpeed={6}>Understand why.</GradientText>
            </h2>
            <p style={{ fontSize: 16, color: 'var(--text-sub)', lineHeight: 1.7, maxWidth: 440, margin: '0 0 24px' }}>
              Most fraud systems say "blocked." AEGIS-X explains <em style={{ color: 'var(--text-main)' }}>why</em> — cognitive state, drift trajectory, root causes — so compliance teams trust the decision.
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>Try the scenario →</p>
          </div>

          {/* Interactive Card */}
          <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
            style={{ background: 'rgba(10,13,20,0.8)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 28, position: 'relative', overflow: 'hidden', backdropFilter: 'blur(8px)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <span style={{ fontSize: 10, fontFamily: 'JetBrains Mono', color: 'rgba(255,255,255,0.35)' }}>behavioral_event.json</span>
              <div style={{ display: 'flex', gap: 5 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(239,68,68,0.4)' }} />
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(245,158,11,0.4)' }} />
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(16,185,129,0.4)' }} />
              </div>
            </div>
            <pre style={{ fontFamily: 'JetBrains Mono', fontSize: 11, lineHeight: 1.8, color: '#C4B5FD', background: 'rgba(0,0,0,0.4)', padding: 16, borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)', margin: '0 0 20px', whiteSpace: 'pre-wrap' }}>{`{
  "typing_speed_cps": 1.2,
  "hesitation_ratio": 0.72,
  "correction_rate": 0.45,
  "gyroscope_variance": 0.065,
  "swipe_straightness": 0.42
}`}</pre>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-main)', marginBottom: 14 }}>What should the system decide?</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ padding: '14px 16px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.06)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}>
                <span style={{ fontFamily: 'JetBrains Mono', fontSize: 13, color: 'var(--text-sub)' }}>ALLOW — User is fine</span>
              </div>
              <div style={{ padding: '14px 16px', borderRadius: 10, border: '1px solid rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: 'JetBrains Mono', fontSize: 13, color: '#10B981', fontWeight: 600 }}>BLOCK — Coercion detected</span>
                <CheckCircle size={16} color="#10B981" />
              </div>
            </div>
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} transition={{ delay: 0.5, duration: 0.4 }}
              style={{ marginTop: 14, padding: 14, borderRadius: 10, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#10B981', margin: '0 0 4px' }}>Correct — BLOCK</p>
              <p style={{ fontSize: 11, color: 'var(--text-sub)', margin: 0, lineHeight: 1.6 }}>
                Hesitation ratio 0.72 + correction rate 0.45 + device shake 0.065 → Cognitive state: COERCED. Trust Score: 0.38. Decision Engine blocks transaction and alerts fraud team.
              </p>
            </motion.div>
          </motion.div>
        </div>
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
