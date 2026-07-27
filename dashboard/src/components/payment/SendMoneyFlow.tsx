import React, { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { ArrowLeft, ArrowRight, Check, ChevronRight, Loader, Mic, Camera, Shield } from 'lucide-react'
import { CONTACTS } from './bankData'
import { AnimatedNumber } from '../common/AnimatedNumber'
import { initiateVerification, verifyVoice, verifyFace, VerificationChallenge } from '../../services/verificationApi'

type FlowStep = 'contacts' | 'amount' | 'review' | 'pin' | 'processing' | 'success' | 'voice_verify' | 'face_verify'

interface SendMoneyFlowProps {
  trustScore: number
  onBack: () => void
  onBlock: () => void
  onStepUp: () => void
  onSuccess: (amount: number, contact: (typeof CONTACTS)[0]) => void
  currentStep: FlowStep
  onStepChange: (step: FlowStep) => void
}

const PIN_LENGTH = 6

export const SendMoneyFlow: React.FC<SendMoneyFlowProps> = ({
  trustScore, onBack, onBlock, onStepUp, onSuccess, currentStep, onStepChange,
}) => {
  const [selectedContact, setSelectedContact] = useState(CONTACTS[0])
  const [amount, setAmount] = useState('')
  const [pin, setPin] = useState('')
  const [challenge, setChallenge] = useState<VerificationChallenge | null>(null)
  const [verifying, setVerifying] = useState(false)
  const [verificationResult, setVerificationResult] = useState<string | null>(null)
  const [trustAtPayment, setTrustAtPayment] = useState(95) // Captured at payment time
  const inputRef = useRef<HTMLInputElement>(null)

  const steps = ['contacts', 'amount', 'review', 'pin', 'processing', 'success']
  const stepIndex = steps.indexOf(currentStep)

  const handleAmountNext = () => {
    if (!amount || Number(amount) <= 0) return
    onStepChange('review')
  }

  const handleConfirmPay = async () => {
    // Capture trust at this exact moment
    const currentTrust = trustScore
    setTrustAtPayment(currentTrust)

    // AEGIS-X CORE IDEA:
    // Trust > 90% → NO extra verification needed. Behavioral biometrics already
    //               confirmed identity. Go directly to MPIN. This is the innovation.
    // Trust 50-90% → Adaptive verification: voice challenge (speak phrase)
    // Trust < 50%  → Stronger verification: face liveness (blink/smile/turn)
    // Trust critically low + coercion → HOLD transaction

    if (currentTrust > 90) {
      // HIGH TRUST: Behavior matches enrolled user → proceed to MPIN directly
      // No OTP, no face, no voice. This IS the AEGIS-X value proposition.
      onStepChange('pin')
      return
    }

    // Trust has degraded — something is off. Adaptive verification required.
    try {
      const ch = await initiateVerification({
        user_id: 'demo_user',
        session_id: 'sess_payment',
        trust_score: currentTrust / 100,
        cognitive_state: currentTrust > 70 ? 'focused' : currentTrust > 50 ? 'distressed' : 'panicked',
        drift_detected: currentTrust < 80,
        drift_severity: currentTrust < 50 ? 'high' : currentTrust < 70 ? 'medium' : 'low',
        transaction_amount: Number(amount),
        reasons: ['Behavioral anomaly detected — verification required'],
      })
      setChallenge(ch)

      if (ch.verification_type === 'HOLD_AND_NOTIFY') {
        onBlock() // Coercion/robotic detected — hold everything
      } else if (currentTrust < 50) {
        onStepChange('face_verify') // Serious concern → face liveness
      } else {
        onStepChange('voice_verify') // Moderate concern → voice phrase
      }
    } catch {
      // Backend unavailable — for demo, use face verify as fallback
      setChallenge({
        challenge_id: 'demo_fallback',
        user_id: 'demo_user',
        session_id: 'sess_payment',
        verification_type: currentTrust < 50 ? 'FACE_LIVENESS' : 'VOICE_CHALLENGE',
        risk_source: 'behavioral_drift',
        status: 'PENDING',
        trust_before: currentTrust / 100,
        trust_after: 0,
        confidence: 0,
        latency_ms: 0,
        phrase: 'My voice is my identity',
        liveness_actions: ['blink', 'turn_left'],
        matched_delegate_id: '',
        reason: 'Behavioral anomaly',
        explanation: '',
        created_at: new Date().toISOString(),
        completed_at: '',
      } as any)
      onStepChange(currentTrust < 50 ? 'face_verify' : 'voice_verify')
    }
  }

  const handleVoiceVerifyComplete = async () => {
    if (!challenge) { onStepChange('pin'); return }
    setVerifying(true)
    try {
      const fakeAudio = btoa(String.fromCharCode(...Array.from({length: 100}, () => Math.floor(Math.random() * 256))))
      const result = await verifyVoice(challenge.challenge_id, fakeAudio)
      if (result.status === 'SUCCESS' || result.verified) {
        setVerificationResult('✓ Voice verified — identity confirmed')
        setTimeout(() => { setVerificationResult(null); onStepChange('pin') }, 1500)
      } else {
        setVerificationResult('✗ Voice mismatch — transaction blocked')
        setTimeout(() => { setVerificationResult(null); onBlock() }, 2000)
      }
    } catch {
      // Backend unavailable — accept for demo purposes
      setVerificationResult('✓ Voice accepted')
      setTimeout(() => { setVerificationResult(null); onStepChange('pin') }, 1200)
    }
    setVerifying(false)
  }

  const handleFaceVerifyComplete = async () => {
    if (!challenge) { onStepChange('pin'); return }
    setVerifying(true)
    try {
      const fakeImage = btoa(String.fromCharCode(...Array.from({length: 200}, () => Math.floor(Math.random() * 256))))
      const result = await verifyFace(challenge.challenge_id, fakeImage, challenge.liveness_actions || ['blink', 'smile'])
      if (result.status === 'SUCCESS' || result.verified) {
        setVerificationResult('✓ Face verified — liveness confirmed')
        setTimeout(() => { setVerificationResult(null); onStepChange('pin') }, 1500)
      } else {
        setVerificationResult('✗ Face mismatch — transaction blocked')
        setTimeout(() => { setVerificationResult(null); onBlock() }, 2000)
      }
    } catch {
      // Backend unavailable — accept for demo
      setVerificationResult('✓ Liveness accepted')
      setTimeout(() => { setVerificationResult(null); onStepChange('pin') }, 1200)
    }
    setVerifying(false)
  }

  const handlePinDigit = (d: string) => {
    if (pin.length >= PIN_LENGTH) return
    const newPin = pin + d
    setPin(newPin)
    if (newPin.length === PIN_LENGTH) {
      onStepChange('processing')
      setTimeout(() => {
        onStepChange('success')
        onSuccess(Number(amount), selectedContact)
      }, 1800)
    }
  }

  const handlePinDelete = () => setPin(p => p.slice(0, -1))

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Step header */}
      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        {currentStep !== 'success' && (
          <button
            onClick={stepIndex > 0 ? () => onStepChange(steps[stepIndex - 1] as FlowStep) : onBack}
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '5px', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', display: 'flex' }}
          >
            <ArrowLeft size={13} />
          </button>
        )}
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'white', fontFamily: 'Space Grotesk' }}>
            {currentStep === 'contacts' ? 'Send Money' :
             currentStep === 'amount' ? `To ${selectedContact.name}` :
             currentStep === 'review' ? 'Review Payment' :
             currentStep === 'pin' ? 'Enter UPI PIN' :
             currentStep === 'processing' ? 'Processing...' : 'Payment Sent!'}
          </div>
          {currentStep !== 'success' && currentStep !== 'processing' && (
            <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', fontFamily: 'JetBrains Mono' }}>
              Step {stepIndex + 1} of 4
            </div>
          )}
        </div>
        {/* Step dots */}
        {currentStep !== 'success' && currentStep !== 'processing' && (
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
            {['contacts', 'amount', 'review', 'pin'].map((s, i) => (
              <div key={s} style={{ width: 6, height: 6, borderRadius: '50%', background: i <= stepIndex ? '#10B981' : 'rgba(255,255,255,0.1)' }} />
            ))}
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <AnimatePresence mode="wait">

          {/* STEP 1: Contact Picker */}
          {currentStep === 'contacts' && (
            <motion.div key="contacts" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} style={{ padding: '12px 16px' }}>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontFamily: 'JetBrains Mono', marginBottom: 10, textTransform: 'uppercase' }}>Recent Contacts</div>
              {CONTACTS.map((c, i) => (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => { setSelectedContact(c); onStepChange('amount') }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px', borderRadius: 12, marginBottom: 6, cursor: 'pointer',
                    border: `1px solid ${c.isNew ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.05)'}`,
                    background: c.isNew ? 'rgba(239,68,68,0.04)' : 'rgba(255,255,255,0.02)',
                  }}
                >
                  <div style={{
                    width: 38, height: 38, borderRadius: 12, flexShrink: 0,
                    background: `${c.color}20`, border: `1px solid ${c.color}30`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 700, color: c.color, fontFamily: 'Space Grotesk',
                  }}>
                    {c.initials}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: c.isNew ? '#EF4444' : 'white', fontFamily: 'Space Grotesk' }}>{c.name}</div>
                    <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', fontFamily: 'JetBrains Mono' }}>{c.upi}</div>
                  </div>
                  {c.isNew && <span style={{ fontSize: 7, color: '#EF4444', background: 'rgba(239,68,68,0.1)', padding: '2px 6px', borderRadius: 4, fontFamily: 'JetBrains Mono' }}>NEW</span>}
                  <ChevronRight size={13} color="rgba(255,255,255,0.25)" />
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* STEP 2: Amount Entry */}
          {currentStep === 'amount' && (
            <motion.div key="amount" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              style={{ padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

              {/* Contact chip */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 20, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', marginBottom: 20 }}>
                <div style={{ width: 24, height: 24, borderRadius: 8, background: `${selectedContact.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: selectedContact.color }}>
                  {selectedContact.initials}
                </div>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontFamily: 'Space Grotesk' }}>{selectedContact.name}</span>
                <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', fontFamily: 'JetBrains Mono' }}>{selectedContact.upi}</span>
              </div>

              {/* Amount display */}
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <div style={{ fontSize: 42, fontWeight: 900, color: amount ? 'white' : 'rgba(255,255,255,0.2)', fontFamily: 'Space Grotesk', letterSpacing: '-1px' }}>
                  ₹{amount ? Number(amount).toLocaleString() : '0'}
                </div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', fontFamily: 'JetBrains Mono', marginTop: 4 }}>TAP AMOUNT BELOW</div>
              </div>

              {/* Quick amounts */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
                {['500', '1000', '2000', '5000', '10000', '50000'].map(v => (
                  <motion.button key={v} whileTap={{ scale: 0.95 }}
                    onClick={() => setAmount(v)}
                    style={{
                      padding: '6px 12px', borderRadius: 20, border: `1px solid ${amount === v ? '#3B82F6' : 'rgba(255,255,255,0.08)'}`,
                      background: amount === v ? 'rgba(59,130,246,0.1)' : 'transparent',
                      color: amount === v ? '#3B82F6' : 'rgba(255,255,255,0.5)',
                      fontSize: 10, cursor: 'pointer', fontFamily: 'Space Grotesk', fontWeight: 600,
                    }}>
                    ₹{Number(v).toLocaleString()}
                  </motion.button>
                ))}
              </div>

              {/* Numpad */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, width: '100%', maxWidth: 240 }}>
                {['1','2','3','4','5','6','7','8','9','.','0','⌫'].map(k => (
                  <motion.button key={k} whileTap={{ scale: 0.92 }}
                    onClick={() => {
                      if (k === '⌫') setAmount(a => a.slice(0, -1))
                      else if (k === '.' && amount.includes('.')) return
                      else setAmount(a => a + k)
                    }}
                    style={{
                      height: 44, borderRadius: 10, border: '1px solid rgba(255,255,255,0.07)',
                      background: 'rgba(255,255,255,0.03)', color: 'white',
                      fontSize: 16, fontWeight: k === '⌫' ? 400 : 500, cursor: 'pointer', fontFamily: 'Space Grotesk',
                    }}>
                    {k}
                  </motion.button>
                ))}
              </div>

              <motion.button whileTap={{ scale: 0.97 }}
                onClick={handleAmountNext}
                disabled={!amount || Number(amount) <= 0}
                style={{
                  width: '100%', maxWidth: 240, height: 44, marginTop: 14, borderRadius: 12,
                  border: 'none', background: 'linear-gradient(135deg, #3B82F6, #2563EB)',
                  color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  fontFamily: 'Space Grotesk', opacity: amount ? 1 : 0.4,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}>
                Continue <ArrowRight size={14} />
              </motion.button>
            </motion.div>
          )}

          {/* STEP 3: Review */}
          {currentStep === 'review' && (
            <motion.div key="review" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} style={{ padding: '16px' }}>
              <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 14, border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden', marginBottom: 14 }}>
                <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontFamily: 'JetBrains Mono', marginBottom: 4 }}>PAYING TO</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: `${selectedContact.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: selectedContact.color }}>{selectedContact.initials}</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'white', fontFamily: 'Space Grotesk' }}>{selectedContact.name}</div>
                      <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', fontFamily: 'JetBrains Mono' }}>{selectedContact.upi}</div>
                    </div>
                  </div>
                </div>
                {[
                  { label: 'Amount', value: `₹${Number(amount).toLocaleString()}` },
                  { label: 'From', value: 'Savings A/C ••4521' },
                  { label: 'Bank', value: 'Central Bank of India' },
                  { label: 'UPI Reference', value: `UPI${Date.now().toString().slice(-8)}` },
                ].map(row => (
                  <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 16px', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontFamily: 'JetBrains Mono' }}>{row.label}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'white', fontFamily: 'Space Grotesk' }}>{row.value}</span>
                  </div>
                ))}
              </div>

              {selectedContact.isNew && (
                <div style={{ padding: '8px 12px', borderRadius: 10, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', marginBottom: 12, fontSize: 9, color: '#F87171', fontFamily: 'JetBrains Mono' }}>
                  ⚠ New beneficiary — first time transfer
                </div>
              )}

              <motion.button whileTap={{ scale: 0.97 }} onClick={handleConfirmPay}
                style={{
                  width: '100%', height: 46, borderRadius: 12, border: 'none',
                  background: 'linear-gradient(135deg, #10B981, #059669)',
                  color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  fontFamily: 'Space Grotesk', boxShadow: '0 4px 20px rgba(16,185,129,0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}>
                Pay ₹{Number(amount).toLocaleString()} <ArrowRight size={14} />
              </motion.button>
            </motion.div>
          )}

          {/* VOICE VERIFICATION CHALLENGE */}
          {currentStep === 'voice_verify' && (
            <motion.div key="voice_verify" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                <Mic size={24} color="#8B5CF6" />
              </div>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#8B5CF6', fontFamily: 'Space Grotesk', marginBottom: 6 }}>Voice Verification</div>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', textAlign: 'center', lineHeight: 1.6, marginBottom: 12, fontFamily: 'Space Grotesk' }}>
                AEGIS-X detected elevated risk. Speak the phrase below to confirm your identity.
              </p>
              {challenge && (
                <div style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 10, padding: '10px 16px', marginBottom: 16 }}>
                  <div style={{ fontSize: 12, color: '#8B5CF6', fontWeight: 700, fontFamily: 'Space Grotesk', fontStyle: 'italic', textAlign: 'center' }}>
                    "{challenge.phrase || 'My voice is my identity'}"
                  </div>
                </div>
              )}
              {verificationResult ? (
                <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} style={{ fontSize: 12, fontWeight: 700, color: verificationResult.includes('✓') ? '#10B981' : '#EF4444', fontFamily: 'Space Grotesk' }}>
                  {verificationResult}
                </motion.div>
              ) : (
                <motion.button whileTap={{ scale: 0.95 }} onClick={handleVoiceVerifyComplete} disabled={verifying}
                  style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: verifying ? 'rgba(139,92,246,0.2)' : '#8B5CF6', color: 'white', fontSize: 11, fontWeight: 700, cursor: verifying ? 'default' : 'pointer', fontFamily: 'Space Grotesk' }}>
                  {verifying ? 'Verifying...' : 'Hold to Speak'}
                </motion.button>
              )}
              <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.2)', fontFamily: 'JetBrains Mono', marginTop: 12 }}>
                AEGIS-X · Speaker Verification · T(t)={trustAtPayment.toFixed(0)}%
              </div>
            </motion.div>
          )}

          {/* FACE LIVENESS CHALLENGE */}
          {currentStep === 'face_verify' && (
            <motion.div key="face_verify" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                <Camera size={24} color="#EF4444" />
              </div>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#EF4444', fontFamily: 'Space Grotesk', marginBottom: 6 }}>Face Liveness Check</div>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', textAlign: 'center', lineHeight: 1.6, marginBottom: 12, fontFamily: 'Space Grotesk' }}>
                Critical risk detected. Complete face verification to proceed with this transaction.
              </p>
              {challenge?.liveness_actions && challenge.liveness_actions.length > 0 && (
                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                  {challenge.liveness_actions.map((action, i) => (
                    <div key={i} style={{ padding: '5px 10px', borderRadius: 6, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', fontSize: 9, color: '#F87171', fontFamily: 'JetBrains Mono', textTransform: 'capitalize' }}>
                      {action.replace('_', ' ')}
                    </div>
                  ))}
                </div>
              )}
              {verificationResult ? (
                <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} style={{ fontSize: 12, fontWeight: 700, color: verificationResult.includes('✓') ? '#10B981' : '#EF4444', fontFamily: 'Space Grotesk' }}>
                  {verificationResult}
                </motion.div>
              ) : (
                <motion.button whileTap={{ scale: 0.95 }} onClick={handleFaceVerifyComplete} disabled={verifying}
                  style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: verifying ? 'rgba(239,68,68,0.2)' : '#EF4444', color: 'white', fontSize: 11, fontWeight: 700, cursor: verifying ? 'default' : 'pointer', fontFamily: 'Space Grotesk' }}>
                  {verifying ? 'Analyzing...' : 'Start Face Scan'}
                </motion.button>
              )}
              <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.2)', fontFamily: 'JetBrains Mono', marginTop: 12 }}>
                AEGIS-X · Face Liveness · T(t)={trustAtPayment.toFixed(0)}%
              </div>
            </motion.div>
          )}

          {/* STEP 4: UPI PIN */}
          {currentStep === 'pin' && (
            <motion.div key="pin" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              style={{ padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: 'JetBrains Mono', marginBottom: 6 }}>Enter 6-digit MPIN</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', fontFamily: 'Space Grotesk', marginBottom: 20 }}>
                for ₹{Number(amount).toLocaleString()}
              </div>

              {/* PIN dots */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
                {Array.from({ length: PIN_LENGTH }).map((_, i) => (
                  <motion.div key={i}
                    animate={{ scale: i === pin.length - 1 ? [1.3, 1] : 1 }}
                    style={{
                      width: 14, height: 14, borderRadius: '50%',
                      background: i < pin.length ? '#10B981' : 'rgba(255,255,255,0.1)',
                      border: i === pin.length ? '2px solid rgba(255,255,255,0.3)' : '2px solid transparent',
                    }}
                  />
                ))}
              </div>

              {/* PIN numpad */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, width: '100%', maxWidth: 220 }}>
                {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((k, i) => (
                  <motion.button key={i} whileTap={{ scale: k ? 0.9 : 1 }}
                    onClick={() => {
                      if (!k) return
                      if (k === '⌫') handlePinDelete()
                      else handlePinDigit(k)
                    }}
                    style={{
                      height: 48, borderRadius: 12,
                      border: k ? '1px solid rgba(255,255,255,0.07)' : 'none',
                      background: k ? 'rgba(255,255,255,0.04)' : 'transparent',
                      color: 'white', fontSize: 18, fontWeight: 500,
                      cursor: k ? 'pointer' : 'default', fontFamily: 'Space Grotesk',
                    }}>
                    {k}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Processing */}
          {currentStep === 'processing' && (
            <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ padding: '40px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                <Loader size={32} color="#10B981" />
              </motion.div>
              <div style={{ marginTop: 16, fontSize: 14, fontWeight: 700, color: 'white', fontFamily: 'Space Grotesk' }}>Processing Payment</div>
              <div style={{ marginTop: 4, fontSize: 9, color: 'rgba(255,255,255,0.3)', fontFamily: 'JetBrains Mono' }}>AEGIS-X verifying transaction...</div>
            </motion.div>
          )}

          {/* Success */}
          {currentStep === 'success' && (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              style={{ padding: '32px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, delay: 0.1 }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(16,185,129,0.12)', border: '2px solid rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Check size={28} color="#10B981" strokeWidth={3} />
                </div>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <div style={{ marginTop: 16, textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#10B981', fontFamily: 'Space Grotesk' }}>Payment Successful!</div>
                  <div style={{ fontSize: 28, fontWeight: 900, color: 'white', fontFamily: 'Space Grotesk', margin: '8px 0' }}>
                    ₹{Number(amount).toLocaleString()}
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: 'Space Grotesk' }}>Sent to {selectedContact.name}</div>
                  <div style={{ marginTop: 10, padding: '6px 12px', borderRadius: 20, background: 'rgba(16,185,129,0.08)', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#10B981' }} />
                    <span style={{ fontSize: 8, color: '#10B981', fontFamily: 'JetBrains Mono' }}>AEGIS-X Verified · Behavioral Identity Confirmed</span>
                  </div>
                </div>
              </motion.div>
              <motion.button whileTap={{ scale: 0.97 }}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                onClick={onBack}
                style={{ marginTop: 20, padding: '10px 24px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.7)', fontSize: 11, cursor: 'pointer', fontFamily: 'Space Grotesk' }}>
                Back to Home
              </motion.button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  )
}
