/**
 * Verification Center — Unified dashboard for identity verification,
 * enrollment status, delegate management, and verification history.
 */
import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Shield, Mic, Camera, Users, History, Activity, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react'
import {
  getVerificationHistory,
  getDelegates,
  getProvidersStatus,
  getEngineStatus,
  registerDelegate,
  VerificationChallenge,
  Delegate,
  ProviderStatus,
} from '../../services/verificationApi'

type Tab = 'overview' | 'enrollment' | 'delegates' | 'history'

const STATUS_COLORS: Record<string, string> = {
  SUCCESS: '#10B981',
  FAILED: '#EF4444',
  PENDING: '#F59E0B',
  HELD: '#8B5CF6',
  IN_PROGRESS: '#3B82F6',
  EXPIRED: '#6B7280',
}

const TYPE_ICONS: Record<string, typeof Shield> = {
  VOICE_CHALLENGE: Mic,
  FACE_LIVENESS: Camera,
  DELEGATE_VERIFY: Users,
  PASSIVE_OBSERVE: Activity,
  HOLD_AND_NOTIFY: AlertTriangle,
}


function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.3)', fontFamily: 'JetBrains Mono', textTransform: 'uppercase', marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  )
}

function MetricCard({ label, value, color, icon: Icon }: { label: string; value: string; color: string; icon?: any }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        {Icon && <Icon size={14} color={color} />}
        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', fontFamily: 'JetBrains Mono' }}>{label}</span>
      </div>
      <div style={{ fontSize: 18, fontWeight: 800, color, fontFamily: 'Space Grotesk' }}>{value}</div>
    </div>
  )
}

const VerificationCenter: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [history, setHistory] = useState<VerificationChallenge[]>([])
  const [delegates, setDelegates] = useState<Delegate[]>([])
  const [providers, setProviders] = useState<ProviderStatus | null>(null)
  const [engineStats, setEngineStats] = useState<any>(null)
  const userId = 'demo_user'

  useEffect(() => {
    getVerificationHistory(userId).then(r => setHistory(r.history || []))
    getDelegates(userId).then(r => setDelegates(r.delegates || []))
    getProvidersStatus().then(setProviders)
    getEngineStatus().then(setEngineStats)
  }, [])

  const tabs = [
    { key: 'overview' as Tab, label: 'Overview', icon: Shield },
    { key: 'enrollment' as Tab, label: 'Enrollment', icon: CheckCircle },
    { key: 'delegates' as Tab, label: 'Delegates', icon: Users },
    { key: 'history' as Tab, label: 'History', icon: History },
  ]

  return (
    <div style={{ padding: '20px 24px', height: 'calc(100vh - 80px)', overflowY: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Shield size={18} color="#8B5CF6" />
        </div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'white', fontFamily: 'Space Grotesk' }}>Verification Center</div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontFamily: 'JetBrains Mono' }}>Adaptive Identity Verification Framework</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 1 }}>
        {tabs.map(tab => {
          const Icon = tab.icon
          const active = activeTab === tab.key
          return (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
              padding: '8px 16px', border: 'none', cursor: 'pointer', borderRadius: '8px 8px 0 0',
              background: active ? 'rgba(139,92,246,0.1)' : 'transparent',
              borderBottom: active ? '2px solid #8B5CF6' : '2px solid transparent',
              display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s',
            }}>
              <Icon size={13} color={active ? '#8B5CF6' : 'rgba(255,255,255,0.3)'} />
              <span style={{ fontSize: 11, color: active ? '#8B5CF6' : 'rgba(255,255,255,0.4)', fontFamily: 'Space Grotesk', fontWeight: active ? 700 : 500 }}>{tab.label}</span>
            </button>
          )
        })}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <motion.div key="overview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Section title="Engine Status">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                <MetricCard label="Total Verifications" value={String(engineStats?.total_verifications ?? 0)} color="#8B5CF6" icon={Shield} />
                <MetricCard label="Voice Profiles" value={String(engineStats?.enrolled_voice_profiles ?? 0)} color="#3B82F6" icon={Mic} />
                <MetricCard label="Face Profiles" value={String(engineStats?.enrolled_face_profiles ?? 0)} color="#10B981" icon={Camera} />
                <MetricCard label="Trusted Delegates" value={String(engineStats?.total_delegates ?? 0)} color="#F59E0B" icon={Users} />
              </div>
            </Section>

            <Section title="Registered Providers">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {providers && Object.entries(providers).map(([key, value]) => (
                  <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontFamily: 'JetBrains Mono' }}>{key.replace(/_/g, ' ')}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: value ? '#10B981' : '#6B7280', fontFamily: 'Space Grotesk' }}>{value || 'Not registered'}</span>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Verification Policy">
              <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono', color: 'rgba(255,255,255,0.5)', lineHeight: 2 }}>
                <div>▸ Trust {'>'} 90% → <span style={{ color: '#10B981' }}>Continue (no verification)</span></div>
                <div>▸ Trust 70–90% → <span style={{ color: '#3B82F6' }}>Passive Observation</span></div>
                <div>▸ Trust 50–70% → <span style={{ color: '#F59E0B' }}>Voice Challenge (Speaker Verification)</span></div>
                <div>▸ Trust {'<'} 50% → <span style={{ color: '#EF4444' }}>Face Liveness Challenge</span></div>
                <div>▸ Critical {'<'} 30% → <span style={{ color: '#8B5CF6' }}>Transaction Hold + Notify</span></div>
              </div>
            </Section>
          </motion.div>
        )}

        {activeTab === 'enrollment' && (
          <motion.div key="enrollment" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <EnrollmentWizard userId={userId} />
          </motion.div>
        )}

        {activeTab === 'delegates' && (
          <motion.div key="delegates" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <DelegateManager userId={userId} delegates={delegates} onRefresh={() => getDelegates(userId).then(r => setDelegates(r.delegates || []))} />
          </motion.div>
        )}

        {activeTab === 'history' && (
          <motion.div key="history" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <VerificationHistoryView history={history} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}


// ─── ENROLLMENT WIZARD ───────────────────────────────────────────────────────

type EnrollmentStep = 'personal' | 'government_id' | 'face' | 'voice' | 'behavior' | 'complete'

const ENROLLMENT_STEPS: { key: EnrollmentStep; label: string; description: string }[] = [
  { key: 'personal', label: 'Personal Details', description: 'Name, contact, account information' },
  { key: 'government_id', label: 'Government ID', description: 'Upload identity document (placeholder)' },
  { key: 'face', label: 'Face Enrollment', description: 'Capture face template (provider placeholder)' },
  { key: 'voice', label: 'Voice Enrollment', description: 'Record voiceprint (provider placeholder)' },
  { key: 'behavior', label: 'Behavior Learning', description: 'Behavioral baseline calibration' },
  { key: 'complete', label: 'Complete', description: 'Enrollment successful' },
]

function EnrollmentWizard({ userId }: { userId: string }) {
  const [step, setStep] = useState<EnrollmentStep>('personal')
  const currentIdx = ENROLLMENT_STEPS.findIndex(s => s.key === step)

  const next = () => {
    const nextIdx = currentIdx + 1
    if (nextIdx < ENROLLMENT_STEPS.length) setStep(ENROLLMENT_STEPS[nextIdx].key)
  }
  const prev = () => {
    const prevIdx = currentIdx - 1
    if (prevIdx >= 0) setStep(ENROLLMENT_STEPS[prevIdx].key)
  }

  return (
    <div>
      {/* Step indicator */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24 }}>
        {ENROLLMENT_STEPS.map((s, i) => (
          <div key={s.key} style={{ flex: 1 }}>
            <div style={{ height: 3, borderRadius: 2, background: i <= currentIdx ? '#8B5CF6' : 'rgba(255,255,255,0.08)', transition: 'background 0.3s' }} />
            <div style={{ fontSize: 8, color: i <= currentIdx ? '#8B5CF6' : 'rgba(255,255,255,0.2)', fontFamily: 'JetBrains Mono', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Step content */}
      <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: 24, minHeight: 200 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'white', fontFamily: 'Space Grotesk', marginBottom: 6 }}>{ENROLLMENT_STEPS[currentIdx].label}</div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: 'Space Grotesk', marginBottom: 20 }}>{ENROLLMENT_STEPS[currentIdx].description}</div>

        {step === 'personal' && <PersonalDetailsForm />}
        {step === 'government_id' && <PlaceholderStep icon={Shield} text="Government ID upload will be handled by the document verification provider. Upload area and OCR integration placeholder." />}
        {step === 'face' && <PlaceholderStep icon={Camera} text="Face enrollment camera capture will be handled by the IFaceEnrollmentProvider. Camera preview, guided capture, and quality feedback placeholder." />}
        {step === 'voice' && <PlaceholderStep icon={Mic} text="Voice enrollment recording will be handled by the IVoiceEnrollmentProvider. Phrase display, recording UI, and quality meter placeholder." />}
        {step === 'behavior' && <PlaceholderStep icon={Activity} text="Behavioral baseline calibration is handled automatically by the Continuous Monitoring SDK. The system requires 5+ behavioral windows to establish a profile." />}
        {step === 'complete' && <div style={{ textAlign: 'center', padding: 20 }}><CheckCircle size={48} color="#10B981" /><div style={{ fontSize: 16, fontWeight: 700, color: '#10B981', fontFamily: 'Space Grotesk', marginTop: 12 }}>Enrollment Complete</div><div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 6 }}>All biometric profiles are ready for adaptive verification.</div></div>}
      </motion.div>

      {/* Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
        <button onClick={prev} disabled={currentIdx === 0} style={{ padding: '8px 20px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: currentIdx === 0 ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.6)', fontSize: 11, cursor: currentIdx === 0 ? 'default' : 'pointer', fontFamily: 'Space Grotesk' }}>Previous</button>
        {step !== 'complete' && <button onClick={next} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#8B5CF6', color: 'white', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Space Grotesk' }}>Next Step</button>}
      </div>
    </div>
  )
}

function PersonalDetailsForm() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      {['Full Name', 'Email', 'Phone', 'Account ID'].map(field => (
        <div key={field}>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', fontFamily: 'JetBrains Mono', marginBottom: 4 }}>{field}</div>
          <div style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', fontSize: 11, color: 'rgba(255,255,255,0.6)', fontFamily: 'Space Grotesk' }}>
            {field === 'Full Name' ? 'Rahul Verma' : field === 'Email' ? 'rahul@bank.com' : field === 'Phone' ? '+91 98765 43210' : 'ACC-2026-0042'}
          </div>
        </div>
      ))}
    </div>
  )
}

function PlaceholderStep({ icon: Icon, text }: { icon: any; text: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: 16 }}>
      <div style={{ width: 56, height: 56, borderRadius: 14, background: 'rgba(139,92,246,0.08)', border: '1px dashed rgba(139,92,246,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
        <Icon size={24} color="#8B5CF6" />
      </div>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: 'Space Grotesk', lineHeight: 1.7, maxWidth: 400 }}>{text}</div>
      <div style={{ marginTop: 12, padding: '4px 12px', borderRadius: 20, background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)' }}>
        <span style={{ fontSize: 9, color: '#8B5CF6', fontFamily: 'JetBrains Mono', fontWeight: 700 }}>PROVIDER PLACEHOLDER</span>
      </div>
    </div>
  )
}


// ─── DELEGATE MANAGER ────────────────────────────────────────────────────────

function DelegateManager({ userId, delegates, onRefresh }: { userId: string; delegates: Delegate[]; onRefresh: () => void }) {
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [relationship, setRelationship] = useState('')

  const handleAdd = async () => {
    if (!name || !relationship) return
    await registerDelegate({ primary_user_id: userId, name, relationship })
    setName('')
    setRelationship('')
    setAdding(false)
    onRefresh()
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', fontFamily: 'Space Grotesk' }}>
          {delegates.length} / 3 delegates registered
        </div>
        {delegates.length < 3 && (
          <button onClick={() => setAdding(true)} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: '#8B5CF6', color: 'white', fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: 'Space Grotesk' }}>+ Add Delegate</button>
        )}
      </div>

      {adding && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} style={{ background: 'rgba(139,92,246,0.04)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', fontFamily: 'JetBrains Mono', marginBottom: 4 }}>Full Name</div>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Enter name" style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)', color: 'white', fontSize: 11, fontFamily: 'Space Grotesk', outline: 'none' }} />
            </div>
            <div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', fontFamily: 'JetBrains Mono', marginBottom: 4 }}>Relationship</div>
              <input value={relationship} onChange={e => setRelationship(e.target.value)} placeholder="e.g. spouse, parent" style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)', color: 'white', fontSize: 11, fontFamily: 'Space Grotesk', outline: 'none' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleAdd} style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: '#10B981', color: 'white', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>Confirm</button>
            <button onClick={() => setAdding(false)} style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(255,255,255,0.4)', fontSize: 10, cursor: 'pointer' }}>Cancel</button>
          </div>
        </motion.div>
      )}

      {/* Delegate list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {delegates.map(d => (
          <div key={d.delegate_id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={16} color="#F59E0B" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'white', fontFamily: 'Space Grotesk' }}>{d.name}</div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', fontFamily: 'JetBrains Mono' }}>{d.relationship} · {d.is_active ? 'Active' : 'Disabled'}</div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {d.has_voice && <Mic size={12} color="#3B82F6" />}
              {d.has_face && <Camera size={12} color="#10B981" />}
              {d.has_behavioral && <Activity size={12} color="#8B5CF6" />}
            </div>
          </div>
        ))}
        {delegates.length === 0 && (
          <div style={{ textAlign: 'center', padding: 24, color: 'rgba(255,255,255,0.3)', fontSize: 11, fontFamily: 'Space Grotesk' }}>No trusted delegates registered. Add up to 3 delegates.</div>
        )}
      </div>
    </div>
  )
}

// ─── VERIFICATION HISTORY ────────────────────────────────────────────────────

function VerificationHistoryView({ history }: { history: VerificationChallenge[] }) {
  if (history.length === 0) {
    return <div style={{ textAlign: 'center', padding: 40, color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>No verification history yet.</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {history.slice().reverse().map((v, i) => {
        const Icon = TYPE_ICONS[v.verification_type] || Shield
        const statusColor = STATUS_COLORS[v.status] || '#6B7280'
        return (
          <motion.div key={i} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
            style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: `${statusColor}12`, border: `1px solid ${statusColor}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon size={14} color={statusColor} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'white', fontFamily: 'Space Grotesk' }}>{v.verification_type.replace(/_/g, ' ')}</span>
                <span style={{ fontSize: 9, fontWeight: 700, color: statusColor, fontFamily: 'JetBrains Mono' }}>{v.status}</span>
              </div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', fontFamily: 'JetBrains Mono', marginTop: 3 }}>
                Risk: {v.risk_source} · Confidence: {Math.round(v.confidence * 100)}% · Latency: {v.latency_ms.toFixed(0)}ms
              </div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontFamily: 'Space Grotesk', marginTop: 3 }}>
                Trust: {(v.trust_before * 100).toFixed(0)}% → {(v.trust_after * 100).toFixed(0)}%
              </div>
              {v.reason && <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', fontFamily: 'JetBrains Mono', marginTop: 3, fontStyle: 'italic' }}>{v.reason}</div>}
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}

export default VerificationCenter
