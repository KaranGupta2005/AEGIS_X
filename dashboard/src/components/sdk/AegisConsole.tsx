import React, { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Shield, Activity, Brain, Target, TerminalSquare, Layers } from 'lucide-react'
import { SessionState } from '../../services/store'
import { LiveTrustChart } from './LiveTrustChart'
import { RiskContributors } from './RiskContributors'
import { CognitiveStatePanel } from './CognitiveStatePanel'
import { DecisionPanel } from './DecisionPanel'
import { FraudIntentRadar } from './FraudIntentRadar'
import { SessionEventLog } from './SessionEventLog'
import { LiveBadge } from '../common/LiveBadge'
import { AnimatedNumber } from '../common/AnimatedNumber'
import { SDKState } from '../../services/sdk/AegisBehavioralSDK'

interface AegisConsoleProps {
  state: SessionState
  currentPage: string
}

type Tab = 'trust' | 'session' | 'cognitive' | 'fraud' | 'events'

const TABS = [
  { key: 'trust' as Tab, label: 'Trust', icon: Shield },
  { key: 'session' as Tab, label: 'Session', icon: Layers },
  { key: 'cognitive' as Tab, label: 'Cognitive', icon: Brain },
  { key: 'fraud' as Tab, label: 'Fraud', icon: Target },
  { key: 'events' as Tab, label: 'Events', icon: TerminalSquare },
]

// ─── SDK STATE BADGE ─────────────────────────────────────────────────────────

const SDK_STATE_COLORS: Record<SDKState, string> = {
  INITIALIZING: '#6B7280',
  OBSERVING:    '#3B82F6',
  LEARNING:     '#8B5CF6',
  TRANSACTION:  '#F59E0B',
  VERIFYING:    '#EF4444',
  FINISHED:     '#6B7280',
}

function SDKStateBadge({ sdkState }: { sdkState: SDKState }) {
  const color = SDK_STATE_COLORS[sdkState]
  return (
    <motion.div
      key={sdkState}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '2px 7px', borderRadius: 20,
        background: `${color}18`, border: `1px solid ${color}40`,
      }}
    >
      <motion.div
        animate={sdkState === 'OBSERVING' || sdkState === 'LEARNING'
          ? { scale: [1, 1.4, 1], opacity: [1, 0.4, 1] }
          : {}}
        transition={{ duration: 2, repeat: Infinity }}
        style={{ width: 5, height: 5, borderRadius: '50%', background: color }}
      />
      <span style={{ fontSize: 7, fontWeight: 700, color, fontFamily: 'JetBrains Mono' }}>
        {sdkState}
      </span>
    </motion.div>
  )
}

// ─── CONFIDENCE BAR ───────────────────────────────────────────────────────────

function ConfidenceBar({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
        <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)', fontFamily: 'JetBrains Mono' }}>{label}</span>
        <span style={{ fontSize: 9, fontWeight: 700, color, fontFamily: 'Space Grotesk' }}>
          {Math.round(value * 100)}%
        </span>
      </div>
      <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
        <motion.div
          animate={{ width: `${value * 100}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          style={{ height: '100%', background: color, borderRadius: 99 }}
        />
      </div>
    </div>
  )
}

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
  )}

export const AegisConsole: React.FC<AegisConsoleProps> = ({ state, currentPage }) => {
  const [activeTab, setActiveTab] = useState<Tab>('trust')
  const {
    trustScore, decision, cognitiveState, cognitiveStability = 1,
    similarity, driftDetected, driftSeverity = 'none',
    velocity, acceleration, entropy, anomalyScore = 0, fraudProbability = 0,
    intentVector = { coercion_probability: 0, takeover_probability: 0, anomaly_severity: 0, robotic_probability: 0 },
    isConnected, timeline, eventCount, latencyMs, confidence = 1,
    reasons = [], explanation = '',
    sdkState = 'OBSERVING',
    liveActivity,
  } = state

  const trustColor = trustScore > 85 ? '#10B981' : trustScore > 60 ? '#F59E0B' : '#EF4444'

  // Format session duration
  const sessionSec = Math.floor((liveActivity?.sessionDurationMs ?? 0) / 1000)
  const sessionMin = Math.floor(sessionSec / 60)
  const sessionDisplay = sessionMin > 0
    ? `${sessionMin}m ${sessionSec % 60}s`
    : `${sessionSec}s`

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
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <LiveBadge connected={isConnected} />
            <SDKStateBadge sdkState={sdkState} />
          </div>
          <span style={{ fontSize: 7, color: 'rgba(255,255,255,0.2)', fontFamily: 'JetBrains Mono' }}>
            {currentPage.toUpperCase()} · W#{eventCount}
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
                  <div>▸ SDK State: <span style={{ color: SDK_STATE_COLORS[sdkState] }}>{sdkState}</span></div>
                  <div>▸ Current Screen: <span style={{ color: '#10B981' }}>{currentPage.toUpperCase()}</span></div>
                  <div>▸ Activity: <span style={{ color: '#94A3B8' }}>{liveActivity?.currentActivity ?? '—'}</span></div>
                  <div>▸ Session Duration: <span style={{ color: '#3B82F6' }}>{sessionDisplay}</span></div>
                  <div>▸ Windows Collected: <span style={{ color: '#3B82F6' }}>{eventCount}</span></div>
                  <div>▸ Adaptive Verification: <span style={{ color: decision === 'STEP_UP' ? '#F59E0B' : '#10B981' }}>{decision === 'STEP_UP' ? 'ACTIVE' : 'STANDBY'}</span></div>
                </div>
              </Section>

              <Section title="Adaptive Learning">
                <MetricRow label="Profile Version" value={`v${Math.max(1, Math.floor(eventCount / 15))}`} color="#8B5CF6" />
                <MetricRow
                  label="Learning Confidence"
                  value={`${Math.min(100, Math.round((liveActivity?.behaviorConfidence ?? 0) * 100))}%`}
                  color={(liveActivity?.behaviorConfidence ?? 0) > 0.7 ? '#10B981' : '#F59E0B'}
                />
                <MetricRow
                  label="Learning Status"
                  value={
                    (liveActivity?.behaviorConfidence ?? 0) > 0.8 ? 'STABLE'
                    : (liveActivity?.behaviorConfidence ?? 0) > 0.3 ? 'LEARNING'
                    : 'ENROLLING'
                  }
                  color={
                    (liveActivity?.behaviorConfidence ?? 0) > 0.8 ? '#10B981'
                    : (liveActivity?.behaviorConfidence ?? 0) > 0.3 ? '#8B5CF6'
                    : '#F59E0B'
                  }
                />
                <MetricRow label="Adaptive Threshold" value={`${trustScore > 80 ? '↑' : '→'} ${(0.70 + (liveActivity?.behaviorConfidence ?? 0) * 0.18).toFixed(2)}`} color="rgba(255,255,255,0.5)" />
                <MetricRow
                  label="Session Learning"
                  value={trustScore > 90 ? 'LEARN' : trustScore > 70 ? 'OBSERVE' : 'REJECT'}
                  color={trustScore > 90 ? '#10B981' : trustScore > 70 ? '#F59E0B' : '#EF4444'}
                />
              </Section>
            </motion.div>
          )}

          {activeTab === 'session' && (
            <motion.div key="session" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>

              <Section title="Live Session Status">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 8 }}>
                  {[
                    { label: 'SDK State', value: sdkState, color: SDK_STATE_COLORS[sdkState] },
                    { label: 'Current Screen', value: currentPage.toUpperCase(), color: '#10B981' },
                    { label: 'Session Time', value: sessionDisplay, color: '#3B82F6' },
                    { label: 'Windows', value: String(eventCount), color: '#8B5CF6' },
                  ].map(item => (
                    <div key={item.label} style={{
                      background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
                      borderRadius: 8, padding: '7px 8px',
                    }}>
                      <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.25)', fontFamily: 'JetBrains Mono', marginBottom: 3 }}>{item.label}</div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: item.color, fontFamily: 'Space Grotesk' }}>{item.value}</div>
                    </div>
                  ))}
                </div>
              </Section>

              <Section title="Current Activity">
                <div style={{
                  background: 'rgba(16,185,129,0.04)', border: '1px solid rgba(16,185,129,0.1)',
                  borderRadius: 8, padding: '8px 10px',
                }}>
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)', fontFamily: 'Space Grotesk', lineHeight: 1.5 }}>
                    {liveActivity?.currentActivity ?? 'Initializing...'}
                  </div>
                </div>
              </Section>

              <Section title="Behavior Confidence">
                <ConfidenceBar
                  value={liveActivity?.behaviorConfidence ?? 0}
                  label="Baseline Confidence"
                  color={
                    (liveActivity?.behaviorConfidence ?? 0) > 0.7 ? '#10B981'
                    : (liveActivity?.behaviorConfidence ?? 0) > 0.4 ? '#F59E0B'
                    : '#EF4444'
                  }
                />
                <ConfidenceBar
                  value={Math.min(1, eventCount / 30)}
                  label="Learning Progress"
                  color="#8B5CF6"
                />
                <MetricRow
                  label="Trust Signal"
                  value={`${trustScore.toFixed(0)}%`}
                  color={trustScore > 80 ? '#10B981' : trustScore > 60 ? '#F59E0B' : '#EF4444'}
                />
                <MetricRow
                  label="Risk Level"
                  value={state.trustLevel?.toUpperCase() ?? 'HIGH'}
                  color={state.trustLevel === 'high' ? '#10B981' : state.trustLevel === 'elevated' ? '#F59E0B' : '#EF4444'}
                />
              </Section>

              <Section title="Session Timeline">
                <div style={{ position: 'relative', paddingLeft: 12 }}>
                  {/* Vertical timeline line */}
                  <div style={{
                    position: 'absolute', left: 4, top: 4, bottom: 4,
                    width: 1, background: 'rgba(255,255,255,0.07)',
                  }} />
                  {/* Timeline entries from latest state changes */}
                  {state.timeline.slice(-8).reverse().map((entry, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'flex-start' }}>
                      <div style={{
                        width: 6, height: 6, borderRadius: '50%', flexShrink: 0, marginTop: 2,
                        background: entry.decision === 'ALLOW' ? '#10B981' : entry.decision === 'STEP_UP' ? '#F59E0B' : '#EF4444',
                      }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 8, fontWeight: 700, color: 'rgba(255,255,255,0.6)', fontFamily: 'Space Grotesk' }}>
                            {entry.current_screen?.toUpperCase() ?? '—'}
                          </span>
                          <span style={{ fontSize: 7, color: 'rgba(255,255,255,0.2)', fontFamily: 'JetBrains Mono' }}>
                            {entry.time}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: 4, marginTop: 2 }}>
                          <span style={{ fontSize: 7, color: 'rgba(255,255,255,0.3)', fontFamily: 'JetBrains Mono' }}>
                            T={entry.trust.toFixed(0)}%
                          </span>
                          <span style={{ fontSize: 7, color: entry.sdk_state ? SDK_STATE_COLORS[entry.sdk_state] : '#6B7280', fontFamily: 'JetBrains Mono' }}>
                            {entry.sdk_state ?? '—'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {state.timeline.length === 0 && (
                    <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.2)', fontFamily: 'JetBrains Mono', paddingLeft: 12 }}>
                      Awaiting first window...
                    </div>
                  )}
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
              <Section title="Live Behavior Stream">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.25)', fontFamily: 'JetBrains Mono' }}>
                    {eventCount} windows · 2s cadence
                  </span>
                  <span style={{ fontSize: 7, color: '#10B981', fontFamily: 'JetBrains Mono' }}>CONTINUOUS</span>
                </div>
                <SessionEventLog timeline={state.timeline} eventCount={eventCount} />
              </Section>

              <Section title="Pipeline Health">
                <MetricRow label="Avg Latency" value={`${latencyMs.toFixed(0)}ms`} color="#8B5CF6" />
                <MetricRow label="Target Latency" value="<100ms" color="rgba(255,255,255,0.3)" />
                <MetricRow label="Window Interval" value="2 000ms" color="rgba(255,255,255,0.4)" />
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