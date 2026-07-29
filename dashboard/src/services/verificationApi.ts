/**
 * Verification API Client
 * ========================
 * Frontend service for the Adaptive Verification Engine.
 * Covers enrollment, verification, delegates, and history.
 */

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || ''
const API_BASE = `${BACKEND_URL}/api/v1/verify`

// ─── TYPES ───────────────────────────────────────────────────────────────────

export type VerificationType =
  | 'NONE'
  | 'PASSIVE_OBSERVE'
  | 'VOICE_CHALLENGE'
  | 'FACE_LIVENESS'
  | 'DELEGATE_VERIFY'
  | 'HOLD_AND_NOTIFY'

export type VerificationStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'SUCCESS'
  | 'FAILED'
  | 'EXPIRED'
  | 'HELD'

export interface VerificationChallenge {
  challenge_id: string
  user_id: string
  session_id: string
  verification_type: VerificationType
  risk_source: string
  status: VerificationStatus
  trust_before: number
  trust_after: number
  confidence: number
  latency_ms: number
  phrase: string
  liveness_actions: string[]
  matched_delegate_id: string
  reason: string
  explanation: string
  created_at: string
  completed_at: string
}

export interface Delegate {
  delegate_id: string
  name: string
  relationship: string
  has_voice: boolean
  has_face: boolean
  has_behavioral: boolean
  is_active: boolean
  verified_at: string
}

export interface ProviderStatus {
  voice_verifier: string | null
  face_verifier: string | null
  liveness: string | null
  voice_enrollment: string | null
  face_enrollment: string | null
  delegate_verifier: string | null
}

// ─── INITIATE VERIFICATION ───────────────────────────────────────────────────

export async function initiateVerification(params: {
  user_id: string
  session_id: string
  trust_score: number
  cognitive_state?: string
  drift_detected?: boolean
  drift_severity?: string
  velocity?: number
  anomaly_score?: number
  transaction_amount?: number
  reasons?: string[]
}): Promise<VerificationChallenge> {
  const res = await fetch(`${API_BASE}/initiate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  return res.json()
}

// ─── VOICE VERIFICATION ──────────────────────────────────────────────────────

export async function verifyVoice(challengeId: string, audioBase64: string) {
  const res = await fetch(`${API_BASE}/provider/voice`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ challenge_id: challengeId, audio_base64: audioBase64 }),
  })
  return res.json()
}

// ─── FACE VERIFICATION ───────────────────────────────────────────────────────

export async function verifyFace(challengeId: string, imageBase64: string, completedActions: string[]) {
  const res = await fetch(`${API_BASE}/provider/face`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      challenge_id: challengeId,
      image_base64: imageBase64,
      completed_actions: completedActions,
    }),
  })
  return res.json()
}

// ─── ENROLLMENT ──────────────────────────────────────────────────────────────

export async function enrollVoice(userId: string, audioSamplesBase64: string[]) {
  const res = await fetch(`${API_BASE}/provider/enroll/voice`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, audio_samples_base64: audioSamplesBase64 }),
  })
  return res.json()
}

export async function enrollFace(userId: string, imageSamplesBase64: string[]) {
  const res = await fetch(`${API_BASE}/provider/enroll/face`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, image_samples_base64: imageSamplesBase64 }),
  })
  return res.json()
}

// ─── DELEGATES ───────────────────────────────────────────────────────────────

export async function getDelegates(userId: string): Promise<{ delegates: Delegate[] }> {
  const res = await fetch(`${API_BASE}/delegates/${userId}`)
  return res.json()
}

export async function registerDelegate(params: {
  primary_user_id: string
  name: string
  relationship: string
}) {
  const res = await fetch(`${API_BASE}/delegate/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  return res.json()
}

// ─── HISTORY & STATUS ────────────────────────────────────────────────────────

export async function getVerificationHistory(userId: string): Promise<{ history: VerificationChallenge[] }> {
  const res = await fetch(`${API_BASE}/history/${userId}`)
  return res.json()
}

export async function getActiveChallenge(userId: string) {
  const res = await fetch(`${API_BASE}/active/${userId}`)
  return res.json()
}

export async function getProvidersStatus(): Promise<ProviderStatus> {
  const res = await fetch(`${API_BASE}/providers`)
  return res.json()
}

export async function getEngineStatus() {
  const res = await fetch(`${API_BASE}/status`)
  return res.json()
}
