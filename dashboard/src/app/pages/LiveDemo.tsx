import React, { useState, useRef, useEffect } from 'react'
import { motion } from 'motion/react'
import { User, Phone, Bot } from 'lucide-react'
import { useStore } from '../../services/store'
import { SimulatorScenario } from '../../services/api'
import { BankingApp } from '../../components/payment/BankingApp'
import { AegisConsole } from '../../components/sdk/AegisConsole'

const SCENARIOS = [
  { key: 'normal' as SimulatorScenario, label: 'Normal User', icon: User, color: '#3B82F6', desc: 'Genuine session', info: 'A genuine user browsing and paying. Trust stays high. Minimal verification.' },
  { key: 'scam' as SimulatorScenario, label: 'Scam Call', icon: Phone, color: '#F59E0B', desc: 'Social engineering', info: 'User receives a scam call. Hesitation increases, typing slows, panic builds. Watch trust decline.' },
  { key: 'malware' as SimulatorScenario, label: 'Malware Bot', icon: Bot, color: '#EF4444', desc: 'Remote access', info: 'Remote access malware controlling the device. Perfect timing, zero variance, inhuman speed.' },
]

const LiveDemo: React.FC = () => {
  const { state, connect, disconnect, switchScenario, dispatch } = useStore()
  const { trustScore, decision, cognitiveState, isConnected, eventCount, sdkState, liveActivity } = state

  const [activeScenario, setActiveScenario] = useState<SimulatorScenario>('normal')

  const hasConnectedRef = useRef(false)
  useEffect(() => {
    if (!hasConnectedRef.current) {
      hasConnectedRef.current = true
      // Don't start simulator for normal mode — let real SDK behavior drive the system
      // Simulator only used for scam/malware demo scenarios
    }
  }, [])

  const handleScreenChange = (screen: string) => {
    dispatch({
      type: 'SDK_STATE_CHANGE',
      payload: { sdkState, currentScreen: screen as any },
    })
  }

  const startScenario = (s: SimulatorScenario) => {
    setActiveScenario(s)
    if (s === 'normal') {
      // Stop any active simulator — let real SDK behavior take over
      disconnect()
    } else {
      switchScenario(s)
    }
  }

  return (
    <div style={{ height: 'calc(100dvh - 80px)', display: 'flex', flexDirection: 'column', gap: 12, background: 'linear-gradient(180deg, rgba(37,99,235,0.03) 0%, rgba(37,99,235,0.08) 100%)', margin: '-28px -36px', padding: '20px 28px', borderRadius: 16 }}>
      {/* Scenario bar — premium pill-style selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 4, padding: 3, borderRadius: 10, background: 'var(--accent-dim)', border: '1px solid var(--border-light)' }}>
          {SCENARIOS.map(s => {
            const Icon = s.icon
            const active = activeScenario === s.key
            return (
              <motion.button
                key={s.key}
                onClick={() => startScenario(s.key)}
                whileTap={{ scale: 0.96 }}
                animate={{
                  background: active ? `${s.color}15` : 'transparent',
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '7px 14px', borderRadius: 8,
                  border: 'none', cursor: 'pointer',
                  color: active ? s.color : 'var(--text-sub)',
                  fontSize: 11, fontWeight: active ? 700 : 500,
                  fontFamily: 'Space Grotesk', transition: 'all 0.2s',
                  position: 'relative',
                }}
              >
                {active && (
                  <motion.div layoutId="scenarioActive" style={{
                    position: 'absolute', inset: 0, borderRadius: 8,
                    border: `1px solid ${s.color}40`,
                    background: `${s.color}08`,
                  }} transition={{ type: 'spring', stiffness: 400, damping: 30 }} />
                )}
                <Icon size={13} style={{ position: 'relative', zIndex: 1 }} />
                <span style={{ position: 'relative', zIndex: 1 }}>{s.label}</span>
              </motion.button>
            )
          })}
        </div>

        <div style={{ flex: 1 }} />

        {/* Live badge */}
        <motion.div
          animate={{ opacity: isConnected ? 1 : 0.5 }}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 20, background: isConnected ? 'rgba(59,130,246,0.06)' : 'rgba(107,114,128,0.06)', border: `1px solid ${isConnected ? 'rgba(59,130,246,0.2)' : 'rgba(107,114,128,0.15)'}` }}>
          <motion.div
            animate={isConnected ? { scale: [1, 1.5, 1], opacity: [1, 0.3, 1] } : {}}
            transition={{ duration: 2, repeat: Infinity }}
            style={{ width: 7, height: 7, borderRadius: '50%', background: isConnected ? '#3B82F6' : 'var(--text-muted)' }}
          />
          <span style={{ fontSize: 9, color: isConnected ? '#3B82F6' : 'var(--text-muted)', fontFamily: 'JetBrains Mono', fontWeight: 700 }}>
            {isConnected ? 'LIVE' : 'OFFLINE'}
          </span>
          <span style={{ width: 1, height: 12, background: 'var(--accent-dim)' }} />
          <span style={{ fontSize: 8, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>W{eventCount}</span>
        </motion.div>
      </div>

      {/* Scenario description — subtle */}
      <motion.div
        key={activeScenario}
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ padding: '6px 14px', borderRadius: 8, background: `${SCENARIOS.find(s => s.key === activeScenario)?.color}06`, borderLeft: `3px solid ${SCENARIOS.find(s => s.key === activeScenario)?.color}40`, flexShrink: 0 }}>
        <span style={{ fontSize: 9, color: `${SCENARIOS.find(s => s.key === activeScenario)?.color}CC`, fontFamily: 'Space Grotesk', fontWeight: 500 }}>
          {SCENARIOS.find(s => s.key === activeScenario)?.info}
        </span>
      </motion.div>

      {/* Main split — Banking App + Console */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 340px', gap: 12, minHeight: 0 }} className="demo-grid">
        {/* LEFT: Banking App */}
        <div className="banking-app-mobile">
          <BankingApp
            trustScore={trustScore}
            decision={decision}
            cognitiveState={cognitiveState}
            onScreenChange={handleScreenChange}
          />
        </div>

        {/* RIGHT: AEGIS-X Console */}
        <div className="aegis-console">
          <AegisConsole
            state={state}
            currentPage={liveActivity.currentPage}
          />
        </div>
      </div>
    </div>
  )
}

export default LiveDemo
