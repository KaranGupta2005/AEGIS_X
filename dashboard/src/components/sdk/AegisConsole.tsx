import React, { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Shield, Activity, Brain, Target, TerminalSquare, ChevronDown } from 'lucide-react'
import { SessionState } from '../../services/store'
import { TrustGauge } from './TrustGauge'
import { LiveTrustChart } from './LiveTrustChart'
import { RiskContributors } from './RiskContributors'
import { CognitiveStatePanel } from './CognitiveStatePanel'
import { DecisionPanel } from './DecisionPanel'
import { FraudIntentRadar } from './FraudIntentRadar'
import { SessionEventLog } from './SessionEventLog'
import { LiveBadge } from '../common/LiveBadge'
import { AnimatedNumber } from '../common/AnimatedNumber'

interface AegisConsoleProps {
  state: SessionState
  currentPage: string
}

type Tab = 'trust' | 'cognitive' | 'fraud' | 'events'

const TABS = [
  { key: 'trust' as Tab, label: 'Trust', icon: Shield },
  { key: 'cognitive' as Tab, label: 'Cognitive', icon: Brain },
  { key: 'fraud' as Tab, label: 'Fraud', icon: Target },
  { key: 'events' as Tab, label: 'Events', icon: TerminalSquare },
]

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{
        fontSize: 7, fontWeight: 700, letterSpacing: '0.14em',
        color: 'rgba(255,255,255,0.25)', fontFamily: 'JetBrains Mono',
        textTransform: 'uppercase', marginBottom: 6,
      }}>
        {title}
      </div>
      {children}
    </div>
  )
}

function MetricRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '3px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
      <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', fontFamily: 'JetBrains Mono' }}>{label}</span>
      <span style={{ fontSize: 10, fontWeight: 700, color: color || 'rgba(255,255,255,0.8)', fontFamily: 'Space Grotesk' }}>{value}</span>
    </div>
  )
}

export const AegisConsole: React.FC<AegisConsoleProps> = ({ state, currentPage }) => {
  const [activeTab, setActiveTab] = useState<Tab>('trust')
  const {
    trustScore, decision, cognitiveState, cognitiveStability = 1,
    similarity, driftDetected, driftSeverity = 'none',
    velocity, acceleration, entropy, anomalyScore = 0, fraudProbability = 0,
    intentVector = { coercion_probability: 0, takeover_probability: 0, anomaly_severity: 0, robotic_probability: 0 },
    isConnected, timeline, eventCount, latencyMs, confidence = 1,
    reasons = [], explanation = '',
  } = state

  const trustColor = trustScore > 85 ? '#10B981' : trustScore > 60 ? '#F59E0B' : '#EF4444'

  return (
    <div style={{
      background: 'rgba(6,9,16,0.98)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 16,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      height: '100%',
    }}>
      {/* Header */}
      <div style={{
        padding: '10px 14px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center', gap: 8,
        background: 'rgba(255,255,255,0.01)',
        flexShrink: 0,
      }}>
        <div style={{
          width: 26, height: 26, borderRadius: 8,
          background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Shield size={13} color="#10B981" />
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, color: 'white', fontFamily: 'Space Grotesk', lineHeight: 1.2 }}>AEGIS-X</div>
          <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.3)', fontFamily: 'JetBrains Mono' }}>Behavioral Trust Engine</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
          <LiveBadge connected={isConnected} />
          <span style={{ fontSize: 7, color: 'rgba(255,255,255,0.2)', fontFamily: 'JetBrains Mono' }}>
            {currentPage.toUpperCase()} · E#{eventCount}
          </span>
        </div>
      </div>

      {/* Trust Score + Decision strip */}
      <div style={{
        padding: '8px 14px',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        display: 'flex', alignItems: 'center', gap: 10,
        flexShrink: 0,
      }}>
        <div>
          <motion.div
            key={Math.round(trustScore)}
            initial={{ scale: 1.1, opacity: 0.5 }}
            animate={{ scale: 1, opacity: 1 }}
            style={{ fontSize: 32, fontWeight: 900, color: trustColor, fontFamily: 'Space Grotesk', lineHeight: 1 }}
          >
            <AnimatedNumber value={Math.round(trustScore)} decimals={0} suffix="%" />
          </motion.div>
          <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.3)', fontFamily: 'JetBrains Mono', marginTop: 2 }}>T R U S T · T ( t )</div>
        </div>

        <div style={{ flex: 1 }}>
          <LiveTrustChart timeline={timeline} />
        </div>

        <motion.div
          key={decision}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          style={{
            padding: '8px 10px', borderRadius: 8, textAlign: 'center',
            background: decision === 'ALLOW' ? 'rgba(16,185,129,0.1)' : decision === 'STEP_UP' ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)',
            border: `1px solid ${decision === 'ALLOW' ? 'rgba(16,185,129,0.3)' : decision === 'STEP_UP' ? 'rgba(245,158,11,0.3)' : 'rgba(239,68,68,0.35)'}`,
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 900, color: decision === 'ALLOW' ? '#10B981' : decision === 'STEP_UP' ? '#F59E0B' : '#EF4444', fontFamily: 'Space Grotesk' }}>
            {decision}
          </div>
          <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.3)', fontFamily: 'JetBrains Mono', marginTop: 1 }}>
            {Math.round(confidence * 100)}%
          </div>
        </motion.div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: 0,
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        flexShrink: 0,
      }}>
        {TABS.map(tab => {
          const Icon = tab.icon
          const active = activeTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                flex: 1, padding: '7px 4px', border: 'none', cursor: 'pointer',
                background: active ? 'rgba(255,255,255,0.04)' : 'transparent',
                borderBottom: active ? '2px solid #10B981' : '2px solid transparent',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                transition: 'all 0.15s',
              }}
            >
              <Icon size={12} color={active ? '#10B981' : 'rgba(255,255,255,0.25)'} />
              <span style={{ fontSize: 8, color: active ? '#10B981' : 'rgba(255,255,255,0.25)', fontFamily: 'JetBrains Mono', fontWeight: active ? 700 : 400 }}>
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px' }} className="scrollbar-hide">
        <AnimatePresence mode="wait">
          {activeTab === 'trust' && (
            <motion.div key="trust" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <Section title="Risk Signals">
                <RiskContributors
                  similarity={similarity}
                  cognitiveStability={cognitiveStability}
                  anomalyScore={anomalyScore}
                  fraudProbability={fraudProbability}
                  driftDetected={driftDetected}
                />
              </Section>

              <Section title="Temporal Dynamics">
                <MetricRow label="Velocity dT/dt" value={velocity.toFixed(4)} color={velocity < -0.01 ? '#EF4444' : '#10B981'} />
                <MetricRow label="Acceleration" value={acceleration.toFixed(4)} color={acceleration < -0.005 ? '#F59E0B' : 'rgba(255,255,255,0.6)'} />
                <MetricRow label="Entropy H(t)" value={entropy.toFixed(3)} color={entropy > 0.5 ? '#F97316' : 'rgba(255,255,255,0.6)'} />
                <MetricRow label="Drift Severity" value={driftSeverity.toUpperCase()} color={driftDetected ? '#F59E0B' : '#10B981'} />
                <MetricRow label="Pipeline Latency" value={`${latencyMs.toFixed(0)}ms`} color="#8B5CF6" />
                <MetricRow label="Behavioral Similarity" value={`${(similarity * 100).toFixed(1)}%`} color={similarity > 0.85 ? '#10B981' : similarity > 0.65 ? '#F59E0B' : '#EF4444'} />
              </Section>

              <Section title="Decision Engine">
                <DecisionPanel
                  decision={decision}
                  confidence={confidence}
                  reasons={reasons}
                  explanation={explanation}
                  cognitiveState={cognitiveState}
                />
              </Section>
            </motion.div>
          )}

          {activeTab === 'cognitive' && (
            <motion.div key="cognitive" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <Section title="Cognitive State">
                <CognitiveStatePanel state={cognitiveState} stability={cognitiveStability} />
              </Section>

              <Section title="Behavioral Biometrics">
                <MetricRow label="Typing Speed" value="live" color="rgba(255,255,255,0.5)" />
                <MetricRow label="Hesitation Ratio" value="monitored" color="rgba(255,255,255,0.5)" />
                <MetricRow label="Correction Rate" value="monitored" color="rgba(255,255,255,0.5)" />
                <MetricRow label="Gyroscope Variance" value="monitored" color="rgba(255,255,255,0.5)" />
                <MetricRow label="Touch Duration" value="monitored" color="rgba(255,255,255,0.5)" />
                <MetricRow label="Swipe Straightness" value="monitored" color="rgba(255,255,255,0.5)" />
              </Section>

              <Section title="SDK Monitoring">
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', fontFamily: 'JetBrains Mono', lineHeight: 1.7 }}>
                  <div>▸ Current Page: <span style={{ color: '#10B981' }}>{currentPage}</span></div>
                  <div>▸ Session Events: <span style={{ color: '#3B82F6' }}>{eventCount}</span></div>
                  <div>▸ Baseline: <span style={{ color: '#10B981' }}>ENROLLED</span></div>
                  <div>▸ Delegate Mode: <span style={{ color: 'rgba(255,255,255,0.3)' }}>OFF</span></div>
                  <div>▸ Adaptive Verification: <span style={{ color: decision === 'STEP_UP' ? '#F59E0B' : '#10B981' }}>{decision === 'STEP_UP' ? 'ACTIVE' : 'STANDBY'}</span></div>
                </div>
              </Section>
            </motion.div>
          )}

          {activeTab === 'fraud' && (
            <motion.div key="fraud" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <Section title="Intent Vector Radar">
                <FraudIntentRadar
                  coercion={intentVector.coercion_probability}
                  takeover={intentVector.takeover_probability}
                  anomaly={intentVector.anomaly_severity}
                  robotic={intentVector.robotic_probability}
                  fraudProbability={fraudProbability}
                />
              </Section>

              <Section title="Threat Probabilities">
                {[
                  { label: 'Social Engineering (Coercion)', value: intentVector.coercion_probability, color: '#EF4444' },
                  { label: 'Account Takeover', value: intentVector.takeover_probability, color: '#F97316' },
                  { label: 'Remote Access / Malware', value: intentVector.robotic_probability, color: '#8B5CF6' },
                  { label: 'Zero-Day Anomaly', value: intentVector.anomaly_severity, color: '#F59E0B' },
                ].map(item => (
                  <div key={item.label} style={{ marginBottom: 7 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                      <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)', fontFamily: 'JetBrains Mono' }}>{item.label}</span>
                      <span style={{ fontSize: 9, fontWeight: 700, color: item.value > 0.4 ? item.color : 'rgba(255,255,255,0.3)', fontFamily: 'Space Grotesk' }}>
                        {Math.round(item.value * 100)}%
                      </span>
                    </div>
                    <div style={{ height: 3, background: 'rgba(255,255,255,0.05)', borderRadius: 99, overflow: 'hidden' }}>
                      <motion.div
                        animate={{ width: `${item.value * 100}%` }}
                        transition={{ duration: 0.5 }}
                        style={{ height: '100%', background: item.color, borderRadius: 99 }}
                      />
                    </div>
                  </div>
                ))}
              </Section>
            </motion.div>
          )}

          {activeTab === 'events' && (
            <motion.div key="events" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <Section title="Live Event Stream">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.25)', fontFamily: 'JetBrains Mono' }}>
                    {eventCount} events · 2s cadence
                  </span>
                  <span style={{ fontSize: 7, color: '#10B981', fontFamily: 'JetBrains Mono' }}>STREAMING</span>
                </div>
                <SessionEventLog timeline={state.timeline} eventCount={eventCount} />
              </Section>

              <Section title="Pipeline Health">
                <MetricRow label="Avg Latency" value={`${latencyMs.toFixed(0)}ms`} color="#8B5CF6" />
                <MetricRow label="Target Latency" value="<100ms" color="rgba(255,255,255,0.3)" />
                <MetricRow label="Embedding Model" value="MiniLM-L6-v2" color="rgba(255,255,255,0.4)" />
                <MetricRow label="Cognitive Model" value="RF · 96.3%" color="#10B981" />
                <MetricRow label="Anomaly Detector" value="IsolationForest" color="rgba(255,255,255,0.4)" />
                <MetricRow label="Drift Detector" value="CUSUM" color="rgba(255,255,255,0.4)" />
              </Section>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
