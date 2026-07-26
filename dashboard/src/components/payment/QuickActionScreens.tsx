import React, { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  ArrowLeft, Check, Loader, QrCode, Smartphone, Zap,
  Car, ShieldCheck, CreditCard, ChevronRight,
  Wifi, Droplets, Flame, Building2, Tv
} from 'lucide-react'

interface BaseScreenProps { onBack: () => void; onSuccess?: () => void; trustScore: number }

// ─── Shared styles ────────────────────────────────────────────────────────────

const pageWrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column' }

const header = (onBack: () => void, title: string, sub?: string): React.ReactNode => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
    <button onClick={onBack} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '5px', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', display: 'flex' }}>
      <ArrowLeft size={13} />
    </button>
    <div>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'white', fontFamily: 'Space Grotesk' }}>{title}</div>
      {sub && <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', fontFamily: 'JetBrains Mono' }}>{sub}</div>}
    </div>
  </div>
)

function InputField({ label, value, onChange, placeholder, type = 'text', suffix }: {
  label: string; value: string; onChange: (v: string) => void
  placeholder: string; type?: string; suffix?: string
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', fontFamily: 'JetBrains Mono', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</div>
      <div style={{ position: 'relative' }}>
        <input
          type={type} value={value} onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          style={{
            width: '100%', boxSizing: 'border-box',
            height: 42, padding: suffix ? '0 50px 0 12px' : '0 12px',
            borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(255,255,255,0.03)', color: 'white',
            fontSize: 13, fontFamily: 'Space Grotesk', outline: 'none',
          }}
        />
        {suffix && <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: 'rgba(255,255,255,0.3)', fontFamily: 'JetBrains Mono' }}>{suffix}</span>}
      </div>
    </div>
  )
}

function SuccessCard({ amount, label, sub, onBack }: { amount?: string; label: string; sub: string; onBack: () => void }) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }}
      style={{ padding: '32px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 280, delay: 0.1 }}
        style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(16,185,129,0.1)', border: '2px solid rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Check size={26} color="#10B981" strokeWidth={3} />
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: '#10B981', fontFamily: 'Space Grotesk', marginTop: 16 }}>{label}</div>
        {amount && <div style={{ fontSize: 26, fontWeight: 900, color: 'white', fontFamily: 'Space Grotesk', margin: '6px 0' }}>{amount}</div>}
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: 'Space Grotesk' }}>{sub}</div>
        <div style={{ marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 20, background: 'rgba(16,185,129,0.08)' }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#10B981' }} />
          <span style={{ fontSize: 8, color: '#10B981', fontFamily: 'JetBrains Mono' }}>AEGIS-X Verified</span>
        </div>
      </motion.div>
      <motion.button whileTap={{ scale: 0.97 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
        onClick={onBack}
        style={{ marginTop: 22, padding: '10px 24px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.6)', fontSize: 11, cursor: 'pointer', fontFamily: 'Space Grotesk' }}>
        Back to Home
      </motion.button>
    </motion.div>
  )
}

function PayButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <motion.button whileTap={{ scale: 0.97 }} onClick={onPress} disabled={disabled}
      style={{
        width: '100%', height: 46, borderRadius: 12, border: 'none',
        background: disabled ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg,#10B981,#059669)',
        color: disabled ? 'rgba(255,255,255,0.3)' : 'white',
        fontSize: 13, fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: 'Space Grotesk', boxShadow: disabled ? 'none' : '0 4px 18px rgba(16,185,129,0.2)',
      }}>
      {label}
    </motion.button>
  )
}

// ─── QR Scan ─────────────────────────────────────────────────────────────────
export const QRScanScreen: React.FC<BaseScreenProps> = ({ onBack, trustScore }) => {
  const [done, setDone] = useState(false)
  const qrColor = trustScore > 85 ? '#10B981' : '#F59E0B'

  if (done) return <SuccessCard label="QR Scanned!" sub="Redirecting to payment..." onBack={onBack} />

  return (
    <div style={pageWrap}>
      {header(onBack, 'Scan & Pay', 'Point at any UPI QR code')}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px', gap: 16 }}>
        {/* Simulated QR scanner */}
        <div style={{ position: 'relative', width: 200, height: 200 }}>
          <div style={{ position: 'absolute', inset: 0, border: `2px solid ${qrColor}20`, borderRadius: 16 }} />
          {/* Corner brackets */}
          {[['0,0', 'top:0;left:0', '0', '0'], ['0,0', 'top:0;right:0', '0', '0'],
            ['0,0', 'bottom:0;left:0', '0', '0'], ['0,0', 'bottom:0;right:0', '0', '0']].map((_, i) => (
            <div key={i} style={{
              position: 'absolute',
              width: 24, height: 24,
              borderTop: i < 2 ? `2px solid ${qrColor}` : 'none',
              borderBottom: i >= 2 ? `2px solid ${qrColor}` : 'none',
              borderLeft: i % 2 === 0 ? `2px solid ${qrColor}` : 'none',
              borderRight: i % 2 === 1 ? `2px solid ${qrColor}` : 'none',
              top: i < 2 ? 0 : 'auto', bottom: i >= 2 ? 0 : 'auto',
              left: i % 2 === 0 ? 0 : 'auto', right: i % 2 === 1 ? 0 : 'auto',
              borderRadius: i === 0 ? '8px 0 0 0' : i === 1 ? '0 8px 0 0' : i === 2 ? '0 0 0 8px' : '0 0 8px 0',
            }} />
          ))}
          {/* Scan line */}
          <motion.div
            animate={{ top: ['15%', '85%', '15%'] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
            style={{ position: 'absolute', left: 8, right: 8, height: 2, background: `linear-gradient(90deg,transparent,${qrColor},transparent)`, borderRadius: 1 }}
          />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <QrCode size={64} color="rgba(255,255,255,0.08)" />
          </div>
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'Space Grotesk', textAlign: 'center' }}>Scanning for QR codes...</div>
        {/* Demo: simulate scan after click */}
        <motion.button whileTap={{ scale: 0.96 }} onClick={() => setDone(true)}
          style={{ padding: '10px 24px', borderRadius: 10, border: '1px solid rgba(16,185,129,0.25)', background: 'rgba(16,185,129,0.06)', color: '#10B981', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Space Grotesk' }}>
          Simulate QR Detected
        </motion.button>
      </div>
    </div>
  )
}
