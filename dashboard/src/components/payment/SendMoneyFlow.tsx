import React, { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { ArrowLeft, ArrowRight, Check, ChevronRight, Loader, Mic, Camera } from 'lucide-react'
import { CONTACTS } from './bankData'
import { initiateVerification, verifyVoice, verifyFace, VerificationChallenge } from '../../services/verificationApi'

type FlowStep = 'contacts' | 'amount' | 'review' | 'pin' | 'processing' | 'success' | 'voice_verify' | 'face_verify'

interface SendMoneyFlowProps {
  trustScore: number
  userId: string
  onBack: () => void
  onBlock: () => void
  onSuccess: (amount: number, contact: (typeof CONTACTS)[0]) => void
  currentStep: FlowStep
  onStepChange: (step: FlowStep) => void
}

const PIN_LENGTH = 6

export const SendMoneyFlow: React.FC<SendMoneyFlowProps> = ({
  trustScore, userId, onBack, onBlock, onSuccess, currentStep, onStepChange,
}) => {
  const [selectedContact, setSelectedContact] = useState(CONTACTS[0])
  const [amount, setAmount] = useState('')
  const [pin, setPin] = useState('')
  const [challenge, setChallenge] = useState<VerificationChallenge | null>(null)
  const [verifying, setVerifying] = useState(false)
  const [verificationResult, setVerificationResult] = useState<string | null>(null)
  const [trustAtPayment, setTrustAtPayment] = useState(95)
  const [pendingVerifyStep, setPendingVerifyStep] = useState<FlowStep | null>(null)

  const steps = ['contacts', 'amount', 'review', 'pin', 'processing', 'success']
  const stepIndex = steps.indexOf(currentStep)

  // ─── TRUST PENALTY REPORTER ─────────────────────────────────────────────
  // Reports verification failures to backend → reduces trust score
  // This ensures failed verification is treated as a risk signal
  const reportVerificationFailure = async (
    failureType: 'voice_mismatch' | 'face_mismatch' | 'camera_denied' | 'mic_denied' |
                 'no_speech' | 'liveness_failed' | 'replay_detected' | 'timeout' | 'no_enrollment',
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ) => {
    const penaltyMap = { low: 8, medium: 15, high: 25, critical: 35 }
    const penalty = penaltyMap[severity]
    const newTrust = Math.max(10, trustScore - penalty)
    const cogStateMap = {
      voice_mismatch: 'distressed', face_mismatch: 'distressed',
      camera_denied: 'distressed', mic_denied: 'distressed',
      no_speech: 'focused', liveness_failed: 'distressed',
      replay_detected: 'robotic', timeout: 'panicked', no_enrollment: 'focused',
    }
    try {
      const BACKEND = import.meta.env.VITE_BACKEND_URL || ''
      await fetch(`${BACKEND}/api/v1/security/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          session_id: 'sess_payment',
          trust_score: newTrust / 100,
          cognitive_state: cogStateMap[failureType] || 'distressed',
          drift_detected: severity === 'high' || severity === 'critical',
          drift_severity: severity === 'critical' ? 'critical' : severity === 'high' ? 'high' : 'medium',
          velocity: -0.03,
          anomaly_score: severity === 'critical' ? 0.9 : severity === 'high' ? 0.7 : 0.4,
          verification_failure: failureType,
          failure_severity: severity,
        }),
      })
    } catch { /* non-critical */ }

    // Also block if multiple failures have reduced trust below threshold
    if (newTrust < 40) {
      onBlock()
    }
  }

  const handleAmountNext = () => {
    if (!amount || Number(amount) <= 0) return
    onStepChange('review')
  }

  const handleConfirmPay = async () => {
    const currentTrust = trustScore
    setTrustAtPayment(currentTrust)

    // AEGIS-X Adaptive Verification:
    // Trust > 88%  → Straight to MPIN (behavioral identity confirmed)
    // Trust 65-88% → Quick face direction check (look left/right)
    // Trust 50-65% → Voice phrase verification
    // Trust < 50%  → Full face liveness (blink + smile + turn) → likely BLOCK
    //
    // OVERRIDE: High-value transactions ALWAYS require extra verification
    // regardless of trust score (banking compliance requirement):
    // - Amount > ₹25,000 → at minimum voice verification
    // - Amount > ₹50,000 to NEW beneficiary → face verification
    // - Amount > ₹1,00,000 → face verification always

    const txAmount = Number(amount)
    const isNewBen = selectedContact?.isNew || false

    // Notify SDK about transaction so backend factors amount into trust scoring
    try {
      const { aegisSDK } = await import('../../services/sdk/AegisBehavioralSDK')
      aegisSDK.setTransactionContext({
        amount: txAmount,
        beneficiary: selectedContact?.upi || '',
        isNewBeneficiary: isNewBen,
        category: 'transfer',
      })
    } catch {}

    // Randomize liveness actions each time (never the same challenge twice)
    // Weighted distribution: blink, smile, nod, raise_eyebrows are MORE common
    // turn_left/turn_right are LESS common — variety keeps checks unpredictable
    const FACE_ACTIONS_WEIGHTED = [
      'blink', 'blink', 'blink',          // 3x weight
      'smile', 'smile', 'smile',          // 3x weight
      'nod', 'nod',                       // 2x weight
      'raise_eyebrows', 'raise_eyebrows', // 2x weight
      'turn_left',                        // 1x weight
      'turn_right',                       // 1x weight
    ]
    const randomAction = () => FACE_ACTIONS_WEIGHTED[Math.floor(Math.random() * FACE_ACTIONS_WEIGHTED.length)]
    const randomPair = () => {
      const a1 = randomAction()
      let a2 = randomAction()
      while (a2 === a1) a2 = randomAction()
      return [a1, a2]
    }
    const VOICE_PHRASES = [
      'I authorize this transaction',
      'Secure banking verification',
      'Confirm identity by speaking',
      'Verify my account access',
      'My voice is my password',
    ]
    const randomPhrase = () => {
      const phrase = VOICE_PHRASES[Math.floor(Math.random() * VOICE_PHRASES.length)]
      const code = Math.random().toString(36).substring(2, 6).toUpperCase()
      return `${phrase}. Code: ${code}`
    }

    // Weighted verification type selection:
    // For ₹10K-25K: Voice is used 80% of the time
    const pickVerificationType = (): 'face' | 'voice' => Math.random() > 0.8 ? 'face' : 'voice'

    // HIGH-VALUE OVERRIDE: force verification for large amounts even at high trust
    if (txAmount > 100000) {
      // ₹1L+ → always face verification with single random action
      setChallenge({
        challenge_id: `face_highval_${Date.now()}`,
        user_id: userId, session_id: 'sess_payment',
        verification_type: 'FACE_LIVENESS', risk_source: 'transaction_risk',
        status: 'PENDING', trust_before: currentTrust / 100, trust_after: 0,
        confidence: 0, latency_ms: 0, phrase: '',
        liveness_actions: [randomAction()],
        matched_delegate_id: '', reason: 'High-value transaction requires face verification',
        explanation: `₹${txAmount.toLocaleString()} requires face liveness check.`,
        created_at: new Date().toISOString(), completed_at: '',
      } as any)
      setPendingVerifyStep('face_verify'); onStepChange('pin')
      return
    }

    if (txAmount > 50000 && isNewBen) {
      // ₹50K+ to new beneficiary → face verification with random action
      setChallenge({
        challenge_id: `face_newben_${Date.now()}`,
        user_id: userId, session_id: 'sess_payment',
        verification_type: 'FACE_LIVENESS', risk_source: 'transaction_risk',
        status: 'PENDING', trust_before: currentTrust / 100, trust_after: 0,
        confidence: 0, latency_ms: 0, phrase: '',
        liveness_actions: [randomAction()],
        matched_delegate_id: '', reason: 'High-value transfer to new beneficiary',
        explanation: `₹${txAmount.toLocaleString()} to new contact requires face check.`,
        created_at: new Date().toISOString(), completed_at: '',
      } as any)
      setPendingVerifyStep('face_verify'); onStepChange('pin')
      return
    }

    if (txAmount > 25000 && currentTrust > 88) {
      // ₹25K+ — randomly pick voice OR face (variety for demo)
      const pick = pickVerificationType()
      if (pick === 'voice') {
        setChallenge({
          challenge_id: `voice_highval_${Date.now()}`,
          user_id: userId, session_id: 'sess_payment',
          verification_type: 'VOICE_CHALLENGE', risk_source: 'transaction_risk',
          status: 'PENDING', trust_before: currentTrust / 100, trust_after: 0,
          confidence: 0, latency_ms: 0,
          phrase: randomPhrase(),
          liveness_actions: [], matched_delegate_id: '',
          reason: 'High-value transaction requires voice confirmation',
          explanation: `₹${txAmount.toLocaleString()} requires voice verification.`,
          created_at: new Date().toISOString(), completed_at: '',
        } as any)
        setPendingVerifyStep('voice_verify'); onStepChange('pin')
      } else {
        setChallenge({
          challenge_id: `face_25k_${Date.now()}`,
          user_id: userId, session_id: 'sess_payment',
          verification_type: 'FACE_LIVENESS', risk_source: 'transaction_risk',
          status: 'PENDING', trust_before: currentTrust / 100, trust_after: 0,
          confidence: 0, latency_ms: 0, phrase: '',
          liveness_actions: [randomAction()],
          matched_delegate_id: '', reason: 'High-value transaction requires face verification',
          explanation: `₹${txAmount.toLocaleString()} requires face check.`,
          created_at: new Date().toISOString(), completed_at: '',
        } as any)
        setPendingVerifyStep('face_verify'); onStepChange('pin')
      }
      return
    }

    if (txAmount > 10000 && currentTrust > 88) {
      // ₹10K+ — randomly pick voice or face (keeps demo interesting)
      const pick = pickVerificationType()
      if (pick === 'voice') {
        setChallenge({
          challenge_id: `voice_10k_${Date.now()}`,
          user_id: userId, session_id: 'sess_payment',
          verification_type: 'VOICE_CHALLENGE', risk_source: 'transaction_risk',
          status: 'PENDING', trust_before: currentTrust / 100, trust_after: 0,
          confidence: 0, latency_ms: 0,
          phrase: randomPhrase(),
          liveness_actions: [], matched_delegate_id: '',
          reason: 'Transaction above ₹10,000 — voice identity confirmation',
          explanation: `₹${txAmount.toLocaleString()} requires voice verification.`,
          created_at: new Date().toISOString(), completed_at: '',
        } as any)
        setPendingVerifyStep('voice_verify'); onStepChange('pin')
      } else {
        setChallenge({
          challenge_id: `face_10k_${Date.now()}`,
          user_id: userId, session_id: 'sess_payment',
          verification_type: 'FACE_LIVENESS', risk_source: 'transaction_risk',
          status: 'PENDING', trust_before: currentTrust / 100, trust_after: 0,
          confidence: 0, latency_ms: 0, phrase: '',
          liveness_actions: [randomAction()],
          matched_delegate_id: '',
          reason: 'Transaction above ₹10,000 — quick identity confirmation',
          explanation: `₹${txAmount.toLocaleString()} requires a quick face check.`,
          created_at: new Date().toISOString(), completed_at: '',
        } as any)
        setPendingVerifyStep('face_verify'); onStepChange('pin')
      }
      return
    }

    // Standard trust-based verification (for small amounts < ₹10K)
    if (currentTrust > 88) {
      onStepChange('pin')
      return
    }

    if (currentTrust > 65) {
      // Quick identity check — randomly pick voice (40%) or face (60%)
      const quickPick = pickVerificationType()
      if (quickPick === 'voice') {
        setChallenge({
          challenge_id: `voice_quick_${Date.now()}`,
          user_id: userId,
          session_id: 'sess_payment',
          verification_type: 'VOICE_CHALLENGE',
          risk_source: 'transaction_risk',
          status: 'PENDING',
          trust_before: currentTrust / 100,
          trust_after: 0,
          confidence: 0,
          latency_ms: 0,
          phrase: randomPhrase(),
          liveness_actions: [],
          matched_delegate_id: '',
          reason: 'Quick voice identity confirmation',
          explanation: 'Speak the phrase to confirm your identity.',
          created_at: new Date().toISOString(),
          completed_at: '',
        } as any)
        setPendingVerifyStep('voice_verify'); onStepChange('pin')
      } else {
        setChallenge({
          challenge_id: `face_quick_${Date.now()}`,
          user_id: userId,
          session_id: 'sess_payment',
          verification_type: 'FACE_LIVENESS',
          risk_source: 'transaction_risk',
          status: 'PENDING',
          trust_before: currentTrust / 100,
          trust_after: 0,
          confidence: 0,
          latency_ms: 0,
          phrase: '',
          liveness_actions: [randomAction()],
          matched_delegate_id: '',
          reason: 'Quick identity confirmation',
          explanation: 'Perform the action to confirm identity.',
          created_at: new Date().toISOString(),
          completed_at: '',
        } as any)
        setPendingVerifyStep('face_verify'); onStepChange('pin')
      }
      return
    }

    if (currentTrust > 50) {
      // Voice phrase
      try {
        const ch = await initiateVerification({
          user_id: userId,
          session_id: 'sess_payment',
          trust_score: currentTrust / 100,
          cognitive_state: 'focused',
          drift_detected: true,
          drift_severity: 'medium',
          transaction_amount: Number(amount),
          reasons: ['Behavioral drift — voice verification required'],
        })
        setChallenge(ch)
      } catch {
        setChallenge({
          challenge_id: `voice_${Date.now()}`,
          user_id: userId, session_id: 'sess_payment',
          verification_type: 'VOICE_CHALLENGE', risk_source: 'behavioral_drift',
          status: 'PENDING', trust_before: currentTrust / 100, trust_after: 0,
          confidence: 0, latency_ms: 0,
          phrase: 'My voice is my identity',
          liveness_actions: [], matched_delegate_id: '',
          reason: 'Voice verification required', explanation: '',
          created_at: new Date().toISOString(), completed_at: '',
        } as any)
      }
      setPendingVerifyStep('voice_verify'); onStepChange('pin')
      return
    }

    // Trust < 50% → Full face liveness
    try {
      const ch = await initiateVerification({
        user_id: userId,
        session_id: 'sess_payment',
        trust_score: currentTrust / 100,
        cognitive_state: 'distressed',
        drift_detected: true,
        drift_severity: 'high',
        transaction_amount: Number(amount),
        reasons: ['Critical behavioral anomaly — full liveness required'],
      })
      setChallenge(ch)
      if (ch.verification_type === 'HOLD_AND_NOTIFY') { onBlock(); return }
    } catch {
      setChallenge({
        challenge_id: `face_full_${Date.now()}`,
        user_id: userId, session_id: 'sess_payment',
        verification_type: 'FACE_LIVENESS', risk_source: 'behavioral_drift',
        status: 'PENDING', trust_before: currentTrust / 100, trust_after: 0,
        confidence: 0, latency_ms: 0, phrase: '',
        liveness_actions: [randomAction()],
        matched_delegate_id: '', reason: 'Full liveness required', explanation: '',
        created_at: new Date().toISOString(), completed_at: '',
      } as any)
    }
    setPendingVerifyStep('face_verify'); onStepChange('pin')
  }

  const handleVoiceVerifyComplete = async () => {
    if (!challenge) { onStepChange('processing'); setTimeout(() => { onStepChange('success'); onSuccess(Number(amount), selectedContact) }, 1800); return }
    setVerifying(true)
    setVerificationResult('🎙️ Recording — speak the phrase...')

    try {
      // Step 1: Record real audio (3 seconds)
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      const chunks: Blob[] = []
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data) }

      const audioPromise = new Promise<string>((resolve) => {
        mediaRecorder.onstop = async () => {
          stream.getTracks().forEach(t => t.stop())
          const blob = new Blob(chunks, { type: 'audio/webm' })
          const buffer = await blob.arrayBuffer()
          const bytes = new Uint8Array(buffer)
          let binary = ''
          bytes.forEach(b => binary += String.fromCharCode(b))
          resolve(btoa(binary))
        }
      })

      mediaRecorder.start()
      await new Promise(r => setTimeout(r, 3000))
      mediaRecorder.stop()
      const audioBase64 = await audioPromise

      setVerificationResult('Analyzing voiceprint...')

      // Step 2: Validate with backend — REAL check
      const BACKEND = import.meta.env.VITE_BACKEND_URL || ''
      let validation: any
      try {
        const res = await fetch(`${BACKEND}/api/v1/verify/validate/voice`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audio_base64: audioBase64,
            expected_phrase: challenge.phrase || 'My voice is my identity',
          }),
        })
        validation = await res.json()
      } catch {
        setVerificationResult('✗ Server unreachable — cannot verify voice')
        setVerifying(false)
        setTimeout(() => setVerificationResult(null), 3000)
        return
      }

      if (!validation.valid || !validation.speech_detected) {
        // FAILED — no speech detected
        setVerificationResult(`✗ ${validation.reason || 'No speech detected — speak clearly'}`)
        await reportVerificationFailure('no_speech', 'low')
        setVerifying(false)
        setTimeout(() => setVerificationResult(null), 2500)
        return
      }

      // Step 3: Voiceprint comparison — compare against enrolled voice
      setVerificationResult('Comparing voiceprint...')
      try {
        const compareRes = await fetch(`${BACKEND}/api/v1/verify/compare/voice`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: 'demo_user',
            audio_base64: audioBase64,
          }),
        })
        const compareResult = await compareRes.json()
        
        if (!compareResult.match && compareResult.status === 'mismatch') {
          setVerificationResult(`✗ Voice mismatch — different speaker detected`)
          await reportVerificationFailure('voice_mismatch', 'high')
          setVerifying(false)
          setTimeout(() => setVerificationResult(null), 3500)
          return
        }
        if (compareResult.status === 'replay_detected') {
          setVerificationResult(`✗ Replay attack detected — use your live voice`)
          await reportVerificationFailure('replay_detected', 'critical')
          setVerifying(false)
          setTimeout(() => setVerificationResult(null), 3500)
          return
        }
        if (compareResult.status === 'no_enrollment') {
          setVerificationResult('✗ No enrolled voiceprint — complete onboarding first')
          await reportVerificationFailure('no_enrollment', 'low')
          setVerifying(false)
          setTimeout(() => setVerificationResult(null), 3500)
          return
        }
      } catch {
        // Voice comparison unavailable — BLOCK
        setVerificationResult('✗ Voice verification unavailable — try again')
        setVerifying(false)
        setTimeout(() => setVerificationResult(null), 3000)
        return
      }

      // PASSED
      setVerificationResult('✓ Voice verified — speaker confirmed')
      // Report successful verification → trust recovery
      try {
        const BACKEND2 = import.meta.env.VITE_BACKEND_URL || ''
        await fetch(`${BACKEND2}/api/v1/security/evaluate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: userId, session_id: 'sess_payment',
            trust_score: Math.min(0.92, (trustScore + 15) / 100),
            cognitive_state: 'focused',
            drift_detected: false, drift_severity: 'none',
            velocity: 0.02, anomaly_score: 0.0,
            verification_success: 'voice',
          }),
        })
      } catch {}
      await new Promise(r => setTimeout(r, 1200))
      setVerificationResult(null)
      setVerifying(false)
      onStepChange('processing')
      setTimeout(() => { onStepChange('success'); onSuccess(Number(amount), selectedContact) }, 1800)
    } catch {
      setVerificationResult('✗ Microphone access required — cannot verify voice')
      await reportVerificationFailure('mic_denied', 'high')
      setVerifying(false)
      setTimeout(() => setVerificationResult(null), 4000)
    }
  }

  const handleFaceVerifyComplete = async () => {
    if (!challenge) { onStepChange('processing'); setTimeout(() => { onStepChange('success'); onSuccess(Number(amount), selectedContact) }, 1800); return }
    setVerifying(true)
    setVerificationResult('Opening camera...')

    try {
      // Step 1: Open camera and SHOW it on screen so user sees themselves
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 320, height: 240 } })
      setFaceStream(stream)
      // Wait for video element to render and bind
      await new Promise(r => setTimeout(r, 500))
      if (faceVideoRef.current) {
        faceVideoRef.current.srcObject = stream
        faceVideoRef.current.play().catch(() => {})
      }
      setVerificationResult(`Now: ${challenge.liveness_actions?.[0]?.replace('_', ' ') || 'look forward'}`)
      // Give user 2.5 seconds to perform the action while seeing themselves
      await new Promise(r => setTimeout(r, 2500))

      // Capture frame AFTER user has had time to perform action
      const video = faceVideoRef.current || document.createElement('video')
      if (!faceVideoRef.current) { video.srcObject = stream; video.muted = true; await video.play(); await new Promise(r => setTimeout(r, 500)) }
      const canvas = document.createElement('canvas')
      canvas.width = 320; canvas.height = 240
      canvas.getContext('2d')!.drawImage(video, 0, 0, 320, 240)
      const frameBase64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1]
      stream.getTracks().forEach(t => t.stop())
      setFaceStream(null)

      setVerificationResult('Analyzing face...')

      // Step 2: Quality gate — validate real face present (Gemini/heuristics)
      const BACKEND = import.meta.env.VITE_BACKEND_URL || ''
      let validation: any
      try {
        const res = await fetch(`${BACKEND}/api/v1/verify/validate/face`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image_base64: frameBase64,
            required_action: challenge.liveness_actions?.[0] || 'look forward',
          }),
        })
        validation = await res.json()
      } catch {
        setVerificationResult('✗ Server unreachable — cannot verify face')
        setVerifying(false)
        setTimeout(() => setVerificationResult(null), 3000)
        return
      }

      if (!validation.valid || !validation.face_detected) {
        // FAILED — face not detected or wrong direction
        setVerificationResult(`✗ ${validation.reason || 'Face not detected — try again'}`)
        await reportVerificationFailure('liveness_failed', 'medium')
        setVerifying(false)
        setTimeout(() => setVerificationResult(null), 3000)
        return
      }

      // Step 2.5: Liveness action verification — server checks if user actually performed the action
      if (challenge.liveness_actions && challenge.liveness_actions.length > 0) {
        setVerificationResult(`Checking action: ${challenge.liveness_actions[0].replace('_',' ')}...`)
        try {
          const livenessRes = await fetch(`${BACKEND}/api/v1/verify/liveness/check`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              image_base64: frameBase64,
              required_actions: challenge.liveness_actions,
            }),
          })
          const livenessResult = await livenessRes.json()

          if (!livenessResult.live) {
            // Action not detected — user didn't actually perform it
            setVerificationResult(`✗ ${livenessResult.reason || 'Action not detected — please ' + (challenge.liveness_actions[0] || 'look in the indicated direction')}`)
            await reportVerificationFailure('liveness_failed', 'medium')
            setVerifying(false)
            setTimeout(() => setVerificationResult(null), 3500)
            return
          }
        } catch {
          // Liveness endpoint unavailable — BLOCK (fail-closed)
          setVerificationResult('✗ Liveness check failed — please try again')
          setVerifying(false)
          setTimeout(() => setVerificationResult(null), 3000)
          return
        }
      }

      // Step 3: Identity comparison — compare against enrolled face
      setVerificationResult('Comparing identity...')
      try {
        const compareRes = await fetch(`${BACKEND}/api/v1/verify/compare/face`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: 'demo_user',
            image_base64: frameBase64,
          }),
        })
        const compareResult = await compareRes.json()
        
        // If provider says face mismatch (different person)
        if (!compareResult.match && compareResult.status === 'mismatch') {
          setVerificationResult(`✗ Identity mismatch — this doesn't match the enrolled face`)
          await reportVerificationFailure('face_mismatch', 'high')
          setVerifying(false)
          setTimeout(() => setVerificationResult(null), 3500)
          return
        }
        if (compareResult.status === 'no_enrollment') {
          // No enrolled face — BLOCK, must complete onboarding
          setVerificationResult('✗ No enrolled face — complete onboarding first')
          await reportVerificationFailure('no_enrollment', 'low')
          setVerifying(false)
          setTimeout(() => setVerificationResult(null), 3500)
          return
        }
      } catch {
        // Face comparison endpoint unavailable — BLOCK (fail-closed)
        setVerificationResult('✗ Identity verification unavailable — please try again')
        setVerifying(false)
        setTimeout(() => setVerificationResult(null), 3000)
        return
      }

      // PASSED
      setVerificationResult('✓ Face verified — identity confirmed')
      // Report successful verification → trust recovery
      try {
        const BACKEND2 = import.meta.env.VITE_BACKEND_URL || ''
        await fetch(`${BACKEND2}/api/v1/security/evaluate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: userId, session_id: 'sess_payment',
            trust_score: Math.min(0.95, (trustScore + 20) / 100),
            cognitive_state: 'calm',
            drift_detected: false, drift_severity: 'none',
            velocity: 0.03, anomaly_score: 0.0,
            verification_success: 'face',
          }),
        })
      } catch {}
      await new Promise(r => setTimeout(r, 1200))
      setVerificationResult(null)
      setVerifying(false)
      onStepChange('processing')
      setTimeout(() => { onStepChange('success'); onSuccess(Number(amount), selectedContact) }, 1800)
    } catch {
      // Camera unavailable — BLOCK, don't auto-pass
      if (faceStream) { faceStream.getTracks().forEach(t => t.stop()); setFaceStream(null) }
      setVerificationResult('✗ Camera access required — cannot verify identity')
      await reportVerificationFailure('camera_denied', 'high')
      setVerifying(false)
      setTimeout(() => setVerificationResult(null), 4000)
    }
  }

  const [pinError, setPinError] = useState(false)
  const [faceStream, setFaceStream] = useState<MediaStream | null>(null)
  const faceVideoRef = React.useRef<HTMLVideoElement>(null)

  const handlePinDigit = (d: string) => {
    if (pin.length >= PIN_LENGTH) return
    const newPin = pin + d
    setPin(newPin)
    setPinError(false)
    if (newPin.length === PIN_LENGTH) {
      // Validate MPIN against stored PIN from onboarding
      const u = localStorage.getItem('aegisx_username') || 'default'
      const storedMpin = localStorage.getItem(`aegisx_mpin_${u}`)
      if (storedMpin && newPin !== storedMpin) {
        // WRONG PIN — reject and track attempts
        setPinError(true)
        const attemptKey = `aegisx_pin_attempts_${u}`
        const attempts = parseInt(localStorage.getItem(attemptKey) || '0') + 1
        localStorage.setItem(attemptKey, String(attempts))
        
        // 3 wrong attempts = block transaction entirely
        if (attempts >= 3) {
          localStorage.setItem(attemptKey, '0')  // reset counter
          onBlock()  // trigger block overlay
          return
        }
        
        setTimeout(() => { setPin(''); setPinError(false) }, 1200)
        // Report failed PIN attempt to backend — this reduces trust
        try {
          const BACKEND = import.meta.env.VITE_BACKEND_URL || ''
          fetch(`${BACKEND}/api/v1/security/evaluate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user_id: 'demo_user',
              session_id: 'sess_payment',
              trust_score: Math.max(0.1, (trustScore - 15 * attempts) / 100),
              cognitive_state: attempts >= 2 ? 'panicked' : 'distressed',
              drift_detected: true,
              drift_severity: attempts >= 2 ? 'high' : 'medium',
              velocity: -0.05 * attempts,
              anomaly_score: 0.3 + attempts * 0.2,
            }),
          }).catch(() => {})
        } catch {}
        return
      }
      // PIN correct — reset attempt counter
      localStorage.setItem(`aegisx_pin_attempts_${u}`, '0')
      // PIN correct → check if extra biometric security step pending
      if (pendingVerifyStep) {
        const nextStep = pendingVerifyStep
        setPendingVerifyStep(null)
        onStepChange(nextStep)
      } else {
        onStepChange('processing')
        setTimeout(() => {
          onStepChange('success')
          onSuccess(Number(amount), selectedContact)
        }, 1800)
      }
    }
  }

  const handlePinDelete = () => { setPin(p => p.slice(0, -1)); setPinError(false) }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Step header */}
      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--border-light)' }}>
        {currentStep !== 'success' && (
          <button
            onClick={stepIndex > 0 ? () => onStepChange(steps[stepIndex - 1] as FlowStep) : onBack}
            style={{ background: 'var(--border-light)', border: '1px solid var(--border-medium)', borderRadius: 8, padding: '5px', cursor: 'pointer', color: '#93b4e4', display: 'flex' }}
          >
            <ArrowLeft size={13} />
          </button>
        )}
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#e8f0fe', fontFamily: 'Space Grotesk' }}>
            {currentStep === 'contacts' ? 'Send Money' :
             currentStep === 'amount' ? `To ${selectedContact.name}` :
             currentStep === 'review' ? 'Review Payment' :
             currentStep === 'pin' ? 'Enter UPI PIN' :
             currentStep === 'processing' ? 'Processing...' : 'Payment Sent!'}
          </div>
          {currentStep !== 'success' && currentStep !== 'processing' && (
            <div style={{ fontSize: 8, color: '#5b8cc7', fontFamily: 'JetBrains Mono' }}>
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
              <div style={{ fontSize: 9, color: '#5b8cc7', fontFamily: 'JetBrains Mono', marginBottom: 10, textTransform: 'uppercase' }}>Recent Contacts</div>
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
                    border: `1px solid ${c.isNew ? 'rgba(239,68,68,0.2)' : 'var(--border-light)'}`,
                    background: c.isNew ? 'rgba(239,68,68,0.04)' : 'var(--accent-dim)',
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
                    <div style={{ fontSize: 8, color: '#5b8cc7', fontFamily: 'JetBrains Mono' }}>{c.upi}</div>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 20, background: 'var(--accent-dim)', border: '1px solid var(--border-medium)', marginBottom: 20 }}>
                <div style={{ width: 24, height: 24, borderRadius: 8, background: `${selectedContact.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: selectedContact.color }}>
                  {selectedContact.initials}
                </div>
                <span style={{ fontSize: 11, color: '#93b4e4', fontFamily: 'Space Grotesk' }}>{selectedContact.name}</span>
                <span style={{ fontSize: 8, color: '#5b8cc7', fontFamily: 'JetBrains Mono' }}>{selectedContact.upi}</span>
              </div>

              {/* Amount display */}
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <div style={{ fontSize: 42, fontWeight: 900, color: amount ? 'white' : 'rgba(255,255,255,0.2)', fontFamily: 'Space Grotesk', letterSpacing: '-1px' }}>
                  ₹{amount ? Number(amount).toLocaleString() : '0'}
                </div>
                <div style={{ fontSize: 9, color: '#5b8cc7', fontFamily: 'JetBrains Mono', marginTop: 4 }}>TAP AMOUNT BELOW</div>
              </div>

              {/* Quick amounts */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
                {['500', '1000', '2000', '5000', '10000', '50000'].map(v => (
                  <motion.button key={v} whileTap={{ scale: 0.95 }}
                    onClick={() => setAmount(v)}
                    style={{
                      padding: '6px 12px', borderRadius: 20, border: `1px solid ${amount === v ? '#10B981' : 'var(--border-medium)'}`,
                      background: amount === v ? 'rgba(59,130,246,0.1)' : 'transparent',
                      color: amount === v ? '#10B981' : 'rgba(255,255,255,0.5)',
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
                      height: 44, borderRadius: 10, border: '1px solid var(--border-light)',
                      background: 'var(--accent-dim)', color: '#e8f0fe',
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
                  border: 'none', background: 'linear-gradient(135deg, #10B981, #2563EB)',
                  color: '#e8f0fe', fontSize: 13, fontWeight: 700, cursor: 'pointer',
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
              <div style={{ background: 'var(--accent-dim)', borderRadius: 14, border: '1px solid var(--border-light)', overflow: 'hidden', marginBottom: 14 }}>
                <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--accent-dim)' }}>
                  <div style={{ fontSize: 9, color: '#5b8cc7', fontFamily: 'JetBrains Mono', marginBottom: 4 }}>PAYING TO</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: `${selectedContact.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: selectedContact.color }}>{selectedContact.initials}</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#e8f0fe', fontFamily: 'Space Grotesk' }}>{selectedContact.name}</div>
                      <div style={{ fontSize: 8, color: '#5b8cc7', fontFamily: 'JetBrains Mono' }}>{selectedContact.upi}</div>
                    </div>
                  </div>
                </div>
                {[
                  { label: 'Amount', value: `₹${Number(amount).toLocaleString()}` },
                  { label: 'From', value: 'Savings A/C ••4521' },
                  { label: 'Bank', value: 'Central Bank of India' },
                  { label: 'UPI Reference', value: `UPI${Date.now().toString().slice(-8)}` },
                ].map(row => (
                  <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 16px', borderBottom: '1px solid var(--accent-dim)' }}>
                    <span style={{ fontSize: 10, color: '#5b8cc7', fontFamily: 'JetBrains Mono' }}>{row.label}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#e8f0fe', fontFamily: 'Space Grotesk' }}>{row.value}</span>
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
                  background: 'linear-gradient(135deg, #10B981, #1d4ed8)',
                  color: '#e8f0fe', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  fontFamily: 'Space Grotesk', boxShadow: '0 4px 20px rgba(59,130,246,0.25)',
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
              <p style={{ fontSize: 10, color: '#5b8cc7', textAlign: 'center', lineHeight: 1.6, marginBottom: 12, fontFamily: 'Space Grotesk' }}>
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
                  style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: verifying ? 'rgba(139,92,246,0.2)' : '#8B5CF6', color: '#e8f0fe', fontSize: 11, fontWeight: 700, cursor: verifying ? 'default' : 'pointer', fontFamily: 'Space Grotesk' }}>
                  {verifying ? 'Verifying...' : 'Hold to Speak'}
                </motion.button>
              )}
              <div style={{ fontSize: 8, color: '#5b8cc7', fontFamily: 'JetBrains Mono', marginTop: 12 }}>
                AEGIS-X · Speaker Verification · T(t)={trustAtPayment.toFixed(0)}%
              </div>
            </motion.div>
          )}

          {/* FACE LIVENESS CHALLENGE */}
          {currentStep === 'face_verify' && (
            <motion.div key="face_verify" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              {/* Live camera feed OR camera icon */}
              <div style={{ width: 120, height: 120, borderRadius: '50%', border: `3px solid ${verifying ? '#10B981' : '#EF4444'}`, overflow: 'hidden', marginBottom: 14, position: 'relative', background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {faceStream ? (
                  <video ref={faceVideoRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
                ) : (
                  <Camera size={32} color={verifying ? '#10B981' : '#EF4444'} />
                )}
                {verifying && !faceStream && (
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }} style={{ position: 'absolute', inset: -4, border: '2px solid transparent', borderTopColor: '#10B981', borderRadius: '50%' }} />
                )}
              </div>
              <div style={{ fontSize: 14, fontWeight: 800, color: verifying ? '#10B981' : '#EF4444', fontFamily: 'Space Grotesk', marginBottom: 6 }}>
                {faceStream ? `Action: ${challenge?.liveness_actions?.[0]?.replace('_',' ') || 'look forward'}` : verifying ? 'Verifying Identity...' : 'Face Liveness Check'}
              </div>
              <p style={{ fontSize: 10, color: '#5b8cc7', textAlign: 'center', lineHeight: 1.6, marginBottom: 12, fontFamily: 'Space Grotesk' }}>
                {faceStream ? 'Look in the indicated direction — capturing in a moment...' : verifying ? 'Analyzing face direction and liveness...' : 'Complete face verification to proceed with this transaction.'}
              </p>
              {challenge?.liveness_actions && challenge.liveness_actions.length > 0 && (
                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                  {challenge.liveness_actions.map((action, i) => (
                    <div key={i} style={{ padding: '5px 10px', borderRadius: 6, background: faceStream ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.06)', border: `1px solid ${faceStream ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.2)'}`, fontSize: 9, color: faceStream ? '#10B981' : '#F87171', fontFamily: 'JetBrains Mono', textTransform: 'capitalize', fontWeight: 700 }}>
                      {action.replace('_', ' ')}
                    </div>
                  ))}
                </div>
              )}
              {verificationResult ? (
                <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} style={{ fontSize: 12, fontWeight: 700, color: verificationResult.includes('✓') ? '#10B981' : verificationResult.includes('Now:') ? '#60a5fa' : '#EF4444', fontFamily: 'Space Grotesk' }}>
                  {verificationResult}
                </motion.div>
              ) : (
                <motion.button whileTap={{ scale: 0.95 }} onClick={handleFaceVerifyComplete} disabled={verifying}
                  style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: verifying ? 'rgba(239,68,68,0.2)' : '#EF4444', color: '#e8f0fe', fontSize: 11, fontWeight: 700, cursor: verifying ? 'default' : 'pointer', fontFamily: 'Space Grotesk' }}>
                  {verifying ? 'Analyzing...' : 'Start Face Scan'}
                </motion.button>
              )}
              <div style={{ fontSize: 8, color: '#5b8cc7', fontFamily: 'JetBrains Mono', marginTop: 12 }}>
                AEGIS-X · Face Liveness · T(t)={trustAtPayment.toFixed(0)}%
              </div>
            </motion.div>
          )}

          {/* STEP 4: UPI PIN */}
          {currentStep === 'pin' && (
            <motion.div key="pin" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              style={{ padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ fontSize: 11, color: pinError ? '#EF4444' : '#5b8cc7', fontFamily: 'JetBrains Mono', marginBottom: 6 }}>{pinError ? 'Wrong MPIN — try again' : 'Enter 6-digit MPIN'}</div>
              <div style={{ fontSize: 12, color: '#5b8cc7', fontFamily: 'Space Grotesk', marginBottom: 20 }}>
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
                      border: k ? '1px solid var(--border-light)' : 'none',
                      background: k ? 'var(--accent-dim)' : 'transparent',
                      color: '#e8f0fe', fontSize: 18, fontWeight: 500,
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
              <div style={{ marginTop: 16, fontSize: 14, fontWeight: 700, color: '#e8f0fe', fontFamily: 'Space Grotesk' }}>Processing Payment</div>
              <div style={{ marginTop: 4, fontSize: 9, color: '#5b8cc7', fontFamily: 'JetBrains Mono' }}>AEGIS-X verifying transaction...</div>
            </motion.div>
          )}

          {/* Success */}
          {currentStep === 'success' && (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              style={{ padding: '32px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, delay: 0.1 }}>
                <div style={{ width: 130, height: 130, borderRadius: '50%', background: 'rgba(16,185,129,0.08)', border: '2.5px solid rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  <img src="/Payment Successful Animation.svg" alt="Payment Successful" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                </div>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <div style={{ marginTop: 16, textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#10B981', fontFamily: 'Space Grotesk' }}>Payment Successful!</div>
                  <div style={{ fontSize: 28, fontWeight: 900, color: '#e8f0fe', fontFamily: 'Space Grotesk', margin: '8px 0' }}>
                    ₹{Number(amount).toLocaleString()}
                  </div>
                  <div style={{ fontSize: 11, color: '#5b8cc7', fontFamily: 'Space Grotesk' }}>Sent to {selectedContact.name}</div>
                  <div style={{ marginTop: 10, padding: '6px 12px', borderRadius: 20, background: 'rgba(59,130,246,0.08)', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#10B981' }} />
                    <span style={{ fontSize: 8, color: '#10B981', fontFamily: 'JetBrains Mono' }}>AEGIS-X Verified · Behavioral Identity Confirmed</span>
                  </div>
                </div>
              </motion.div>
              <motion.button whileTap={{ scale: 0.97 }}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                onClick={onBack}
                style={{ marginTop: 20, padding: '10px 24px', borderRadius: 10, border: '1px solid var(--border-medium)', background: 'var(--accent-dim)', color: '#93b4e4', fontSize: 11, cursor: 'pointer', fontFamily: 'Space Grotesk' }}>
                Back to Home
              </motion.button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  )
}
