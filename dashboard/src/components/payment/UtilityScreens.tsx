import React, { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  ArrowLeft, Check, Loader, ChevronRight, QrCode,
  Smartphone, Zap, Car, Shield, CreditCard, MoreHorizontal,
  Wifi, Tv, Droplets, Flame
} from 'lucide-react'

// ─── Shared helpers ────────────────────────────────────────────────────────

function ScreenHeader({ title, subtitle, onBack }: { title: string; subtitle?: string; onBack: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: '1px solid var(--border-light)' }}>
      <button onClick={onBack} style={{ background: 'var(--accent-dim)', border: '1px solid var(--border-light)', borderRadius: 8, padding: 6, cursor: 'pointer', color: '#93b4e4', display: 'flex' }}>
        <ArrowLeft size={13} />
      </button>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#e8f0fe', fontFamily: 'Space Grotesk' }}>{title}</div>
        {subtitle && <div style={{ fontSize: 8, color: '#5b8cc7', fontFamily: 'JetBrains Mono' }}>{subtitle}</div>}
      </div>
    </div>
  )
}

function PayButton({ label, onPay }: { label: string; onPay: () => void }) {
  return (
    <motion.button whileTap={{ scale: 0.97 }} onClick={onPay}
      style={{ width: '100%', height: 46, borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#10B981,#059669)', color: '#e8f0fe', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Space Grotesk', boxShadow: '0 4px 20px rgba(16,185,129,0.25)' }}>
      {label}
    </motion.button>
  )
}

function SuccessScreen({ title, amount, detail, onDone }: { title: string; amount: string; detail: string; onDone: () => void }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 20px' }}>
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300 }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(16,185,129,0.12)', border: '2px solid rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Check size={28} color="#10B981" strokeWidth={3} />
        </div>
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} style={{ textAlign: 'center', marginTop: 14 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: '#10B981', fontFamily: 'Space Grotesk' }}>{title}</div>
        <div style={{ fontSize: 26, fontWeight: 900, color: '#e8f0fe', fontFamily: 'Space Grotesk', margin: '6px 0' }}>{amount}</div>
        <div style={{ fontSize: 10, color: '#5b8cc7', fontFamily: 'Space Grotesk' }}>{detail}</div>
        <div style={{ marginTop: 10, padding: '5px 12px', borderRadius: 20, background: 'rgba(16,185,129,0.08)', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#10B981' }} />
          <span style={{ fontSize: 8, color: '#10B981', fontFamily: 'JetBrains Mono' }}>AEGIS-X Verified</span>
        </div>
      </motion.div>
      <motion.button whileTap={{ scale: 0.97 }} onClick={onDone} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
        style={{ marginTop: 20, padding: '10px 24px', borderRadius: 10, border: '1px solid var(--border-medium)', background: 'var(--accent-dim)', color: '#93b4e4', fontSize: 11, cursor: 'pointer', fontFamily: 'Space Grotesk' }}>
        Back to Home
      </motion.button>
    </div>
  )
}

function ProcessingScreen() {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
        <Loader size={28} color="#10B981" />
      </motion.div>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#e8f0fe', fontFamily: 'Space Grotesk' }}>Processing...</div>
      <div style={{ fontSize: 8, color: '#5b8cc7', fontFamily: 'JetBrains Mono' }}>AEGIS-X verifying</div>
    </div>
  )
}

// ─── QR Scan ───────────────────────────────────────────────────────────────

export function QRScanScreen({ onBack }: { onBack: () => void }) {
  const [scanned, setScanned] = useState(false)
  const [step, setStep] = useState<'scan' | 'preview' | 'processing' | 'success'>('scan')
  const mockUpi = 'merchant@hdfc'
  const mockName = 'CBI Canteen'
  const [amount, setAmount] = useState('')

  if (step === 'processing') {
    setTimeout(() => setStep('success'), 1600)
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <ScreenHeader title="Scan & Pay" onBack={onBack} />
        <ProcessingScreen />
      </div>
    )
  }
  if (step === 'success') return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <ScreenHeader title="Scan & Pay" onBack={onBack} />
      <SuccessScreen title="Payment Successful!" amount={`₹${Number(amount || 0).toLocaleString()}`} detail={`Paid to ${mockName}`} onDone={onBack} />
    </div>
  )

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <ScreenHeader title="Scan QR Code" subtitle="Point camera at any UPI QR" onBack={onBack} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 16px' }}>
        {step === 'scan' && (
          <>
            {/* Fake camera viewfinder */}
            <div style={{ position: 'relative', width: 200, height: 200, marginBottom: 20 }}>
              <div style={{ width: '100%', height: '100%', borderRadius: 16, background: 'rgba(16,185,129,0.04)', border: '1px solid rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                <QrCode size={80} color="rgba(255,255,255,0.08)" />
                {/* Corner brackets */}
                {['tl','tr','bl','br'].map(c => (
                  <div key={c} style={{ position: 'absolute', width: 20, height: 20, [c.includes('t') ? 'top' : 'bottom']: 8, [c.includes('l') ? 'left' : 'right']: 8, borderTop: c.includes('t') ? '2px solid #10B981' : 'none', borderBottom: c.includes('b') ? '2px solid #10B981' : 'none', borderLeft: c.includes('l') ? '2px solid #10B981' : 'none', borderRight: c.includes('r') ? '2px solid #10B981' : 'none' }} />
                ))}
                {/* Scan line */}
                <motion.div animate={{ y: [-80, 80, -80] }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  style={{ position: 'absolute', left: 10, right: 10, height: 2, background: 'linear-gradient(90deg,transparent,#10B981,transparent)', borderRadius: 99 }} />
              </div>
            </div>
            <div style={{ fontSize: 10, color: '#5b8cc7', fontFamily: 'Space Grotesk', marginBottom: 20, textAlign: 'center' }}>
              Align QR code within the frame
            </div>
            <motion.button whileTap={{ scale: 0.97 }} onClick={() => setStep('preview')}
              style={{ padding: '10px 28px', borderRadius: 10, border: '1px solid rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.08)', color: '#10B981', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Space Grotesk' }}>
              Simulate QR Detected
            </motion.button>
          </>
        )}
        {step === 'preview' && (
          <div style={{ width: '100%' }}>
            <div style={{ background: 'var(--accent-dim)', borderRadius: 14, border: '1px solid var(--border-light)', padding: '16px', marginBottom: 14 }}>
              <div style={{ fontSize: 9, color: '#5b8cc7', fontFamily: 'JetBrains Mono', marginBottom: 8 }}>MERCHANT DETAILS</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#e8f0fe', fontFamily: 'Space Grotesk' }}>{mockName}</div>
              <div style={{ fontSize: 9, color: '#5b8cc7', fontFamily: 'JetBrains Mono', marginTop: 2 }}>{mockUpi}</div>
            </div>
            <div style={{ fontSize: 32, fontWeight: 900, color: amount ? 'white' : 'rgba(255,255,255,0.15)', fontFamily: 'Space Grotesk', textAlign: 'center', marginBottom: 12 }}>
              ₹{amount ? Number(amount).toLocaleString() : '0'}
            </div>
            <input value={amount} onChange={e => setAmount(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="Enter amount" autoFocus
              style={{ width: '100%', height: 44, padding: '0 14px', borderRadius: 10, border: '1px solid var(--border-medium)', background: 'var(--accent-dim)', color: '#e8f0fe', fontSize: 14, outline: 'none', textAlign: 'center', fontFamily: 'Space Grotesk', boxSizing: 'border-box', marginBottom: 12 }} />
            <PayButton label={`Pay ₹${Number(amount || 0).toLocaleString()}`} onPay={() => amount && setStep('processing')} />
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Mobile Recharge ───────────────────────────────────────────────────────

const RECHARGE_PLANS = [
  { price: 149, data: '1 GB/day', validity: '28 days', calls: 'Unlimited', highlight: false },
  { price: 299, data: '2 GB/day', validity: '28 days', calls: 'Unlimited', highlight: true },
  { price: 599, data: '3 GB/day', validity: '84 days', calls: 'Unlimited', highlight: false },
  { price: 999, data: '2 GB/day', validity: '365 days', calls: 'Unlimited', highlight: false },
]

const OPERATORS = ['Jio', 'Airtel', 'Vi', 'BSNL']

export function MobileRechargeScreen({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState<'form' | 'plans' | 'processing' | 'success'>('form')
  const [number, setNumber] = useState('98765 43210')
  const [operator, setOperator] = useState('Jio')
  const [selected, setSelected] = useState(RECHARGE_PLANS[1])

  if (step === 'processing') { setTimeout(() => setStep('success'), 1600); return <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}><ScreenHeader title="Mobile Recharge" onBack={onBack} /><ProcessingScreen /></div> }
  if (step === 'success') return <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}><ScreenHeader title="Mobile Recharge" onBack={onBack} /><SuccessScreen title="Recharge Successful!" amount={`₹${selected.price}`} detail={`${number} · ${operator} · ${selected.data}/day`} onDone={onBack} /></div>

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <ScreenHeader title="Mobile Recharge" subtitle="Prepaid & Postpaid" onBack={onBack} />
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px' }}>
        {step === 'form' && (
          <>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 9, color: '#5b8cc7', fontFamily: 'JetBrains Mono', marginBottom: 6 }}>MOBILE NUMBER</div>
              <input value={number} onChange={e => setNumber(e.target.value)}
                style={{ width: '100%', height: 44, padding: '0 14px', borderRadius: 10, border: '1px solid var(--border-medium)', background: 'var(--accent-dim)', color: '#e8f0fe', fontSize: 14, fontWeight: 600, outline: 'none', fontFamily: 'Space Grotesk', boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 9, color: '#5b8cc7', fontFamily: 'JetBrains Mono', marginBottom: 6 }}>OPERATOR</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {OPERATORS.map(op => (
                  <motion.button key={op} whileTap={{ scale: 0.95 }} onClick={() => setOperator(op)}
                    style={{ flex: 1, padding: '8px', borderRadius: 10, border: `1px solid ${operator === op ? '#8B5CF6' : 'rgba(255,255,255,0.07)'}`, background: operator === op ? 'rgba(139,92,246,0.1)' : 'transparent', color: operator === op ? '#8B5CF6' : 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 600, cursor: 'pointer', fontFamily: 'Space Grotesk' }}>
                    {op}
                  </motion.button>
                ))}
              </div>
            </div>
            <motion.button whileTap={{ scale: 0.97 }} onClick={() => setStep('plans')}
              style={{ width: '100%', height: 44, borderRadius: 12, border: 'none', background: 'rgba(139,92,246,0.15)', border2: '1px solid rgba(139,92,246,0.3)' as any, color: '#8B5CF6', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Space Grotesk' }}>
              Browse Plans →
            </motion.button>
          </>
        )}
        {step === 'plans' && (
          <>
            <div style={{ fontSize: 9, color: '#5b8cc7', fontFamily: 'JetBrains Mono', marginBottom: 10 }}>{operator} PREPAID PLANS</div>
            {RECHARGE_PLANS.map(plan => (
              <motion.div key={plan.price} whileTap={{ scale: 0.98 }} onClick={() => setSelected(plan)}
                style={{ padding: '12px 14px', borderRadius: 12, marginBottom: 8, cursor: 'pointer', border: `1px solid ${selected.price === plan.price ? '#8B5CF6' : plan.highlight ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.06)'}`, background: selected.price === plan.price ? 'rgba(139,92,246,0.1)' : plan.highlight ? 'rgba(139,92,246,0.04)' : 'rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                    <span style={{ fontSize: 16, fontWeight: 900, color: '#e8f0fe', fontFamily: 'Space Grotesk' }}>₹{plan.price}</span>
                    {plan.highlight && <span style={{ fontSize: 7, background: '#8B5CF6', color: '#e8f0fe', padding: '1px 6px', borderRadius: 4, fontFamily: 'JetBrains Mono', fontWeight: 700 }}>POPULAR</span>}
                  </div>
                  <div style={{ fontSize: 9, color: '#5b8cc7', fontFamily: 'JetBrains Mono' }}>{plan.data} · {plan.calls} calls · {plan.validity}</div>
                </div>
                <div style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${selected.price === plan.price ? '#8B5CF6' : 'rgba(255,255,255,0.15)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {selected.price === plan.price && <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#8B5CF6' }} />}
                </div>
              </motion.div>
            ))}
            <div style={{ marginTop: 6 }}>
              <PayButton label={`Recharge ₹${selected.price}`} onPay={() => setStep('processing')} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Electricity Bill ──────────────────────────────────────────────────────

export function ElectricityScreen({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState<'form' | 'bill' | 'processing' | 'success'>('form')
  const [consumer, setConsumer] = useState('KG3847291')
  const [board, setBoard] = useState('UPPCL')
  const billAmount = 1847

  if (step === 'processing') { setTimeout(() => setStep('success'), 1600); return <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}><ScreenHeader title="Electricity Bill" onBack={onBack} /><ProcessingScreen /></div> }
  if (step === 'success') return <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}><ScreenHeader title="Electricity Bill" onBack={onBack} /><SuccessScreen title="Bill Paid!" amount={`₹${billAmount.toLocaleString()}`} detail={`${board} · Consumer ${consumer}`} onDone={onBack} /></div>

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <ScreenHeader title="Electricity Bill" subtitle="Pay state electricity board bills" onBack={onBack} />
      <div style={{ flex: 1, padding: '14px 16px', overflowY: 'auto' }}>
        {step === 'form' && (
          <>
            {['UPPCL','MSEDCL','BESCOM','TNEB','WBSEDCL'].map(b => (
              <motion.div key={b} whileTap={{ scale: 0.98 }} onClick={() => setBoard(b)}
                style={{ padding: '11px 14px', borderRadius: 10, marginBottom: 6, cursor: 'pointer', border: `1px solid ${board === b ? '#F59E0B' : 'rgba(255,255,255,0.06)'}`, background: board === b ? 'rgba(245,158,11,0.08)' : 'rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: board === b ? '#F59E0B' : 'white', fontFamily: 'Space Grotesk' }}>{b}</span>
                {board === b && <Check size={14} color="#F59E0B" />}
              </motion.div>
            ))}
            <div style={{ marginTop: 10, marginBottom: 12 }}>
              <div style={{ fontSize: 9, color: '#5b8cc7', fontFamily: 'JetBrains Mono', marginBottom: 6 }}>CONSUMER NUMBER</div>
              <input value={consumer} onChange={e => setConsumer(e.target.value)}
                style={{ width: '100%', height: 44, padding: '0 14px', borderRadius: 10, border: '1px solid var(--border-medium)', background: 'var(--accent-dim)', color: '#e8f0fe', fontSize: 14, fontWeight: 600, outline: 'none', fontFamily: 'Space Grotesk', boxSizing: 'border-box' }} />
            </div>
            <motion.button whileTap={{ scale: 0.97 }} onClick={() => setStep('bill')}
              style={{ width: '100%', height: 44, borderRadius: 12, border: '1px solid rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.08)', color: '#F59E0B', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Space Grotesk' }}>
              Fetch Bill →
            </motion.button>
          </>
        )}
        {step === 'bill' && (
          <>
            <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: 14, padding: '16px', marginBottom: 14 }}>
              {[['Board', board], ['Consumer No.', consumer], ['Bill Month', 'June 2026'], ['Units Consumed', '412 kWh'], ['Due Date', '25 Jul 2026'], ['Bill Amount', `₹${billAmount.toLocaleString()}`]].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-light)' }}>
                  <span style={{ fontSize: 9, color: '#5b8cc7', fontFamily: 'JetBrains Mono' }}>{k}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: k === 'Bill Amount' ? '#F59E0B' : 'white', fontFamily: 'Space Grotesk' }}>{v}</span>
                </div>
              ))}
            </div>
            <PayButton label={`Pay ₹${billAmount.toLocaleString()}`} onPay={() => setStep('processing')} />
          </>
        )}
      </div>
    </div>
  )
}

// ─── FASTag ────────────────────────────────────────────────────────────────

export function FASTagScreen({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState<'form' | 'processing' | 'success'>('form')
  const [vehicle, setVehicle] = useState('UP32 AB 1234')
  const [amount, setAmount] = useState('500')

  if (step === 'processing') { setTimeout(() => setStep('success'), 1600); return <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}><ScreenHeader title="FASTag Recharge" onBack={onBack} /><ProcessingScreen /></div> }
  if (step === 'success') return <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}><ScreenHeader title="FASTag Recharge" onBack={onBack} /><SuccessScreen title="FASTag Recharged!" amount={`₹${Number(amount).toLocaleString()}`} detail={`Vehicle: ${vehicle}`} onDone={onBack} /></div>

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <ScreenHeader title="FASTag Recharge" subtitle="NHAI · National Highways" onBack={onBack} />
      <div style={{ flex: 1, padding: '14px 16px' }}>
        {/* Vehicle card */}
        <div style={{ background: 'linear-gradient(135deg,#1a2a3a,#0d2035)', borderRadius: 14, padding: '16px', marginBottom: 14, border: '1px solid rgba(249,115,22,0.15)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: 'rgba(249,115,22,0.06)' }} />
          <div style={{ fontSize: 9, color: '#5b8cc7', fontFamily: 'JetBrains Mono', marginBottom: 4 }}>VEHICLE NUMBER</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#e8f0fe', fontFamily: 'Space Grotesk', letterSpacing: 2 }}>{vehicle}</div>
          <div style={{ fontSize: 8, color: '#5b8cc7', fontFamily: 'JetBrains Mono', marginTop: 4 }}>Current Balance: ₹120 · NHAI FASTag</div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 9, color: '#5b8cc7', fontFamily: 'JetBrains Mono', marginBottom: 6 }}>VEHICLE NUMBER</div>
          <input value={vehicle} onChange={e => setVehicle(e.target.value)}
            style={{ width: '100%', height: 44, padding: '0 14px', borderRadius: 10, border: '1px solid var(--border-medium)', background: 'var(--accent-dim)', color: '#e8f0fe', fontSize: 13, fontWeight: 600, outline: 'none', fontFamily: 'Space Grotesk', boxSizing: 'border-box', textTransform: 'uppercase' }} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 9, color: '#5b8cc7', fontFamily: 'JetBrains Mono', marginBottom: 6 }}>RECHARGE AMOUNT</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            {['200','500','1000','2000'].map(a => (
              <motion.button key={a} whileTap={{ scale: 0.95 }} onClick={() => setAmount(a)}
                style={{ flex: 1, padding: '8px', borderRadius: 10, border: `1px solid ${amount === a ? '#F97316' : 'rgba(255,255,255,0.07)'}`, background: amount === a ? 'rgba(249,115,22,0.1)' : 'transparent', color: amount === a ? '#F97316' : 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'Space Grotesk' }}>
                ₹{a}
              </motion.button>
            ))}
          </div>
        </div>
        <PayButton label={`Recharge ₹${Number(amount).toLocaleString()}`} onPay={() => setStep('processing')} />
      </div>
    </div>
  )
}

// ─── Insurance ─────────────────────────────────────────────────────────────

const INSURANCE_PLANS = [
  { name: 'Health Shield Basic', premium: 499, cover: '₹3L', type: 'Health', provider: 'Star Health' },
  { name: 'Motor Comprehensive', premium: 1299, cover: '₹5L', type: 'Motor', provider: 'HDFC Ergo' },
  { name: 'Life Secure Term', premium: 999, cover: '₹50L', type: 'Life', provider: 'LIC India' },
  { name: 'Travel Guard', premium: 299, cover: '₹10L', type: 'Travel', provider: 'Bajaj Allianz' },
]

export function InsuranceScreen({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState<'plans' | 'processing' | 'success'>('plans')
  const [selected, setSelected] = useState(INSURANCE_PLANS[0])

  if (step === 'processing') { setTimeout(() => setStep('success'), 1600); return <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}><ScreenHeader title="Insurance" onBack={onBack} /><ProcessingScreen /></div> }
  if (step === 'success') return <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}><ScreenHeader title="Insurance" onBack={onBack} /><SuccessScreen title="Policy Activated!" amount={`₹${selected.premium}/mo`} detail={`${selected.name} · Cover: ${selected.cover}`} onDone={onBack} /></div>

  const typeColors: Record<string, string> = { Health: '#10B981', Motor: '#F97316', Life: '#EC4899', Travel: '#3B82F6' }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <ScreenHeader title="Insurance" subtitle="Health · Life · Motor · Travel" onBack={onBack} />
      <div style={{ flex: 1, padding: '14px 16px', overflowY: 'auto' }}>
        <div style={{ fontSize: 9, color: '#5b8cc7', fontFamily: 'JetBrains Mono', marginBottom: 10 }}>RECOMMENDED PLANS</div>
        {INSURANCE_PLANS.map(plan => {
          const c = typeColors[plan.type] || '#EC4899'
          const active = selected.name === plan.name
          return (
            <motion.div key={plan.name} whileTap={{ scale: 0.98 }} onClick={() => setSelected(plan)}
              style={{ padding: '12px 14px', borderRadius: 12, marginBottom: 8, cursor: 'pointer', border: `1px solid ${active ? c : 'rgba(255,255,255,0.06)'}`, background: active ? `${c}08` : 'rgba(255,255,255,0.02)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                    <span style={{ fontSize: 7, background: `${c}20`, color: c, padding: '2px 7px', borderRadius: 4, fontFamily: 'JetBrains Mono', fontWeight: 700 }}>{plan.type.toUpperCase()}</span>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#e8f0fe', fontFamily: 'Space Grotesk' }}>{plan.name}</div>
                  <div style={{ fontSize: 8, color: '#5b8cc7', fontFamily: 'JetBrains Mono', marginTop: 2 }}>{plan.provider} · Cover: {plan.cover}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: active ? c : 'white', fontFamily: 'Space Grotesk' }}>₹{plan.premium}</div>
                  <div style={{ fontSize: 7, color: '#5b8cc7', fontFamily: 'JetBrains Mono' }}>/month</div>
                </div>
              </div>
            </motion.div>
          )
        })}
        <div style={{ marginTop: 6 }}>
          <PayButton label={`Buy ₹${selected.premium}/mo · ${selected.name}`} onPay={() => setStep('processing')} />
        </div>
      </div>
    </div>
  )
}

// ─── Credit Card Bill ──────────────────────────────────────────────────────

const CC_CARDS = [
  { name: 'HDFC Regalia', number: '•••• 4821', due: 8450, dueDate: '20 Jul', limit: 150000, used: 42000 },
  { name: 'SBI SimplyCLICK', number: '•••• 7734', due: 2130, dueDate: '25 Jul', limit: 80000, used: 15000 },
]

export function CreditCardScreen({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState<'list' | 'detail' | 'processing' | 'success'>('list')
  const [selected, setSelected] = useState(CC_CARDS[0])
  const [payType, setPayType] = useState<'full' | 'min' | 'custom'>('full')
  const [custom, setCustom] = useState('')

  const payAmount = payType === 'full' ? selected.due : payType === 'min' ? Math.round(selected.due * 0.1) : Number(custom || 0)

  if (step === 'processing') { setTimeout(() => setStep('success'), 1600); return <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}><ScreenHeader title="Credit Card Bill" onBack={onBack} /><ProcessingScreen /></div> }
  if (step === 'success') return <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}><ScreenHeader title="Credit Card Bill" onBack={onBack} /><SuccessScreen title="Bill Paid!" amount={`₹${payAmount.toLocaleString()}`} detail={`${selected.name} ${selected.number}`} onDone={onBack} /></div>

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <ScreenHeader title="Credit Card Bill" subtitle="Pay outstanding dues" onBack={onBack} />
      <div style={{ flex: 1, padding: '14px 16px', overflowY: 'auto' }}>
        {step === 'list' && (
          <>
            {CC_CARDS.map(card => (
              <motion.div key={card.number} whileTap={{ scale: 0.98 }} onClick={() => { setSelected(card); setStep('detail') }}
                style={{ background: 'linear-gradient(135deg,#1a2540,#0e1a30)', borderRadius: 14, padding: '16px', marginBottom: 10, border: '1px solid rgba(99,102,241,0.2)', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: -20, right: -20, width: 90, height: 90, borderRadius: '50%', background: 'rgba(99,102,241,0.08)' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#e8f0fe', fontFamily: 'Space Grotesk' }}>{card.name}</div>
                    <div style={{ fontSize: 8, color: '#5b8cc7', fontFamily: 'JetBrains Mono', marginTop: 2 }}>{card.number}</div>
                  </div>
                  <CreditCard size={22} color="rgba(99,102,241,0.6)" />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div><div style={{ fontSize: 8, color: '#5b8cc7', fontFamily: 'JetBrains Mono' }}>AMOUNT DUE</div><div style={{ fontSize: 18, fontWeight: 800, color: '#EF4444', fontFamily: 'Space Grotesk' }}>₹{card.due.toLocaleString()}</div></div>
                  <div style={{ textAlign: 'right' }}><div style={{ fontSize: 8, color: '#5b8cc7', fontFamily: 'JetBrains Mono' }}>DUE DATE</div><div style={{ fontSize: 13, fontWeight: 700, color: '#F59E0B', fontFamily: 'Space Grotesk' }}>{card.dueDate}</div></div>
                </div>
                <div style={{ marginTop: 10, height: 4, background: 'var(--accent-dim)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(card.used / card.limit) * 100}%`, background: '#6366F1', borderRadius: 99 }} />
                </div>
                <div style={{ fontSize: 7, color: '#5b8cc7', fontFamily: 'JetBrains Mono', marginTop: 3 }}>₹{card.used.toLocaleString()} of ₹{card.limit.toLocaleString()} used</div>
              </motion.div>
            ))}
          </>
        )}
        {step === 'detail' && (
          <>
            <div style={{ background: 'rgba(99,102,241,0.08)', borderRadius: 12, padding: '14px', border: '1px solid rgba(99,102,241,0.15)', marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#e8f0fe', fontFamily: 'Space Grotesk' }}>{selected.name}</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#EF4444', fontFamily: 'Space Grotesk', margin: '6px 0' }}>₹{selected.due.toLocaleString()}</div>
              <div style={{ fontSize: 8, color: '#5b8cc7', fontFamily: 'JetBrains Mono' }}>Due by {selected.dueDate}</div>
            </div>
            <div style={{ fontSize: 9, color: '#5b8cc7', fontFamily: 'JetBrains Mono', marginBottom: 8 }}>PAYMENT OPTION</div>
            {[
              { key: 'full', label: 'Full Payment', value: `₹${selected.due.toLocaleString()}` },
              { key: 'min', label: 'Minimum Due', value: `₹${Math.round(selected.due * 0.1).toLocaleString()}` },
              { key: 'custom', label: 'Custom Amount', value: '' },
            ].map(opt => (
              <motion.div key={opt.key} whileTap={{ scale: 0.98 }} onClick={() => setPayType(opt.key as any)}
                style={{ padding: '10px 12px', borderRadius: 10, marginBottom: 6, cursor: 'pointer', border: `1px solid ${payType === opt.key ? '#6366F1' : 'rgba(255,255,255,0.06)'}`, background: payType === opt.key ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: payType === opt.key ? '#6366F1' : 'rgba(255,255,255,0.7)', fontFamily: 'Space Grotesk' }}>{opt.label}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: payType === opt.key ? '#6366F1' : 'rgba(255,255,255,0.5)', fontFamily: 'Space Grotesk' }}>{opt.value}</span>
              </motion.div>
            ))}
            {payType === 'custom' && (
              <input value={custom} onChange={e => setCustom(e.target.value.replace(/[^0-9]/g, ''))} placeholder="Enter amount"
                style={{ width: '100%', height: 44, padding: '0 14px', borderRadius: 10, border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.06)', color: '#e8f0fe', fontSize: 14, outline: 'none', fontFamily: 'Space Grotesk', boxSizing: 'border-box', marginBottom: 10 }} autoFocus />
            )}
            <div style={{ marginTop: 8 }}>
              <PayButton label={`Pay ₹${payAmount.toLocaleString()}`} onPay={() => payAmount > 0 && setStep('processing')} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Transaction History ───────────────────────────────────────────────────

import { TRANSACTIONS } from './bankData'

const ALL_TX = [
  ...TRANSACTIONS,
  { id: 't9',  name: 'Amazon',        upi: 'amazon@apl',      amount: -1299, type: 'UPI',      time: '2:10 PM', date: 'Sat, 19 Jul', icon: 'shop',    category: 'shopping' },
  { id: 't10', name: 'Uber',          upi: 'uber@axisbank',   amount: -245,  type: 'UPI',      time: '9:45 AM', date: 'Fri, 18 Jul', icon: 'car',     category: 'transport' },
  { id: 't11', name: 'ATM Withdrawal',upi: 'CBI ATM',         amount: -5000, type: 'ATM',      time: '6:30 PM', date: 'Thu, 17 Jul', icon: 'atm',     category: 'cash' },
  { id: 't12', name: 'GPay Reward',   upi: 'System',          amount: 30,    type: 'Cashback', time: '11:00 AM',date: 'Wed, 16 Jul', icon: 'reward',  category: 'rewards' },
]

const CAT_ICONS: Record<string, string> = {
  transfer:'👤', shopping:'🛍️', income:'💼', entertainment:'🎬',
  utilities:'⚡', rewards:'🎁', food:'🍔', shop:'🛒', car:'🚗',
  transport:'🚕', cash:'💵', atm:'🏧',
}

export function TransactionHistoryScreen({ onBack }: { onBack: () => void }) {
  const [filter, setFilter] = useState('All')
  const filters = ['All', 'UPI', 'NEFT', 'Bill Pay', 'Cashback']

  const shown = filter === 'All' ? ALL_TX : ALL_TX.filter(t => t.type === filter)
  const totalIn = shown.filter(t => t.amount > 0).reduce((a, t) => a + t.amount, 0)
  const totalOut = shown.filter(t => t.amount < 0).reduce((a, t) => a + Math.abs(t.amount), 0)

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <ScreenHeader title="Transaction History" subtitle="Last 30 days" onBack={onBack} />

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '10px 16px 8px' }}>
        {[{ label: 'Money In', value: totalIn, color: '#10B981' }, { label: 'Money Out', value: totalOut, color: '#EF4444' }].map(s => (
          <div key={s.label} style={{ padding: '10px 12px', borderRadius: 10, background: `${s.color}08`, border: `1px solid ${s.color}20` }}>
            <div style={{ fontSize: 8, color: '#5b8cc7', fontFamily: 'JetBrains Mono' }}>{s.label}</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: s.color, fontFamily: 'Space Grotesk', marginTop: 2 }}>₹{s.value.toLocaleString()}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 6, padding: '0 16px 8px', overflowX: 'auto' }}>
        {filters.map(f => (
          <motion.button key={f} whileTap={{ scale: 0.95 }} onClick={() => setFilter(f)}
            style={{ padding: '5px 12px', borderRadius: 20, border: `1px solid ${filter === f ? '#3B82F6' : 'rgba(255,255,255,0.08)'}`, background: filter === f ? 'rgba(59,130,246,0.12)' : 'transparent', color: filter === f ? '#3B82F6' : 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: 600, cursor: 'pointer', fontFamily: 'Space Grotesk', whiteSpace: 'nowrap', flexShrink: 0 }}>
            {f}
          </motion.button>
        ))}
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 16px' }}>
        {shown.map((tx, i) => (
          <motion.div key={tx.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 10, marginBottom: 4, background: 'var(--accent-dim)', border: '1px solid var(--border-light)' }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, fontSize: 17, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--accent-dim)', flexShrink: 0 }}>
              {CAT_ICONS[tx.category] || '💳'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#e8f0fe', fontFamily: 'Space Grotesk', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tx.name}</div>
              <div style={{ fontSize: 8, color: '#5b8cc7', fontFamily: 'JetBrains Mono' }}>{tx.type} · {tx.time} · {tx.date}</div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: tx.amount > 0 ? '#10B981' : 'white', fontFamily: 'Space Grotesk' }}>{tx.amount > 0 ? '+' : ''}₹{Math.abs(tx.amount).toLocaleString()}</div>
              <div style={{ fontSize: 7, padding: '1px 6px', borderRadius: 4, background: 'var(--accent-dim)', color: '#5b8cc7', fontFamily: 'JetBrains Mono', display: 'inline-block', marginTop: 2 }}>{tx.type}</div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

// ─── Profile Screen ────────────────────────────────────────────────────────

import { ACCOUNT } from './bankData'

export function ProfileScreen({ onBack, trustScore }: { onBack: () => void; trustScore: number }) {
  const [tab, setTab] = useState<'account' | 'security' | 'upi'>('account')
  const trustColor = trustScore > 85 ? '#10B981' : trustScore > 60 ? '#F59E0B' : '#EF4444'

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <ScreenHeader title="My Profile" onBack={onBack} />
      {/* Avatar */}
      <div style={{ padding: '16px 16px 0', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--border-light)', paddingBottom: 14 }}>
        <div style={{ width: 52, height: 52, borderRadius: 16, background: 'linear-gradient(135deg,#3B82F6,#8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, color: '#e8f0fe', fontFamily: 'Space Grotesk', flexShrink: 0 }}>KG</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#e8f0fe', fontFamily: 'Space Grotesk' }}>{ACCOUNT.name}</div>
          <div style={{ fontSize: 8, color: '#5b8cc7', fontFamily: 'JetBrains Mono', marginTop: 2 }}>{ACCOUNT.accountNumber} · {ACCOUNT.branch}</div>
        </div>
        <div style={{ padding: '4px 8px', borderRadius: 20, background: `${trustColor}12`, border: `1px solid ${trustColor}30`, display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: trustColor }} />
          <span style={{ fontSize: 8, color: trustColor, fontFamily: 'JetBrains Mono', fontWeight: 700 }}>{trustScore.toFixed(0)}%</span>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-light)' }}>
        {(['account', 'security', 'upi'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ flex: 1, padding: '9px', border: 'none', background: 'transparent', color: tab === t ? '#3B82F6' : 'rgba(255,255,255,0.3)', fontSize: 9, fontWeight: tab === t ? 700 : 400, cursor: 'pointer', fontFamily: 'Space Grotesk', borderBottom: tab === t ? '2px solid #3B82F6' : '2px solid transparent', textTransform: 'capitalize' }}>
            {t === 'upi' ? 'UPI' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
        {tab === 'account' && (
          <>
            {[['Full Name', ACCOUNT.name], ['Account No.', '3847 2910 4521'], ['IFSC Code', ACCOUNT.ifsc], ['Branch', ACCOUNT.branch], ['Account Type', ACCOUNT.type], ['Bank', ACCOUNT.bank]].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-light)' }}>
                <span style={{ fontSize: 10, color: '#5b8cc7', fontFamily: 'JetBrains Mono' }}>{k}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#e8f0fe', fontFamily: 'Space Grotesk' }}>{v}</span>
              </div>
            ))}
          </>
        )}
        {tab === 'security' && (
          <>
            <div style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', marginBottom: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#10B981', fontFamily: 'Space Grotesk', marginBottom: 4 }}>AEGIS-X Active</div>
              <div style={{ fontSize: 9, color: '#5b8cc7', fontFamily: 'JetBrains Mono' }}>Behavioral monitoring enabled · T(t) = {trustScore.toFixed(0)}%</div>
            </div>
            {['Change UPI PIN', 'Change Login Password', 'Biometric Login', 'Two-Factor Auth', 'Manage Devices', 'Login History'].map(item => (
              <div key={item} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 0', borderBottom: '1px solid var(--border-light)', cursor: 'pointer' }}>
                <span style={{ fontSize: 11, color: '#93b4e4', fontFamily: 'Space Grotesk' }}>{item}</span>
                <span style={{ fontSize: 14, color: '#5b8cc7' }}>›</span>
              </div>
            ))}
            {/* Reset onboarding button — for demo purposes */}
            <button onClick={() => {
              const u = localStorage.getItem('aegisx_username') || 'default'
              localStorage.removeItem(`aegisx_onboarding_done_${u}`)
              localStorage.removeItem(`aegisx_mpin_${u}`)
              localStorage.removeItem('aegisx_onboarding_done')
              localStorage.removeItem('aegisx_mpin')
              alert('Onboarding reset! Refresh the page to re-enroll.')
              window.location.reload()
            }} style={{ marginTop: 16, width: '100%', padding: '10px', borderRadius: 10, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.06)', color: '#F87171', fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: 'Space Grotesk' }}>
              🔄 Reset Onboarding & MPIN (Demo)
            </button>
          </>
        )}
        {tab === 'upi' && (
          <>
            <div style={{ fontSize: 9, color: '#5b8cc7', fontFamily: 'JetBrains Mono', marginBottom: 8 }}>LINKED UPI IDs</div>
            {['karan@cbi', 'kgupta@okicici', 'karan.gupta@ybl'].map((id, i) => (
              <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, marginBottom: 6, background: 'var(--accent-dim)', border: `1px solid ${i === 0 ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.05)'}` }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: i === 0 ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>@</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#e8f0fe', fontFamily: 'Space Grotesk' }}>{id}</div>
                  {i === 0 && <div style={{ fontSize: 7, color: '#10B981', fontFamily: 'JetBrains Mono', marginTop: 1 }}>PRIMARY</div>}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
