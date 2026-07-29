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



// ─── NAV ITEM WITH HOVER DROPDOWN ────────────────────────────────────────────

function NavItem({ label, items }: { label: string; items: { title: string; desc: string; href: string }[] }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ position: 'relative' }} onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button style={{
        padding: '8px 14px', fontSize: 14, fontWeight: 600, color: open ? '#111827' : '#4B5563',
        background: open ? 'rgba(0,0,0,0.03)' : 'transparent',
        border: 'none', cursor: 'pointer', borderRadius: 8, transition: 'all 0.15s',
        display: 'flex', alignItems: 'center', gap: 4,
      }}>
        {label}
        <motion.span animate={{ rotate: open ? 180 : 0 }} style={{ fontSize: 10, opacity: 0.5 }}>▾</motion.span>
      </button>

      {/* Dropdown */}
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 8, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.15 }}
          style={{
            position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
            marginTop: 8, width: 300, padding: 8,
            background: 'white', borderRadius: 14,
            border: '1px solid rgba(0,0,0,0.08)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.06)',
          }}
        >
          {items.map((item, i) => (
            <a key={i} href={item.href} onClick={(e) => { e.preventDefault(); document.querySelector(item.href)?.scrollIntoView({ behavior: 'smooth' }); setOpen(false) }}
              style={{
                display: 'block', padding: '10px 14px', borderRadius: 10,
                textDecoration: 'none', transition: 'background 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(59,130,246,0.04)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', fontFamily: 'Space Grotesk', marginBottom: 2 }}>{item.title}</div>
              <div style={{ fontSize: 11, color: '#6B7280', lineHeight: 1.4 }}>{item.desc}</div>
            </a>
          ))}
        </motion.div>
      )}
    </div>
  )
}

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
      {/* ── NAVBAR — Glassmorphic with hover mega-menu ── */}
      <motion.nav
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
          display: 'flex', justifyContent: 'center',
          background: scrolled ? 'rgba(248,250,255,0.92)' : 'rgba(248,250,255,0.98)',
          backdropFilter: scrolled ? 'blur(16px)' : 'none',
          borderBottom: scrolled ? '1px solid rgba(37,99,235,0.08)' : '1px solid rgba(37,99,235,0.06)',
          transition: 'all 0.3s ease',
        }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          width: '100%', maxWidth: 1400,
          padding: scrolled ? '12px 32px' : '16px 32px',
          transition: 'padding 0.3s ease',
        }}>
          {/* Left: Logo */}
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(37,99,235,0.3)' }}>
              <Shield size={16} color="white" />
            </div>
            <span style={{ fontSize: 18, fontWeight: 800, color: '#0f2044', fontFamily: 'Space Grotesk', letterSpacing: '-0.02em' }}>
              AEGIS-X<span style={{ color: '#2563eb', fontSize: 13 }}>'26</span>
            </span>
          </button>

          {/* Center: Nav items with hover dropdowns */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <NavItem label="Product" items={[
              { title: 'Trust Engine', desc: 'Continuous behavioral trust computation', href: '#pipeline' },
              { title: 'Adaptive Verification', desc: 'Voice & face biometric challenges', href: '#features' },
              { title: 'Security Sandbox', desc: 'Deception & containment for threats', href: '#architecture' },
            ]} />
            <NavItem label="Technology" items={[
              { title: 'Behavioral SDK', desc: 'Continuous monitoring from app launch', href: '#pipeline' },
              { title: 'AI Models', desc: 'MiniLM, ECAPA-TDNN, InsightFace, MediaPipe', href: '#features' },
              { title: 'Trust Fusion', desc: 'Bayesian evidence-based trust scoring', href: '#architecture' },
            ]} />
            <NavItem label="Use Cases" items={[
              { title: 'Digital Arrest Prevention', desc: 'Detect social engineering in real-time', href: '#features' },
              { title: 'Malware Detection', desc: 'Identify remote access bots instantly', href: '#features' },
              { title: 'Account Takeover', desc: 'Behavioral identity mismatch detection', href: '#features' },
            ]} />
            <button onClick={() => document.getElementById('architecture')?.scrollIntoView({ behavior: 'smooth' })}
              style={{ padding: '8px 14px', fontSize: 14, fontWeight: 600, color: '#475569', background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: 8, transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#1e3a5f'; e.currentTarget.style.background = 'rgba(37,99,235,0.04)' }}
              onMouseLeave={e => { e.currentTarget.style.color = '#475569'; e.currentTarget.style.background = 'transparent' }}>
              Architecture
            </button>
          </div>

          {/* Right: Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {isAuthenticated() ? (
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => navigate('/app/demo')}
                style={{ padding: '10px 22px', background: 'linear-gradient(135deg, #3B82F6, #2563EB)', color: '#ffffff', fontSize: 13, fontWeight: 700, borderRadius: 10, border: 'none', cursor: 'pointer', boxShadow: '0 4px 14px rgba(59,130,246,0.3)', display: 'flex', alignItems: 'center', gap: 6 }}>
                Dashboard <ArrowRight size={14} />
              </motion.button>
            ) : (
              <>
                <button onClick={() => navigate('/login')}
                  style={{ padding: '8px 16px', fontSize: 13, fontWeight: 600, color: '#4B5563', background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: 8, transition: 'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#111827'; e.currentTarget.style.background = 'rgba(0,0,0,0.03)' }}
                  onMouseLeave={e => { e.currentTarget.style.color = '#4B5563'; e.currentTarget.style.background = 'transparent' }}>
                  Sign In
                </button>
                <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => navigate('/register')}
                  style={{ padding: '10px 22px', background: 'linear-gradient(135deg, #3B82F6, #2563EB)', color: '#ffffff', fontSize: 13, fontWeight: 700, borderRadius: 10, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 4px 14px rgba(59,130,246,0.3)' }}>
                  Get Started <ArrowRight size={14} />
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
          background: 'linear-gradient(145deg, #0f172a 0%, #1e3a8a 35%, #1d4ed8 65%, #2563eb 100%)',
          borderRadius: 32,
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 60px -12px rgba(15, 23, 42, 0.6), inset 0 1px 0 rgba(255,255,255,0.05)',
          minHeight: 'calc(100vh - 124px)',
          border: '1px solid rgba(96,165,250,0.1)',
        }}>
          {/* Ambient glow orbs — cyan, indigo, sky */}
          <div style={{ position: 'absolute', top: '-15%', right: '5%', width: 450, height: 450, borderRadius: '50%', background: 'radial-gradient(circle, rgba(6,182,212,0.12) 0%, transparent 65%)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: '-10%', left: '0%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 65%)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', top: '50%', left: '50%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(56,189,248,0.06) 0%, transparent 60%)', transform: 'translate(-50%,-50%)', pointerEvents: 'none' }} />
          {/* Overlay RippleGrid — interactive grid with subtle glow on click */}
          <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
            <RippleGrid rows={14} cols={28} cellSize={52} color="147,197,253" />
          </div>

          <div style={{ flex: 1, padding: '60px 40px 20px', display: 'grid', gridTemplateColumns: '1fr 1.4fr 1fr', gap: 24, alignItems: 'center', position: 'relative', zIndex: 2, pointerEvents: 'none' }}>
            {/* LEFT */}
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: 'easeOut' }} style={{ pointerEvents: 'auto' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.15)', borderRadius: 20, padding: '6px 14px', marginBottom: 28 }}>
                <Sparkles size={12} color="#fff" />
                <span style={{ fontSize: 12, color: '#fff', fontFamily: 'JetBrains Mono', fontWeight: 500 }}>Cyber Security PSBs Hackathon 2026</span>
              </div>

              <h1 style={{ fontSize: 'clamp(32px, 4vw, 58px)', fontWeight: 700, color: '#fff', fontFamily: 'Space Grotesk, sans-serif', lineHeight: 1.1, letterSpacing: '-0.03em', margin: '0 0 8px' }}>
                Continuous Trust
              </h1>
              <h1 style={{ fontSize: 'clamp(32px, 4vw, 58px)', fontWeight: 700, color: '#fff', fontFamily: 'Space Grotesk, sans-serif', lineHeight: 1.1, letterSpacing: '-0.03em', margin: '0 0 24px' }}>
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
              style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gridTemplateRows: '1fr 1fr', gap: 16, alignSelf: 'center', height: '100%', maxHeight: 520, pointerEvents: 'auto' }}>

              {/* Left Tall: security.lottie */}
              <div style={{ gridColumn: '1', gridRow: '1 / span 2', background: 'var(--accent-dim)', border: '1px solid var(--border-medium)', borderRadius: 24, padding: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}>
                <DotLottieReact src={securityLottie} loop autoplay style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>

              {/* Right Top: data security.lottie */}
              <div style={{ gridColumn: '2', gridRow: '1', background: 'var(--accent-dim)', border: '1px solid var(--border-medium)', borderRadius: 20, padding: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 20px rgba(0,0,0,0.1)' }}>
                <DotLottieReact src={dataSecurityLottie} loop autoplay style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>

              {/* Right Bottom: Cyber Security.lottie */}
              <div style={{ gridColumn: '2', gridRow: '2', background: 'var(--accent-dim)', border: '1px solid var(--border-medium)', borderRadius: 20, padding: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 20px rgba(0,0,0,0.1)' }}>
                <DotLottieReact src={cyberLottie} loop autoplay style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>

            </motion.div>

            {/* RIGHT: CardSwap */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 0.3 }} style={{ position: 'relative', height: 520, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: 20, pointerEvents: 'auto' }}>
              <div style={{ position: 'relative', height: 500, width: '100%', maxWidth: 420 }}>
                <CardSwap width={400} height={300} cardDistance={50} verticalDistance={60} delay={4500} pauseOnHover={true} skewAmount={5}>
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
                    <div style={{ fontSize: 13, color: 'var(--text-main)', marginTop: 2, fontFamily: 'Inter' }}>{stat.label}: <span style={{ fontWeight: 700, color: '#fff' }}>{stat.val}</span></div>
                  </div>
                </motion.div>
              )
            })}
          </div>

        </div>
      </section>

      {/* ── BENTO FEATURES ── */}
      <section id="features" style={{ padding: '40px 0', background: '#ffffff', position: 'relative', zIndex: 1, overflow: 'hidden' }}>
        {/* Bento Grid */}
        <div style={{ position: 'relative', zIndex: 10 }}>
          <BentoFeatures />
        </div>
      </section>

      {/* ── HOW IT WORKS — Stepper + Donut Chart ── */}
      <section id="pipeline" style={{ padding: '80px 40px', background: '#ffffff', position: 'relative', zIndex: 1, overflow: 'hidden' }}>

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
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 500, height: 500, background: 'rgba(37,99,235,0.06)', borderRadius: '50%', filter: 'blur(120px)', pointerEvents: 'none' }} />
        
        {/* Bottom Right Credit Activation Lottie */}
        <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }} 
          style={{ position: 'absolute', bottom: -10, right: -60, width: '500px', pointerEvents: 'none', zIndex: 0 }}>
          <img src="/Business Analysis.svg" alt="Business Analysis" style={{ width: '100%', height: 'auto', opacity: 0.85 }} />
        </motion.div>

        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center', position: 'relative', zIndex: 10 }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 999, background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.2)', marginBottom: 24 }}>
              <Radio size={14} color="#2563eb" />
              <span style={{ fontSize: 12, fontWeight: 700, color: '#2563eb', fontFamily: 'JetBrains Mono' }}>Live Pipeline</span>
            </div>

            {/* Animated corner borders around heading */}
            <div style={{ position: 'relative', padding: '20px 24px', marginBottom: 20 }}>
              {/* Top-right corner */}
              <motion.div
                animate={{ width: [0, 55, 55], height: [0, 0, 55] }}
                transition={{ duration: 3, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
                style={{ position: 'absolute', top: 0, right: 0, borderTop: '4px solid #1d4ed8', borderRight: '4px solid #1d4ed8', borderRadius: '0 8px 0 0', pointerEvents: 'none', opacity: 0.85 }}
              />
              {/* Bottom-left corner */}
              <motion.div
                animate={{ width: [0, 50, 50], height: [0, 0, 50] }}
                transition={{ duration: 3, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut', delay: 1.5 }}
                style={{ position: 'absolute', bottom: 0, left: 0, borderBottom: '3.5px solid #3b82f6', borderLeft: '3.5px solid #3b82f6', borderRadius: '0 0 0 8px', pointerEvents: 'none', opacity: 0.8 }}
              />
              {/* Top-left corner */}
              <motion.div
                animate={{ width: [0, 40, 40], height: [0, 0, 40] }}
                transition={{ duration: 2.8, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut', delay: 0.8 }}
                style={{ position: 'absolute', top: 0, left: 0, borderTop: '3px solid #818cf8', borderLeft: '3px solid #818cf8', borderRadius: '8px 0 0 0', pointerEvents: 'none', opacity: 0.7 }}
              />
              {/* Bottom-right corner */}
              <motion.div
                animate={{ width: [0, 45, 45], height: [0, 0, 45] }}
                transition={{ duration: 3.2, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut', delay: 2 }}
                style={{ position: 'absolute', bottom: 0, right: 0, borderBottom: '3.5px solid #60a5fa', borderRight: '3.5px solid #60a5fa', borderRadius: '0 0 8px 0', pointerEvents: 'none', opacity: 0.7 }}
              />

              <h2 style={{ fontSize: 44, fontWeight: 700, color: '#111827', fontFamily: 'Space Grotesk', letterSpacing: '-0.03em', lineHeight: 1.1, margin: 0 }}>
                Don't just block.<br />
                <GradientText colors={['#06b6d4', '#3b82f6', '#2563eb', '#818cf8']} animationSpeed={6}>Understand why.</GradientText>
              </h2>
            </div>

            <p style={{ fontSize: 16, color: '#4B5563', lineHeight: 1.7, maxWidth: 440, margin: '0 0 24px' }}>
              Most fraud systems say "blocked." AEGIS-X explains <em style={{ color: '#111827' }}>why</em> — cognitive state, drift trajectory, root causes — so compliance teams trust the decision.
            </p>
            <p style={{ fontSize: 12, color: '#94a3b8', fontFamily: 'JetBrains Mono' }}>Try the scenario →</p>
          </div>

          {/* Interactive Card */}
          <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
            style={{ background: 'linear-gradient(145deg, #1e3a8a, #2563eb)', boxShadow: '0 25px 50px -12px rgba(30, 58, 138, 0.4)', border: '1px solid rgba(96,165,250,0.2)', borderRadius: 16, padding: 28, position: 'relative', overflow: 'hidden', backdropFilter: 'blur(8px)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <span style={{ fontSize: 10, fontFamily: 'JetBrains Mono', color: '#93c5fd' }}>behavioral_event.json</span>
              <div style={{ display: 'flex', gap: 5 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(96,165,250,0.4)' }} />
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(147,197,253,0.4)' }} />
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(6,182,212,0.5)' }} />
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
              <div style={{ padding: '14px 16px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.08)', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.35)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)' }}>
                <span style={{ fontFamily: 'JetBrains Mono', fontSize: 13, color: '#dbeafe' }}>ALLOW — User is fine</span>
              </div>
              <div style={{ padding: '14px 16px', borderRadius: 10, border: 'none', background: '#ffffff', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: 'JetBrains Mono', fontSize: 13, color: '#06b6d4', fontWeight: 600 }}>BLOCK — Coercion detected</span>
                <CheckCircle size={16} color="#06b6d4" />
              </div>
            </div>
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} transition={{ delay: 0.5, duration: 0.4 }}
              style={{ marginTop: 14, padding: 14, borderRadius: 10, background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.25)' }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#67e8f9', margin: '0 0 4px' }}>Correct — BLOCK</p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.9)', margin: 0, lineHeight: 1.6 }}>
                Hesitation ratio 0.72 + correction rate 0.45 + device shake 0.065 → Cognitive state: COERCED. Trust Score: 0.38. Decision Engine blocks transaction and alerts fraud team.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: '1px solid rgba(37,99,235,0.1)', padding: '30px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#ffffff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Shield size={16} color="#2563eb" />
          <span style={{ fontSize: 14, fontWeight: 600, color: '#111827', fontFamily: 'Space Grotesk' }}>AEGIS-X</span>
          <span style={{ fontSize: 12, color: '#64748B' }}>· Continuous Trust Infrastructure</span>
        </div>
        <div style={{ display: 'flex', gap: 24 }}>
          {['DFS & IBA Initiative', 'Central Bank of India', 'MNNIT Allahabad'].map((item, i) => (
            <span key={i} style={{ fontSize: 12, color: '#64748B', cursor: 'pointer', transition: 'color 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#2563eb')}
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
