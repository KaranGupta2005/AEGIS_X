import React from 'react'
import { motion } from 'motion/react'
import {
  Bell, ChevronRight, ArrowUpRight, ArrowDownLeft, Eye, EyeOff,
  SendHorizontal, QrCode, Smartphone, Zap, Car, ShieldCheck,
  CreditCard, MoreHorizontal,
} from 'lucide-react'
import { ACCOUNT, TRANSACTIONS } from './bankData'
import { AnimatedNumber } from '../common/AnimatedNumber'

const ACTION_ICONS: Record<string, { Icon: React.ElementType; color: string }> = {
  send:        { Icon: SendHorizontal, color: '#3B82F6' },
  qr:          { Icon: QrCode,         color: '#10B981' },
  mobile:      { Icon: Smartphone,     color: '#8B5CF6' },
  electricity: { Icon: Zap,            color: '#F59E0B' },
  fasttag:     { Icon: Car,            color: '#F97316' },
  insurance:   { Icon: ShieldCheck,    color: '#EC4899' },
  credit:      { Icon: CreditCard,     color: '#6366F1' },
  more:        { Icon: MoreHorizontal, color: '#6B7280' },
}

const TX_CAT_ICONS: Record<string, string> = {
  transfer: '👤', shopping: '🛍️', income: '💼', entertainment: '🎬',
  utilities: '⚡', rewards: '🎁', food: '🍔',
}

interface HomeScreenProps {
  balance: number
  onNavigate: (screen: string) => void
  trustScore: number
}

const QUICK_ACTIONS = [
  { id: 'send',        label: 'Send Money',   action: 'send' },
  { id: 'qr',          label: 'Scan QR',      action: 'qr' },
  { id: 'mobile',      label: 'Mobile',       action: 'mobile' },
  { id: 'electricity', label: 'Electricity',  action: 'electricity' },
  { id: 'fasttag',     label: 'FASTag',       action: 'fasttag' },
  { id: 'insurance',   label: 'Insurance',    action: 'insurance' },
  { id: 'credit',      label: 'Credit Card',  action: 'credit' },
  { id: 'more',        label: 'More',         action: 'more' },
]

export const HomeScreen: React.FC<HomeScreenProps> = ({ balance, onNavigate, trustScore }) => {
  const [balanceVisible, setBalanceVisible] = React.useState(true)
  const trustColor = trustScore > 85 ? '#10B981' : trustScore > 60 ? '#F59E0B' : '#EF4444'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 8px' }}>
        <div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontFamily: 'JetBrains Mono' }}>Good morning,</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'white', fontFamily: 'Space Grotesk' }}>
            {ACCOUNT.name.split(' ')[0]} 👋
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <motion.div animate={{ borderColor: `${trustColor}40` }}
            style={{ padding: '4px 9px', borderRadius: 20, border: '1px solid', background: `${trustColor}08`, display: 'flex', alignItems: 'center', gap: 4 }}>
            <motion.div animate={{ scale: [1, 1.4, 1], opacity: [1, 0.4, 1] }} transition={{ duration: 2, repeat: Infinity }}
              style={{ width: 5, height: 5, borderRadius: '50%', background: trustColor }} />
            <span style={{ fontSize: 8, fontWeight: 700, color: trustColor, fontFamily: 'JetBrains Mono' }}>
              {Math.round(trustScore)}%
            </span>
          </motion.div>
          <button style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '6px', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', display: 'flex' }}>
            <Bell size={14} />
          </button>
        </div>
      </div>

      {/* Balance Card */}
      <div style={{ padding: '0 16px 12px' }}>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          style={{ background: 'linear-gradient(135deg,#0f1e35 0%,#1a3a5c 50%,#0d2640 100%)', borderRadius: 20, padding: '20px', position: 'relative', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(59,130,246,0.07)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: -20, right: 40, width: 80, height: 80, borderRadius: '50%', background: 'rgba(16,185,129,0.05)', pointerEvents: 'none' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', fontFamily: 'JetBrains Mono', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{ACCOUNT.type}</span>
            <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.2)', fontFamily: 'JetBrains Mono' }}>{ACCOUNT.accountNumber}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '8px 0' }}>
            <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.35)', fontFamily: 'JetBrains Mono' }}>Available Balance</span>
            <button onClick={() => setBalanceVisible(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.25)', padding: 0, display: 'flex' }}>
              {balanceVisible ? <EyeOff size={11} /> : <Eye size={11} />}
            </button>
          </div>
          <div style={{ fontSize: 32, fontWeight: 900, color: 'white', fontFamily: 'Space Grotesk', letterSpacing: '-0.5px', marginBottom: 14 }}>
            {balanceVisible ? <>₹<AnimatedNumber value={balance} decimals={0} style={{ fontFamily: 'Space Grotesk' }} /></> : '₹ ••••••'}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <motion.button whileTap={{ scale: 0.97 }} onClick={() => onNavigate('send')}
              style={{ flex: 1, padding: '9px', borderRadius: 12, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, fontFamily: 'Space Grotesk' }}>
              <ArrowUpRight size={13} color="#3B82F6" /> Send
            </motion.button>
            <motion.button whileTap={{ scale: 0.97 }}
              style={{ flex: 1, padding: '9px', borderRadius: 12, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, fontFamily: 'Space Grotesk' }}>
              <ArrowDownLeft size={13} color="#10B981" /> Request
            </motion.button>
          </div>
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.05)', fontSize: 8, color: 'rgba(255,255,255,0.2)', fontFamily: 'JetBrains Mono' }}>
            {ACCOUNT.bank} · {ACCOUNT.ifsc}
          </div>
        </motion.div>
      </div>

      {/* Quick Actions — 4×2 grid with Lucide icons */}
      <div style={{ padding: '0 16px 12px' }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.35)', fontFamily: 'JetBrains Mono', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Quick Actions</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {QUICK_ACTIONS.map((action, i) => {
            const meta = ACTION_ICONS[action.action]
            const Icon = meta?.Icon
            return (
              <motion.button key={action.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.04 }} whileTap={{ scale: 0.93 }}
                onClick={() => onNavigate(action.action)}
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '12px 4px 10px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7 }}>
                <div style={{ width: 38, height: 38, borderRadius: 12, background: meta ? `${meta.color}18` : 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${meta ? meta.color + '25' : 'transparent'}` }}>
                  {Icon && <Icon size={17} color={meta.color} strokeWidth={1.8} />}
                </div>
                <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.55)', fontFamily: 'Space Grotesk', fontWeight: 500, textAlign: 'center', lineHeight: 1.2 }}>{action.label}</span>
              </motion.button>
            )
          })}
        </div>
      </div>

      {/* Recent Transactions */}
      <div style={{ padding: '0 16px 16px', flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.35)', fontFamily: 'JetBrains Mono', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Recent Transactions</div>
          <button onClick={() => onNavigate('history')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 8, color: '#3B82F6', fontFamily: 'JetBrains Mono', display: 'flex', alignItems: 'center', gap: 2 }}>
            View all <ChevronRight size={10} />
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {TRANSACTIONS.slice(0, 5).map((tx, i) => (
            <motion.div key={tx.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.04)', flexShrink: 0 }}>
                {TX_CAT_ICONS[tx.category] || '💳'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'white', fontFamily: 'Space Grotesk', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tx.name}</div>
                <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', fontFamily: 'JetBrains Mono' }}>{tx.type} · {tx.time}</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: tx.amount > 0 ? '#10B981' : 'white', fontFamily: 'Space Grotesk' }}>
                  {tx.amount > 0 ? '+' : ''}₹{Math.abs(tx.amount).toLocaleString()}
                </div>
                <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.25)', fontFamily: 'JetBrains Mono' }}>{tx.date}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
