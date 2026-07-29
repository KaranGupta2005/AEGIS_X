import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { AlertTriangle, Lock, Home, Clock, QrCode, User, ShieldAlert } from 'lucide-react'
import { HomeScreen } from './HomeScreen'
import { SendMoneyFlow } from './SendMoneyFlow'
import { OnboardingFlow } from './OnboardingFlow'
import {
  QRScanScreen, MobileRechargeScreen, ElectricityScreen,
  FASTagScreen, InsuranceScreen, CreditCardScreen,
  TransactionHistoryScreen, ProfileScreen,
} from './UtilityScreens'
import { ACCOUNT } from './bankData'
import { aegisSDK } from '../../services/sdk/AegisBehavioralSDK'
import { useStore } from '../../services/store'

type Screen =
  | 'onboarding' | 'home' | 'send' | 'history' | 'scan' | 'profile'
  | 'qr' | 'mobile' | 'electricity' | 'fasttag' | 'insurance' | 'credit'

type FlowStep = 'contacts' | 'amount' | 'review' | 'pin' | 'processing' | 'success'

interface BankingAppProps {
  trustScore: number
  decision: string
  cognitiveState: string
  onScreenChange?: (screen: string) => void
  skipOnboarding?: boolean
}

export const BankingApp: React.FC<BankingAppProps> = ({ trustScore, decision, cognitiveState, onScreenChange, skipOnboarding = false }) => {
  // Per-user onboarding: use username from localStorage to scope the key
  const username = localStorage.getItem('aegisx_username') || 'default'
  const onboardingKey = `aegisx_onboarding_done_${username}`
  const onboardingDone = skipOnboarding || localStorage.getItem(onboardingKey) === 'true'
  const [screen, setScreen] = useState<Screen>(onboardingDone ? 'home' : 'onboarding')
  const [flowStep, setFlowStep] = useState<FlowStep>('contacts')
  const [balance, setBalance] = useState(ACCOUNT.balance)
  const [blocked, setBlocked] = useState(false)
  const { state: storeState } = useStore()
  const sandboxActive = storeState.sandboxActive
  const securityState = storeState.securityState
  const threatScore = storeState.threatScore

  // Auto-show block overlay ONLY when trust is critically low AND decision is BLOCK
  // With V2 tuning, trust drops faster so lower threshold from 60→50 for block
  // The sandbox overlay handles trust<=50, block overlay is for explicit BLOCK+payment
  useEffect(() => {
    if (decision === 'BLOCK' && trustScore < 50 && screen === 'send') {
      setBlocked(true)
    }
  }, [decision, trustScore])

  // Trigger containment when 3+ wrong MPIN attempts happen (live action)
  useEffect(() => {
    const u = localStorage.getItem('aegisx_username') || 'default'
    const attempts = parseInt(localStorage.getItem(`aegisx_pin_attempts_${u}`) || '0')
    if (attempts >= 3) {
      // Force sandbox activation for demo
      const BACKEND = import.meta.env.VITE_BACKEND_URL || ''
      fetch(`${BACKEND}/api/v1/security/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: 'demo_user', session_id: 'sess_payment',
          trust_score: 0.15, cognitive_state: 'coerced',
          drift_detected: true, drift_severity: 'critical',
          velocity: -0.1, anomaly_score: 0.95,
        }),
      }).catch(() => {})
    }
  }, [blocked])

  // Notify SDK and parent of every screen transition
  const navigateTo = (s: Screen) => {
    setScreen(s)
    aegisSDK.notifyScreenChange(s)
    onScreenChange?.(s)
  }

  const navigateToFlowScreen = (step: FlowStep) => {
    const stepScreenMap: Record<FlowStep, string> = {
      contacts: 'transfer',
      amount: 'amount',
      review: 'review',
      pin: 'pin',
      processing: 'pin',
      success: 'success',
    }
    aegisSDK.notifyScreenChange(stepScreenMap[step])
    onScreenChange?.(stepScreenMap[step])
    setFlowStep(step)
  }

  // On mount: report initial screen to SDK
  useEffect(() => {
    aegisSDK.notifyScreenChange('home')
    onScreenChange?.('home')
  }, [])

  const goHome = () => navigateTo('home')

  const navItems = [
    { key: 'home' as Screen, icon: Home,    label: 'Home' },
    { key: 'history' as Screen, icon: Clock, label: 'History' },
    { key: 'qr' as Screen, icon: QrCode,    label: 'Scan' },
    { key: 'profile' as Screen, icon: User,  label: 'Profile' },
  ]

  const renderScreen = () => {
    switch (screen) {
      case 'onboarding':
        return (
          <OnboardingFlow onComplete={() => navigateTo('home')} />
        )
      case 'send':
        return (
          <SendMoneyFlow
            trustScore={trustScore}
            userId="demo_user"
            onBack={() => { navigateTo('home'); navigateToFlowScreen('contacts') }}
            onBlock={() => setBlocked(true)}
            onSuccess={(amt) => {
              setBalance(b => b - amt)
              aegisSDK.setTransactionContext({ frequency: (aegisSDK.session?.navigationPath.filter(s => s === 'success').length ?? 0) + 1 })
            }}
            currentStep={flowStep}
            onStepChange={navigateToFlowScreen}
          />
        )
      case 'qr':          return <QRScanScreen onBack={goHome} />
      case 'mobile':      return <MobileRechargeScreen onBack={goHome} />
      case 'electricity': return <ElectricityScreen onBack={goHome} />
      case 'fasttag':     return <FASTagScreen onBack={goHome} />
      case 'insurance':   return <InsuranceScreen onBack={goHome} />
      case 'credit':      return <CreditCardScreen onBack={goHome} />
      case 'history':     return <TransactionHistoryScreen onBack={goHome} />
      case 'profile':     return <ProfileScreen onBack={goHome} trustScore={trustScore} />
      default:
        return (
          <HomeScreen
            balance={balance}
            trustScore={trustScore}
            onNavigate={(s) => {
              if (s === 'send') navigateToFlowScreen('contacts')
              navigateTo(s as Screen)
            }}
          />
        )
    }
  }

  const isUtility = !['home', 'history', 'qr', 'profile'].includes(screen)
  const showBottomNav = screen !== 'onboarding'

  return (
    <div style={{ background: '#0f1d32', borderRadius: 16, border: '1px solid rgba(59,130,246,0.12)', display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100%', position: 'relative', boxShadow: '0 4px 20px rgba(15,29,50,0.3)' }}>
      {/* Content */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        <AnimatePresence mode="wait">
          <motion.div key={screen}
            initial={{ opacity: 0, x: isUtility ? 20 : 0 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            style={{ height: '100%', overflowY: 'auto' }}>
            {renderScreen()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom Nav */}
      {showBottomNav && (
      <div style={{ display: 'flex', borderTop: '1px solid rgba(59,130,246,0.08)', background: '#0a1628', backdropFilter: 'blur(10px)', flexShrink: 0 }}>
        {navItems.map(item => {
          const Icon = item.icon
          const active = screen === item.key || (item.key === 'home' && isUtility && screen !== 'qr')
          return (
            <motion.button key={item.key} whileTap={{ scale: 0.88 }} onClick={() => navigateTo(item.key)}
              style={{ flex: 1, padding: '8px 4px', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              <motion.div animate={{ color: active ? '#10B981' : 'rgba(255,255,255,0.28)' }}>
                <Icon size={16} />
              </motion.div>
              <span style={{ fontSize: 8, color: active ? '#10B981' : 'rgba(255,255,255,0.28)', fontFamily: 'Space Grotesk', fontWeight: active ? 700 : 400 }}>
                {item.label}
              </span>
              {active && <motion.div layoutId="navDot" style={{ width: 3, height: 3, borderRadius: '50%', background: '#10B981' }} />}
            </motion.button>
          )
        })}
      </div>
      )}

      {/* BLOCK Overlay — ONLY when verification explicitly fails during payment */}
      <AnimatePresence>
        {blocked && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(6px)', borderRadius: 16 }}>
            <motion.div initial={{ scale: 0.88, y: 20 }} animate={{ scale: 1, y: 0 }}
              style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 20, padding: '28px 24px', textAlign: 'center', maxWidth: 280, margin: '0 16px' }}>
              <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 0.5, repeat: 3 }}
                style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <AlertTriangle size={24} color="#EF4444" />
              </motion.div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#EF4444', fontFamily: 'Space Grotesk', marginBottom: 8 }}>Transaction Blocked</div>
              <p style={{ fontSize: 11, color: '#5b8cc7', lineHeight: 1.6, margin: '0 0 10px', fontFamily: 'Space Grotesk' }}>
                {cognitiveState === 'coerced' ? 'Behavioral analysis detected possible social engineering. Your safety is our priority.' :
                 cognitiveState === 'robotic' ? 'Automated activity detected. Transaction halted to protect your account.' :
                 'Unusual behavioral pattern detected. Transaction paused for security.'}
              </p>
              <div style={{ fontSize: 8, color: '#5b8cc7', fontFamily: 'JetBrains Mono', marginBottom: 14 }}>
                AEGIS-X · T(t)={trustScore.toFixed(0)}% · {cognitiveState.toUpperCase()}
              </div>
              <button onClick={() => setBlocked(false)}
                style={{ padding: '9px 22px', borderRadius: 10, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: '#EF4444', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Space Grotesk' }}>
                Dismiss
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Note: Step-Up verification (voice/face challenges) is now handled
          inline within SendMoneyFlow — no overlay needed */}

      {/* SANDBOX CONTAINMENT OVERLAY — Shown when honeypot/containment activates OR trust critically low */}
      <AnimatePresence>
        {(sandboxActive || trustScore <= 50 || decision === 'BLOCK') && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            style={{
              position: 'absolute', inset: 0, zIndex: 200,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(10, 15, 28, 0.92)',
              backdropFilter: 'blur(12px)',
              borderRadius: 16,
            }}
          >
            {/* Pulsing SVG loader */}
            <motion.div
              animate={{ scale: [1, 1.05, 1], opacity: [0.9, 1, 0.9] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              style={{ width: 140, height: 140, marginBottom: 20 }}
            >
              <img
                src="/Id authentication.svg"
                alt="Identity Verification"
                style={{ width: '100%', height: '100%', filter: 'drop-shadow(0 0 20px rgba(59,130,246,0.4))' }}
              />
            </motion.div>

            {/* Status text */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              style={{ textAlign: 'center', maxWidth: 260, padding: '0 20px' }}
            >
              <div style={{ fontSize: 14, fontWeight: 800, color: '#60a5fa', fontFamily: 'Space Grotesk', marginBottom: 6 }}>
                Identity Verification Active
              </div>
              <div style={{ fontSize: 10, color: '#5b8cc7', fontFamily: 'Space Grotesk', lineHeight: 1.6, marginBottom: 12 }}>
                Suspicious activity detected. Your session is under enhanced security review.
              </div>

              {/* Scanning animation bars */}
              <div style={{ display: 'flex', gap: 3, justifyContent: 'center', marginBottom: 14 }}>
                {[0, 0.2, 0.4, 0.6, 0.8].map((delay, i) => (
                  <motion.div
                    key={i}
                    animate={{ height: [8, 20, 8], opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1.2, repeat: Infinity, delay }}
                    style={{ width: 3, borderRadius: 2, background: '#3b82f6' }}
                  />
                ))}
              </div>

              <div style={{ fontSize: 8, color: 'rgba(96,165,250,0.6)', fontFamily: 'JetBrains Mono' }}>
                AEGIS-X CONTAINMENT · SANDBOX MODE · T(t)={trustScore.toFixed(0)}%
              </div>
              <div style={{ fontSize: 7, color: 'rgba(96,165,250,0.4)', fontFamily: 'JetBrains Mono', marginTop: 4 }}>
                Threat Score: {(threatScore * 100).toFixed(0)}% · State: {securityState}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
