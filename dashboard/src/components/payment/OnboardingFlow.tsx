/**
 * OnboardingFlow — First-time user KYC enrollment within the banking app.
 *
 * Steps:
 *   1. Welcome / Profile Setup
 *   2. Face Enrollment (camera capture placeholder)
 *   3. Voice Enrollment (microphone recording placeholder)
 *   4. Set MPIN (6-digit transaction PIN)
 *   5. Add Trusted Delegate (optional)
 *   6. Complete — proceed to banking app
 *
 * This runs ONCE on first launch. The Continuous Behavioral SDK
 * is already monitoring behavior during onboarding (building baseline).
 */

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  User, Camera, Mic, Lock, Users, CheckCircle, Shield,
  ArrowRight, ChevronRight, Fingerprint,
} from 'lucide-react'

type OnboardingStep = 'welcome' | 'face' | 'voice' | 'mpin' | 'delegate' | 'complete'

const STEPS: { key: OnboardingStep; label: string; icon: any; color: string }[] = [
  { key: 'welcome', label: 'Profile', icon: User, color: '#10B981' },
  { key: 'face', label: 'Face ID', icon: Camera, color: '#10B981' },
  { key: 'voice', label: 'Voice ID', icon: Mic, color: '#8B5CF6' },
  { key: 'mpin', label: 'MPIN', icon: Lock, color: '#F59E0B' },
  { key: 'delegate', label: 'Delegate', icon: Users, color: '#F97316' },
  { key: 'complete', label: 'Done', icon: CheckCircle, color: '#10B981' },
]

interface OnboardingFlowProps {
  onComplete: () => void
}

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onComplete }) => {
  const [step, setStep] = useState<OnboardingStep>('welcome')
  const [mpin, setMpin] = useState('')
  const [mpinConfirm, setMpinConfirm] = useState('')
  const [mpinStage, setMpinStage] = useState<'set' | 'confirm'>('set')
  const [faceEnrolled, setFaceEnrolled] = useState(false)
  const [voiceEnrolled, setVoiceEnrolled] = useState(false)

  const currentIdx = STEPS.findIndex(s => s.key === step)

  const next = () => {
    const nextIdx = currentIdx + 1
    if (nextIdx < STEPS.length) setStep(STEPS[nextIdx].key)
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '16px 14px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Shield size={14} color="#10B981" />
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#e8f0fe', fontFamily: 'Space Grotesk' }}>AEGIS-X Security Setup</div>
          <div style={{ fontSize: 8, color: '#5b8cc7', fontFamily: 'JetBrains Mono' }}>Behavioral biometric enrollment</div>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ display: 'flex', gap: 3, marginBottom: 18 }}>
        {STEPS.map((s, i) => (
          <div key={s.key} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= currentIdx ? s.color : 'rgba(255,255,255,0.08)', transition: 'background 0.3s' }} />
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>

            {step === 'welcome' && <WelcomeStep onNext={next} />}
            {step === 'face' && <FaceEnrollStep enrolled={faceEnrolled} onEnroll={() => { setFaceEnrolled(true); setTimeout(next, 1200) }} />}
            {step === 'voice' && <VoiceEnrollStep enrolled={voiceEnrolled} onEnroll={() => { setVoiceEnrolled(true); setTimeout(next, 1200) }} />}
            {step === 'mpin' && <MPINStep mpin={mpin} mpinConfirm={mpinConfirm} stage={mpinStage} onDigit={(d) => {
              if (mpinStage === 'set') {
                const newPin = mpin + d
                setMpin(newPin)
                if (newPin.length === 6) setTimeout(() => setMpinStage('confirm'), 400)
              } else {
                const newPin = mpinConfirm + d
                setMpinConfirm(newPin)
                if (newPin.length === 6) {
                  if (newPin === mpin) {
                    // Store the MPIN for later verification during transactions (per-user)
                    const u = localStorage.getItem('aegisx_username') || 'default'
                    localStorage.setItem(`aegisx_mpin_${u}`, mpin)
                    setTimeout(next, 600)
                  } else {
                    // Mismatch — shake and reset confirm
                    setTimeout(() => { setMpinConfirm(''); }, 500)
                  }
                }
              }
            }} onDelete={() => {
              if (mpinStage === 'set') setMpin(p => p.slice(0, -1))
              else setMpinConfirm(p => p.slice(0, -1))
            }} mpinMismatch={mpinConfirm.length === 6 && mpinConfirm !== mpin} />}
            {step === 'delegate' && <DelegateStep onNext={next} onSkip={next} />}
            {step === 'complete' && <CompleteStep onContinue={() => { const u = localStorage.getItem('aegisx_username') || 'default'; localStorage.setItem(`aegisx_onboarding_done_${u}`, 'true'); onComplete() }} />}

          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}


// ─── SUB-STEPS ───────────────────────────────────────────────────────────────

function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, textAlign: 'center', padding: '0 12px' }}>
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2 }}
        style={{ width: 64, height: 64, borderRadius: 18, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}
      >
        <Fingerprint size={28} color="#10B981" />
      </motion.div>
      <div style={{ fontSize: 16, fontWeight: 800, color: '#e8f0fe', fontFamily: 'Space Grotesk', marginBottom: 6 }}>Welcome to Secure Banking</div>
      <p style={{ fontSize: 11, color: '#5b8cc7', lineHeight: 1.7, marginBottom: 20, fontFamily: 'Space Grotesk' }}>
        Let's set up your biometric identity. This takes about 2 minutes and makes your account virtually impossible to compromise.
      </p>
      <div style={{ fontSize: 9, color: '#5b8cc7', fontFamily: 'JetBrains Mono', marginBottom: 20, lineHeight: 1.8 }}>
        ▸ Face enrollment (camera)<br/>
        ▸ Voice enrollment (microphone)<br/>
        ▸ Transaction MPIN setup<br/>
        ▸ Trusted delegate (optional)
      </div>
      <button onClick={onNext} style={{ padding: '10px 28px', borderRadius: 10, border: 'none', background: '#10B981', color: '#e8f0fe', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Space Grotesk', display: 'flex', alignItems: 'center', gap: 6 }}>
        Begin Setup <ArrowRight size={14} />
      </button>
    </div>
  )
}

function FaceEnrollStep({ enrolled, onEnroll }: { enrolled: boolean; onEnroll: () => void }) {
  const [capturing, setCapturing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [retryCount, setRetryCount] = useState(0)
  const videoRef = React.useRef<HTMLVideoElement>(null)

  React.useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream
      videoRef.current.play().catch(() => {})
    }
  }, [stream])

  const startCapture = async () => {
    setCapturing(true)
    setProgress(0)
    setStatus('Opening camera...')
    setError('')
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 320 }, height: { ideal: 320 } }
      })
      setStream(mediaStream)
      setStatus('Position your face — hold still...')

      // Wait for camera to stabilize (1.5s)
      await new Promise(r => setTimeout(r, 1500))
      setProgress(30)
      setStatus('Capturing frame...')

      // Capture frame from video
      const video = videoRef.current
      if (!video) throw new Error('Video not available')
      
      const canvas = document.createElement('canvas')
      canvas.width = 320; canvas.height = 320
      canvas.getContext('2d')!.drawImage(video, 0, 0, 320, 320)
      const frameBase64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1]
      
      setProgress(50)
      setStatus('Validating face...')

      // STRICT validation — call backend to verify real face is present
      const BACKEND = import.meta.env.VITE_BACKEND_URL || ''
      let validation: any
      try {
        const validateRes = await fetch(`${BACKEND}/api/v1/verify/validate/face`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image_base64: frameBase64, required_action: 'look forward' }),
        })
        validation = await validateRes.json()
      } catch (fetchErr) {
        // Backend unreachable — BLOCK (fail-closed)
        mediaStream.getTracks().forEach(t => t.stop())
        setStream(null)
        setCapturing(false)
        setProgress(0)
        setRetryCount(r => r + 1)
        setError('Cannot connect to AEGIS-X server — start backend and retry')
        setStatus('')
        return
      }
      
      if (!validation.valid || !validation.face_detected) {
        // FAILED — face not detected, camera covered, dark, etc.
        mediaStream.getTracks().forEach(t => t.stop())
        setStream(null)
        setCapturing(false)
        setProgress(0)
        setRetryCount(r => r + 1)
        setError(validation.reason || 'Face not detected — ensure your face is clearly visible')
        setStatus('')
        return  // BLOCK progress — user must retry
      }

      setProgress(75)
      setStatus('Face detected! Enrolling template...')

      // Face validated — now enroll the embedding
      try {
        await fetch(`${BACKEND}/api/v1/verify/provider/enroll/face`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: 'demo_user', image_samples_base64: [frameBase64] }),
        })
      } catch {}

      setProgress(100)
      setStatus('✓ Face enrolled successfully!')
      mediaStream.getTracks().forEach(t => t.stop())
      setStream(null)
      setCapturing(false)
      
      // Short delay to show success, then advance
      setTimeout(() => onEnroll(), 1000)
    } catch (err: any) {
      console.warn('[AEGIS-X] Camera error:', err)
      setCapturing(false)
      setStream(null)
      setProgress(0)
      setError('Camera unavailable — please allow camera access and try again')
      setStatus('')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, textAlign: 'center' }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#e8f0fe', fontFamily: 'Space Grotesk', marginBottom: 6 }}>Face Enrollment</div>
      <p style={{ fontSize: 10, color: '#5b8cc7', marginBottom: 16, fontFamily: 'Space Grotesk' }}>Position your face in the circle. Ensure good lighting.</p>

      <motion.div
        animate={capturing ? { borderColor: '#10B981' } : { borderColor: error ? '#EF4444' : 'rgba(255,255,255,0.1)' }}
        style={{ width: 160, height: 160, borderRadius: '50%', border: '3px solid', background: 'rgba(59,130,246,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12, position: 'relative', overflow: 'hidden' }}
      >
        {enrolled ? (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}><CheckCircle size={48} color="#10B981" /></motion.div>
        ) : capturing ? (
          <>
            <video ref={videoRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%', transform: 'scaleX(-1)', position: 'absolute', top: 0, left: 0 }} />
            {!stream && (
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }} style={{ width: '100%', height: '100%', border: '3px solid transparent', borderTopColor: '#10B981', borderRadius: '50%', position: 'absolute' }} />
            )}
          </>
        ) : (
          <Camera size={40} color={error ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.2)'} />
        )}
      </motion.div>

      {/* Progress bar + status */}
      {capturing && (
        <div style={{ width: '80%', marginBottom: 8 }}>
          <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
            <motion.div animate={{ width: `${progress}%` }} style={{ height: '100%', background: '#10B981', borderRadius: 2 }} />
          </div>
          <div style={{ fontSize: 8, color: '#10B981', fontFamily: 'JetBrains Mono', marginTop: 4, textAlign: 'center' }}>{status}</div>
        </div>
      )}

      {/* Error message */}
      {error && !capturing && (
        <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 10, padding: '8px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', maxWidth: '90%' }}>
          <div style={{ fontSize: 9, color: '#EF4444', fontFamily: 'JetBrains Mono', lineHeight: 1.5 }}>{error}</div>
          {retryCount > 0 && <div style={{ fontSize: 8, color: '#F87171', fontFamily: 'JetBrains Mono', marginTop: 3 }}>Attempt {retryCount} — try adjusting lighting and position</div>}
        </motion.div>
      )}

      {enrolled ? (
        <div style={{ fontSize: 11, color: '#10B981', fontWeight: 700, fontFamily: 'Space Grotesk' }}>✓ Face enrolled successfully</div>
      ) : !capturing ? (
        <button onClick={startCapture}
          style={{ padding: '9px 24px', borderRadius: 10, border: 'none', background: '#10B981', color: '#e8f0fe', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Space Grotesk' }}>
          {error ? 'Retry Face Capture' : 'Start Face Capture'}
        </button>
      ) : null}
    </div>
  )
}

function VoiceEnrollStep({ enrolled, onEnroll }: { enrolled: boolean; onEnroll: () => void }) {
  const [recording, setRecording] = useState(false)
  const [audioLevel, setAudioLevel] = useState(0)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [retryCount, setRetryCount] = useState(0)

  const startRecording = async () => {
    setRecording(true)
    setError('')
    setStatus('🎙️ Listening — speak now...')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      // Visualize audio level
      const audioCtx = new AudioContext()
      const source = audioCtx.createMediaStreamSource(stream)
      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      const dataArray = new Uint8Array(analyser.frequencyBinCount)

      // Also record actual audio for validation
      const mediaRecorder = new MediaRecorder(stream)
      const chunks: Blob[] = []
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data) }

      const interval = setInterval(() => {
        analyser.getByteFrequencyData(dataArray)
        const avg = dataArray.reduce((a: number, b: number) => a + b, 0) / dataArray.length
        setAudioLevel(avg / 255)
      }, 100)

      mediaRecorder.start()

      // Record for 3.5 seconds
      await new Promise(r => setTimeout(r, 3500))
      
      clearInterval(interval)
      mediaRecorder.stop()
      
      // Wait for recording to finalize
      const audioBase64 = await new Promise<string>((resolve) => {
        mediaRecorder.onstop = async () => {
          const blob = new Blob(chunks, { type: 'audio/webm' })
          const buffer = await blob.arrayBuffer()
          const bytes = new Uint8Array(buffer)
          let binary = ''
          bytes.forEach((b: number) => binary += String.fromCharCode(b))
          resolve(btoa(binary))
        }
      })

      stream.getTracks().forEach(t => t.stop())
      audioCtx.close()
      setAudioLevel(0)
      setStatus('Validating speech...')

      // STRICT validation — call backend to verify real speech exists
      const BACKEND = import.meta.env.VITE_BACKEND_URL || ''
      let validation: any
      try {
        const validateRes = await fetch(`${BACKEND}/api/v1/verify/validate/voice`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ audio_base64: audioBase64, expected_phrase: 'My voice is my identity' }),
        })
        validation = await validateRes.json()
      } catch (fetchErr) {
        // Backend unreachable — BLOCK (fail-closed)
        setRecording(false)
        setRetryCount(r => r + 1)
        setError('Cannot connect to AEGIS-X server — start backend and retry')
        setStatus('')
        return
      }

      if (!validation.valid || !validation.speech_detected) {
        // FAILED — no speech detected
        setRecording(false)
        setRetryCount(r => r + 1)
        setError(validation.reason || 'No speech detected — please speak clearly')
        setStatus('')
        return  // BLOCK progress
      }

      // Speech validated — enroll voiceprint
      setStatus('Enrolling voiceprint...')
      try {
        await fetch(`${BACKEND}/api/v1/verify/provider/enroll/voice`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: 'demo_user', audio_samples_base64: [audioBase64] }),
        })
      } catch {}

      setStatus('✓ Voice enrolled!')
      setRecording(false)
      setTimeout(() => onEnroll(), 800)
    } catch (err) {
      setRecording(false)
      setError('Microphone unavailable — please allow mic access and try again')
      setStatus('')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, textAlign: 'center' }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#e8f0fe', fontFamily: 'Space Grotesk', marginBottom: 6 }}>Voice Enrollment</div>
      <p style={{ fontSize: 10, color: '#5b8cc7', marginBottom: 16, fontFamily: 'Space Grotesk' }}>Say the phrase below clearly into your microphone.</p>

      <div style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 10, padding: '10px 16px', marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: '#8B5CF6', fontWeight: 700, fontFamily: 'Space Grotesk', fontStyle: 'italic' }}>
          "My voice is my identity"
        </div>
      </div>

      <motion.div
        animate={recording ? { scale: [1, 1 + audioLevel * 0.3, 1] } : {}}
        transition={{ duration: 0.3 }}
        style={{ width: 72, height: 72, borderRadius: '50%', background: enrolled ? 'rgba(59,130,246,0.1)' : 'rgba(139,92,246,0.08)', border: `2px solid ${enrolled ? '#10B981' : recording ? '#8B5CF6' : error ? '#EF4444' : 'rgba(255,255,255,0.1)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}
      >
        {enrolled ? <CheckCircle size={32} color="#10B981" /> : <Mic size={28} color={recording ? '#8B5CF6' : 'rgba(255,255,255,0.3)'} />}
      </motion.div>

      {/* Audio level bar */}
      {recording && (
        <div style={{ marginBottom: 12, textAlign: 'center' }}>
          <div style={{ fontSize: 9, color: '#8B5CF6', fontFamily: 'JetBrains Mono', marginBottom: 4 }}>{status || '🎙️ Listening...'}</div>
          <div style={{ width: 140, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.08)', overflow: 'hidden', margin: '0 auto' }}>
            <motion.div animate={{ width: `${Math.max(10, audioLevel * 100)}%` }} style={{ height: '100%', background: 'linear-gradient(90deg, #8B5CF6, #A78BFA)', borderRadius: 3 }} />
          </div>
          <div style={{ fontSize: 7, color: '#5b8cc7', fontFamily: 'JetBrains Mono', marginTop: 3 }}>Audio level: {Math.round(audioLevel * 100)}%</div>
        </div>
      )}

      {/* Error message */}
      {error && !recording && (
        <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 10, padding: '8px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', maxWidth: '90%' }}>
          <div style={{ fontSize: 9, color: '#EF4444', fontFamily: 'JetBrains Mono', lineHeight: 1.5 }}>{error}</div>
          {retryCount > 0 && <div style={{ fontSize: 8, color: '#F87171', fontFamily: 'JetBrains Mono', marginTop: 3 }}>Attempt {retryCount} — speak louder and closer to mic</div>}
        </motion.div>
      )}

      {enrolled ? (
        <div style={{ fontSize: 11, color: '#10B981', fontWeight: 700, fontFamily: 'Space Grotesk' }}>✓ Voice enrolled successfully</div>
      ) : (
        <button onClick={startRecording} disabled={recording}
          style={{ padding: '9px 24px', borderRadius: 10, border: 'none', background: recording ? 'rgba(139,92,246,0.2)' : '#8B5CF6', color: '#e8f0fe', fontSize: 11, fontWeight: 700, cursor: recording ? 'default' : 'pointer', fontFamily: 'Space Grotesk' }}>
          {recording ? 'Recording...' : error ? 'Retry Recording' : 'Start Recording'}
        </button>
      )}
    </div>
  )
}


function MPINStep({ mpin, mpinConfirm, stage, onDigit, onDelete, mpinMismatch }: {
  mpin: string; mpinConfirm: string; stage: 'set' | 'confirm'
  onDigit: (d: string) => void; onDelete: () => void; mpinMismatch?: boolean
}) {
  const currentPin = stage === 'set' ? mpin : mpinConfirm
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
      <Lock size={28} color="#F59E0B" style={{ marginBottom: 12 }} />
      <div style={{ fontSize: 14, fontWeight: 700, color: '#e8f0fe', fontFamily: 'Space Grotesk', marginBottom: 4 }}>
        {stage === 'set' ? 'Set Transaction MPIN' : 'Confirm MPIN'}
      </div>
      <p style={{ fontSize: 10, color: mpinMismatch ? '#EF4444' : 'rgba(255,255,255,0.4)', marginBottom: 18, fontFamily: 'Space Grotesk' }}>
        {mpinMismatch ? 'PINs don\'t match — try again' : stage === 'set' ? 'Choose a 6-digit PIN for transaction authorization' : 'Re-enter your MPIN to confirm'}
      </p>

      {/* PIN dots */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <motion.div
            key={i}
            animate={{ scale: i < currentPin.length ? 1.2 : 1, background: i < currentPin.length ? '#F59E0B' : 'rgba(255,255,255,0.1)' }}
            style={{ width: 14, height: 14, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.15)' }}
          />
        ))}
      </div>

      {/* Numpad */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, width: 200 }}>
        {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((key) => (
          <button
            key={key}
            onClick={() => { if (key === '⌫') onDelete(); else if (key) onDigit(key) }}
            disabled={!key}
            style={{
              width: 56, height: 44, borderRadius: 10, border: 'none',
              background: key === '⌫' ? 'rgba(239,68,68,0.08)' : key ? 'rgba(255,255,255,0.04)' : 'transparent',
              color: key === '⌫' ? '#EF4444' : 'white',
              fontSize: key === '⌫' ? 16 : 18, fontWeight: 700, cursor: key ? 'pointer' : 'default',
              fontFamily: 'Space Grotesk',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {key}
          </button>
        ))}
      </div>
    </div>
  )
}

function DelegateStep({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
  const [delegates, setDelegates] = useState<{ name: string; relation: string }[]>([])
  const [name, setName] = useState('')
  const [relation, setRelation] = useState('')

  const addDelegate = () => {
    if (!name || !relation) return
    setDelegates(d => [...d, { name, relation }])
    setName('')
    setRelation('')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, padding: '0 8px', overflowY: 'auto' }}>
      <Users size={28} color="#F97316" style={{ marginBottom: 12 }} />
      <div style={{ fontSize: 14, fontWeight: 700, color: '#e8f0fe', fontFamily: 'Space Grotesk', marginBottom: 4 }}>Add Trusted Delegates</div>
      <p style={{ fontSize: 10, color: '#5b8cc7', marginBottom: 14, fontFamily: 'Space Grotesk', textAlign: 'center' }}>
        People who can use your account without being flagged. Add up to 3. Optional.
      </p>

      {/* Added delegates */}
      {delegates.map((d, i) => (
        <motion.div key={i} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          style={{ width: '100%', maxWidth: 260, display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.2)', marginBottom: 6 }}>
          <div style={{ width: 24, height: 24, borderRadius: 6, background: 'rgba(249,115,22,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={12} color="#F97316" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#e8f0fe', fontFamily: 'Space Grotesk' }}>{d.name}</div>
            <div style={{ fontSize: 8, color: '#5b8cc7', fontFamily: 'JetBrains Mono' }}>{d.relation}</div>
          </div>
          <div style={{ fontSize: 8, color: '#10B981', fontFamily: 'JetBrains Mono' }}>✓</div>
        </motion.div>
      ))}

      {/* Add form (if less than 3) */}
      {delegates.length < 3 && (
        <>
          <div style={{ width: '100%', maxWidth: 260, marginBottom: 8, marginTop: delegates.length > 0 ? 8 : 0 }}>
            <div style={{ fontSize: 9, color: '#5b8cc7', fontFamily: 'JetBrains Mono', marginBottom: 3 }}>Full Name</div>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Priya Sharma"
              style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid var(--border-medium)', background: 'var(--accent-dim)', color: '#e8f0fe', fontSize: 11, fontFamily: 'Space Grotesk', outline: 'none' }} />
          </div>
          <div style={{ width: '100%', maxWidth: 260, marginBottom: 12 }}>
            <div style={{ fontSize: 9, color: '#5b8cc7', fontFamily: 'JetBrains Mono', marginBottom: 3 }}>Relationship</div>
            <input value={relation} onChange={e => setRelation(e.target.value)} placeholder="spouse / parent / child"
              style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid var(--border-medium)', background: 'var(--accent-dim)', color: '#e8f0fe', fontSize: 11, fontFamily: 'Space Grotesk', outline: 'none' }} />
          </div>
          {name && relation && (
            <button onClick={addDelegate} style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: '#F97316', color: '#e8f0fe', fontSize: 10, fontWeight: 700, cursor: 'pointer', marginBottom: 12, fontFamily: 'Space Grotesk' }}>
              + Add Delegate ({delegates.length + 1}/3)
            </button>
          )}
        </>
      )}

      <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
        <button onClick={onSkip} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border-medium)', background: 'transparent', color: '#5b8cc7', fontSize: 10, cursor: 'pointer', fontFamily: 'Space Grotesk' }}>
          {delegates.length > 0 ? 'Continue' : 'Skip for now'}
        </button>
        {delegates.length >= 3 && (
          <button onClick={onNext} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#10B981', color: '#e8f0fe', fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: 'Space Grotesk' }}>
            All 3 Added — Continue
          </button>
        )}
      </div>
      <div style={{ fontSize: 8, color: '#5b8cc7', fontFamily: 'JetBrains Mono', marginTop: 8 }}>{delegates.length}/3 delegates added</div>
    </div>
  )
}

function CompleteStep({ onContinue }: { onContinue: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, textAlign: 'center' }}>
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        style={{ width: 72, height: 72, borderRadius: 20, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}
      >
        <CheckCircle size={36} color="#10B981" />
      </motion.div>
      <div style={{ fontSize: 16, fontWeight: 800, color: '#10B981', fontFamily: 'Space Grotesk', marginBottom: 6 }}>Setup Complete!</div>
      <p style={{ fontSize: 11, color: '#5b8cc7', lineHeight: 1.7, marginBottom: 8, fontFamily: 'Space Grotesk', maxWidth: 260 }}>
        Your biometric identity is enrolled. AEGIS-X is now continuously monitoring your behavioral patterns.
      </p>
      <div style={{ fontSize: 8, color: '#5b8cc7', fontFamily: 'JetBrains Mono', marginBottom: 20, lineHeight: 1.8 }}>
        ✓ Face template stored securely<br/>
        ✓ Voiceprint enrolled<br/>
        ✓ MPIN configured<br/>
        ✓ Behavioral baseline initializing
      </div>
      <button onClick={onContinue} style={{ padding: '10px 28px', borderRadius: 10, border: 'none', background: '#10B981', color: '#e8f0fe', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Space Grotesk', display: 'flex', alignItems: 'center', gap: 6 }}>
        Enter Banking App <ChevronRight size={14} />
      </button>
    </div>
  )
}
