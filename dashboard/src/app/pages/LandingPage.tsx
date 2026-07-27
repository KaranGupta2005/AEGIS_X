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
import { DotLottieReact } from '@lottiefiles/dotlottie-react'
import cyberLottie from '../../assets/Cyber Security.lottie'
import dataSecurityLottie from '../../assets/data security.lottie'
import securityLottie from '../../assets/security.lottie'
import digitalPersonLottie from '../../assets/Digital Security Person.lottie'
import atmCardLottie from '../../assets/Insert ATM Card Animation _ Mobile Payment Ready.lottie'
import creditActivationLottie from '../../assets/Credit Activation  Fintech UI Animation.lottie'



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
      {/* ── NAVBAR — Full Width Layout (White Background) ── */}
      <motion.nav
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
          display: 'flex', justifyContent: 'center',
          paddingTop: 0, pointerEvents: 'none',
          background: '#ffffff', // Solid white navbar background
          borderBottom: '1px solid rgba(0,0,0,0.12)',
        }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          width: '100%', maxWidth: 1600, pointerEvents: 'auto',
          padding: '16px 32px',
        }}>
          {/* Left: Logo */}
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>
            <Shield size={22} color="#3B82F6" />
            <span style={{ fontSize: 18, fontWeight: 800, color: '#111827', fontFamily: 'Space Grotesk', letterSpacing: '-0.02em' }}>
              AEGIS-X<span style={{ color: '#3B82F6' }}>'26</span>
            </span>
          </button>

          {/* Center: Links */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            {['Pipeline', 'Features', 'Architecture'].map(label => (
              <button key={label} onClick={() => {
                const el = document.getElementById(label.toLowerCase())
                el?.scrollIntoView({ behavior: 'smooth' })
              }} style={{ padding: '6px 0', fontSize: 14, fontWeight: 600, color: '#4B5563', background: 'transparent', border: 'none', cursor: 'pointer', transition: 'color 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#111827' }}
                onMouseLeave={e => { e.currentTarget.style.color = '#4B5563' }}>
                {label}
              </button>
            ))}
          </div>

          {/* Right: Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button onClick={toggleTheme} title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              style={{ width: 36, height: 36, borderRadius: 999, border: 'none', background: 'rgba(0,0,0,0.04)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.08)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.04)' }}>
              {isDark ? <Sun size={16} color="#F59E0B" /> : <Moon size={16} color="#4B5563" />}
            </button>

            {isAuthenticated() ? (
              <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={() => navigate('/app/monitor')}
                style={{ padding: '10px 24px', background: '#3B82F6', color: '#ffffff', fontSize: 13, fontWeight: 800, borderRadius: 999, border: 'none', cursor: 'pointer', boxShadow: '0 4px 14px rgba(59,130,246,0.35)', transition: 'all 0.2s' }}>
                Dashboard →
              </motion.button>
            ) : (
              <>
                <button onClick={() => navigate('/login')}
                  style={{ padding: '8px 16px', fontSize: 13, fontWeight: 700, color: '#4B5563', background: 'transparent', border: 'none', cursor: 'pointer', transition: 'color 0.2s' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#111827')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#4B5563')}>
                  Login
                </button>
                <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={() => navigate('/register')}
                  style={{ padding: '10px 24px', background: '#3B82F6', color: '#ffffff', fontSize: 13, fontWeight: 800, borderRadius: 999, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 4px 14px rgba(59,130,246,0.35)', transition: 'all 0.2s' }}>
                  Create Account <ArrowRight size={14} />
                </motion.button>
              </>
            )}
          </div>
        </div>
      </motion.nav>

      {/* ── HERO — Solid Rounded Blue Container Style ── */}
      <section style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 100, paddingBottom: 24, paddingLeft: 24, paddingRight: 24, position: 'relative', overflow: 'hidden', zIndex: 1, background: '#ffffff' }}>

        <div style={{
          width: '100%',
          maxWidth: '100%',
          background: '#3B82F6', // Deep blue to match image
          borderRadius: 32,
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(59, 130, 246, 0.25)',
          minHeight: 'calc(100vh - 124px)'
        }}>
          {/* Overlay RippleGrid for subtle background texture inside the blue box */}
          <div style={{ position: 'absolute', inset: 0, opacity: 0.15, pointerEvents: 'none' }}>
            <RippleGrid rows={12} cols={26} cellSize={56} />
          </div>

          <div style={{ flex: 1, padding: '60px 40px 20px', display: 'grid', gridTemplateColumns: '1.2fr auto 1fr', gap: 32, alignItems: 'center', position: 'relative', zIndex: 1 }}>
            {/* LEFT */}
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: 'easeOut' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.15)', borderRadius: 20, padding: '6px 14px', marginBottom: 28 }}>
                <Sparkles size={12} color="#fff" />
                <span style={{ fontSize: 12, color: '#fff', fontFamily: 'JetBrains Mono', fontWeight: 500 }}>Cyber Security PSBs Hackathon 2026</span>
              </div>

              <h1 style={{ fontSize: 58, fontWeight: 700, color: '#fff', fontFamily: 'Space Grotesk, sans-serif', lineHeight: 1.1, letterSpacing: '-0.03em', margin: '0 0 8px' }}>
                Continuous Trust
              </h1>
              <h1 style={{ fontSize: 58, fontWeight: 700, color: '#fff', fontFamily: 'Space Grotesk, sans-serif', lineHeight: 1.1, letterSpacing: '-0.03em', margin: '0 0 24px' }}>
                <FlipWords words={['Infrastructure', 'Authentication', 'Intelligence', 'Protection']} interval={2600} />
              </h1>

              <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.9)', lineHeight: 1.7, margin: '0 0 36px', maxWidth: 520 }}>
                AEGIS-X replaces one-time passwords with a living mathematical system — behavioral embeddings, CUSUM drift detection, and cognitive state analysis that terminate sessions the millisecond they drift.
              </p>

              {/* Input + CTA matching the image's pill shape */}
              <div style={{ display: 'flex', gap: 0, alignItems: 'center', background: '#fff', padding: 6, borderRadius: 999, width: 'fit-content', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
                <input type="email" placeholder="Enter your e-mail" style={{ background: 'transparent', border: 'none', outline: 'none', color: '#111827', padding: '0 20px', fontSize: 15, width: 240, fontFamily: 'Inter' }} />
                <motion.button onClick={() => navigate(isAuthenticated() ? '/app/monitor' : '/register')} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  style={{ background: '#3B82F6', border: 'none', color: '#fff', padding: '14px 28px', borderRadius: 999, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'Space Grotesk', fontWeight: 600, fontSize: 15 }}>
                  {isAuthenticated() ? 'Open Dashboard' : 'Get Started'} <ArrowRight size={16} />
                </motion.button>
              </div>
            </motion.div>

            {/* MIDDLE: Lottie Animations Grid */}
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2, duration: 0.8 }}
              style={{ display: 'grid', gridTemplateColumns: '340px 270px', gridTemplateRows: '270px 270px', gap: 24, placeItems: 'stretch', alignSelf: 'center' }}>

              {/* Left Tall: security.lottie */}
              <div style={{ gridColumn: '1', gridRow: '1 / span 2', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 32, padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}>
                <DotLottieReact src={securityLottie} loop autoplay style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>

              {/* Right Top: data security.lottie */}
              <div style={{ gridColumn: '2', gridRow: '1', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 20px rgba(0,0,0,0.1)' }}>
                <DotLottieReact src={dataSecurityLottie} loop autoplay style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>

              {/* Right Bottom: Cyber Security.lottie */}
              <div style={{ gridColumn: '2', gridRow: '2', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 20px rgba(0,0,0,0.1)' }}>
                <DotLottieReact src={cyberLottie} loop autoplay style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>

            </motion.div>

            {/* RIGHT: CardSwap (Preserved completely) */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 0.3 }} style={{ position: 'relative', height: 560, display: 'flex', justifyContent: 'center', transform: 'scale(1.05)' }}>
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

          {/* Bottom Bar Features (Inside container, matching image bottom row layout) */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 60px', borderTop: '1px solid rgba(255,255,255,0.15)', position: 'relative', zIndex: 1, background: 'rgba(0,0,0,0.05)' }}>
            {[
              { val: '<100ms', label: 'Trust Latency', badge: 'Zero-Day Detection', icon: Shield },
              { val: '96.3%', label: 'Cognitive Accuracy', badge: 'Anti-Coercion', icon: CheckCircle },
              { val: '384-D', label: 'Embedding Space', badge: 'Bank-Grade', icon: Radio },
            ].map((stat, i) => {
              const Icon = stat.icon;
              return (
                <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 + i * 0.1 }} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={22} color="#fff" />
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: '#fff', fontFamily: 'Space Grotesk' }}>{stat.badge}</div>
                    <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2, fontFamily: 'Inter' }}>{stat.label}: <span style={{ fontWeight: 700, color: '#fff' }}>{stat.val}</span></div>
                  </div>
                </motion.div>
              )
            })}
          </div>

        </div>
      </section>

      {/* ── BENTO FEATURES ── */}
      <section id="features" style={{ padding: '40px 0', background: '#ffffff', position: 'relative', zIndex: 1, overflow: 'hidden' }}>
        {/* Left Side: Digital Security Person Lottie (Absolutely positioned) */}
        <motion.div initial={{ opacity: 0, x: -50 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 1 }} 
          style={{ position: 'absolute', left: '-18vw', top: '55%', transform: 'translateY(-50%)', width: '65%', maxWidth: '1000px', pointerEvents: 'none', zIndex: 0 }}>
          <DotLottieReact src={digitalPersonLottie} loop autoplay style={{ width: '100%', height: 'auto' }} />
        </motion.div>

        {/* Bento Grid */}
        <div style={{ position: 'relative', zIndex: 10 }}>
          <BentoFeatures />
        </div>
      </section>

      {/* ── HOW IT WORKS — Stepper + Donut Chart ── */}
      <section id="pipeline" style={{ padding: '80px 40px', background: '#ffffff', position: 'relative', zIndex: 1, overflow: 'hidden' }}>
        {/* Top Right ATM Card Lottie */}
        <motion.div initial={{ opacity: 0, y: -20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }} 
          style={{ position: 'absolute', top: 20, right: 60, width: '380px', pointerEvents: 'none', zIndex: 0 }}>
          <DotLottieReact src={atmCardLottie} loop autoplay style={{ width: '100%', height: 'auto' }} />
        </motion.div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 440px', gap: 0, maxWidth: 1360, margin: '0 auto', alignItems: 'start', position: 'relative', zIndex: 10 }}>
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
      <section id="architecture" style={{ padding: '96px 24px', position: 'relative', overflow: 'hidden', background: '#f8fafc', borderTop: '1px solid rgba(0,0,0,0.05)', borderBottom: '1px solid rgba(0,0,0,0.05)', zIndex: 1 }}>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 500, height: 500, background: 'rgba(16,185,129,0.06)', borderRadius: '50%', filter: 'blur(120px)', pointerEvents: 'none' }} />
        
        {/* Bottom Right Credit Activation Lottie */}
        <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }} 
          style={{ position: 'absolute', bottom: -10, right: -60, width: '500px', pointerEvents: 'none', zIndex: 0 }}>
          <DotLottieReact src={creditActivationLottie} loop autoplay style={{ width: '100%', height: 'auto' }} />
        </motion.div>

        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center', position: 'relative', zIndex: 10 }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 999, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', marginBottom: 24 }}>
              <Radio size={14} color="#10B981" />
              <span style={{ fontSize: 12, fontWeight: 700, color: '#10B981', fontFamily: 'JetBrains Mono' }}>Live Pipeline</span>
            </div>
            <h2 style={{ fontSize: 44, fontWeight: 700, color: '#111827', fontFamily: 'Space Grotesk', letterSpacing: '-0.03em', lineHeight: 1.1, margin: '0 0 20px' }}>
              Don't just block.<br />
              <GradientText colors={['#10B981', '#06B6D4', '#3B82F6', '#10B981']} animationSpeed={6}>Understand why.</GradientText>
            </h2>
            <p style={{ fontSize: 16, color: '#4B5563', lineHeight: 1.7, maxWidth: 440, margin: '0 0 24px' }}>
              Most fraud systems say "blocked." AEGIS-X explains <em style={{ color: '#111827' }}>why</em> — cognitive state, drift trajectory, root causes — so compliance teams trust the decision.
            </p>
            <p style={{ fontSize: 12, color: '#9CA3AF', fontFamily: 'JetBrains Mono' }}>Try the scenario →</p>
          </div>

          {/* Interactive Card */}
          <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
            style={{ background: '#3B82F6', boxShadow: '0 25px 50px -12px rgba(59, 130, 246, 0.3)', border: 'none', borderRadius: 16, padding: 28, position: 'relative', overflow: 'hidden', backdropFilter: 'blur(8px)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <span style={{ fontSize: 10, fontFamily: 'JetBrains Mono', color: '#ffffff' }}>behavioral_event.json</span>
              <div style={{ display: 'flex', gap: 5 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(239,68,68,0.4)' }} />
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(245,158,11,0.4)' }} />
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(16,185,129,0.4)' }} />
              </div>
            </div>
            <pre style={{ fontFamily: 'JetBrains Mono', fontSize: 11, lineHeight: 1.8, color: '#1E3A8A', background: '#ffffff', padding: 16, borderRadius: 10, border: 'none', margin: '0 0 20px', whiteSpace: 'pre-wrap' }}>{`{
  "typing_speed_cps": 1.2,
  "hesitation_ratio": 0.72,
  "correction_rate": 0.45,
  "gyroscope_variance": 0.065,
  "swipe_straightness": 0.42
}`}</pre>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#ffffff', marginBottom: 14 }}>What should the system decide?</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ padding: '14px 16px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.1)', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.06)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)' }}>
                <span style={{ fontFamily: 'JetBrains Mono', fontSize: 13, color: '#ffffff' }}>ALLOW — User is fine</span>
              </div>
              <div style={{ padding: '14px 16px', borderRadius: 10, border: 'none', background: '#ffffff', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: 'JetBrains Mono', fontSize: 13, color: '#10B981', fontWeight: 600 }}>BLOCK — Coercion detected</span>
                <CheckCircle size={16} color="#10B981" />
              </div>
            </div>
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} transition={{ delay: 0.5, duration: 0.4 }}
              style={{ marginTop: 14, padding: 14, borderRadius: 10, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#6EE7B7', margin: '0 0 4px' }}>Correct — BLOCK</p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.9)', margin: 0, lineHeight: 1.6 }}>
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
