import React, { useState, useRef, useEffect } from 'react'
import { motion } from 'motion/react'
import { User, Phone, Bot } from 'lucide-react'
import { useStore } from '../../services/store'
import { SimulatorScenario } from '../../services/api'
import { BankingApp } from '../../components/payment/BankingApp'
import { AegisConsole } from '../../components/sdk/AegisConsole'

const SCENARIOS = [
  { key: 'normal' as SimulatorScenario, label: 'Normal User', icon: User, color: '#10B981', desc: 'Genuine session', info: 'A genuine user browsing and paying. Trust stays high. Minimal verification.' },
  { key: 'scam' as SimulatorScenario, label: 'Scam Call', icon: Phone, color: '#F59E0B', desc: 'Social engineering', info: 'User receives a scam call. Hesitation increases, typing slows, panic builds. Watch trust decline.' },
  { key: 'malware' as SimulatorScenario, label: 'Malware Bot', icon: Bot, color: '#EF4444', desc: 'Remote access', info: 'Remote access malware controlling the device. Perfect timing, zero variance, inhuman speed.' },
]

const LiveDemo: React.FC = () => {
  const { state, connect, switchScenario, dispatch } = useStore()
  const { trustScore, decision, cognitiveState, isConnected, eventCount, sdkState, liveActivity } = state

  const [activeScenario, setActiveScenario] = useState<SimulatorScenario>('normal')

  const hasConnectedRef = useRef(false)
  useEffect(() => {
    if (!hasConnectedRef.current) {
      hasConnectedRef.current = true
      connect('normal')
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
    switchScenario(s)
  }

  return (
    <div style={{ height: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Scenario bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.3)', fontFamily: 'JetBrains Mono', letterSpacing: '0.12em' }}>
          DEMO SCENARIO
        </span>
        <div style={{ display: 'flex', gap: 6, flex: 1 }}>
          {SCENARIOS.map(s => {
            const Icon = s.icon
            const active = activeScenario === s.key
            return (
              <motion.button
                key={s.key}
                onClick={() => startScenario(s.key)}
                whileTap={{ scale: 0.95 }}
                animate={{
                  background: active ? `${s.color}12` : 'rgba(255,255,255,0.02)',
                  borderColor: active ? `${s.color}50` : 'rgba(255,255,255,0.07)',
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 14px', borderRadius: 8,
                  border: '1px solid', cursor: 'pointer',
                  color: active ? s.color : 'rgba(255,255,255,0.4)',
                  fontSize: 11, fontWeight: active ? 700 : 500,
                  fontFamily: 'Space Grotesk', transition: 'color 0.15s',
                }}
              >
                <Icon size={12} />
                {s.label}
                {active && <span style={{ fontSize: 7, fontFamily: 'JetBrains Mono', opacity: 0.6 }}>{s.desc}</span>}
              </motion.button>
            )
          })}
        </div>

        {/* Connection status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 20, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <motion.div
            animate={isConnected ? { scale: [1, 1.4, 1], opacity: [1, 0.4, 1] } : {}}
            transition={{ duration: 2, repeat: Infinity }}
            style={{ width: 6, height: 6, borderRadius: '50%', background: isConnected ? '#10B981' : '#6B7280' }}
          />
          <span style={{ fontSize: 8, color: isConnected ? '#10B981' : '#6B7280', fontFamily: 'JetBrains Mono', fontWeight: 700 }}>
            {isConnected ? 'LIVE' : 'OFFLINE'}
          </span>
          <span style={{ fontSize: 7, color: 'rgba(255,255,255,0.2)', fontFamily: 'JetBrains Mono' }}>E#{eventCount}</span>
        </div>
      </div>

      {/* Main split — Banking App + Console */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 340px', gap: 12, minHeight: 0 }} className="demo-grid">
        {/* Scenario info banner */}
        <div style={{ gridColumn: '1 / -1', padding: '6px 12px', borderRadius: 8, background: `${SCENARIOS.find(s => s.key === activeScenario)?.color}08`, border: `1px solid ${SCENARIOS.find(s => s.key === activeScenario)?.color}20`, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 9, color: SCENARIOS.find(s => s.key === activeScenario)?.color, fontFamily: 'Space Grotesk', fontWeight: 600 }}>
            {SCENARIOS.find(s => s.key === activeScenario)?.info}
          </span>
        </div>
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
