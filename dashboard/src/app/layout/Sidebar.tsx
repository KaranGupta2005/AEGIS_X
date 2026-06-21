import React from 'react'
import { NavLink, useLocation } from 'react-router'
import { motion, AnimatePresence } from 'motion/react'
import {
  Radio, TrendingDown, Brain, FileWarning, RotateCcw,
  PanelLeftClose, PanelLeftOpen, Shield, LogOut, Settings, HelpCircle,
  ChevronLeft, ChevronRight, Wifi, WifiOff, CreditCard,
} from 'lucide-react'
import { logout, getUsername } from '../../services/auth'
import { useStore } from '../../services/store'

const navItems = [
  { id: 'demo',      label: 'Live Demo',         icon: CreditCard,   color: '#10B981', path: '/app/demo'      },
  { id: 'monitor',   label: 'Live Monitor',      icon: Radio,        color: '#10B981', path: '/app/monitor'   },
  { id: 'timeline',  label: 'Trust Timeline',    icon: TrendingDown, color: '#3B82F6', path: '/app/timeline'  },
  { id: 'cognitive', label: 'Cognitive Analysis', icon: Brain,        color: '#8B5CF6', path: '/app/cognitive' },
  { id: 'incident',  label: 'Incident Explorer', icon: FileWarning,  color: '#F59E0B', path: '/app/incident'  },
  { id: 'replay',    label: 'Session Replay',    icon: RotateCcw,    color: '#EF4444', path: '/app/replay'    },
]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle }) => {
  const location = useLocation()
  const { state } = useStore()
  const W = collapsed ? 68 : 256

  return (
    <motion.aside
      animate={{ width: W }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      style={{
        display: 'flex', flexDirection: 'column', height: '100vh',
        position: 'sticky', top: 0, flexShrink: 0, overflow: 'hidden',
        background: 'var(--bg-elevated)', borderRight: '1px solid var(--border-light)',
        zIndex: 30,
      }}
    >
      {/* Logo + toggle */}
      <div style={{
        padding: collapsed ? '16px 0' : '16px 16px',
        borderBottom: '1px solid var(--border-light)',
        display: 'flex', alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between',
        minHeight: 64,
      }}>
        <AnimatePresence mode="wait">
          {!collapsed ? (
            <motion.div key="logo-full" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.18 }} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                <Shield size={17} style={{ color: '#10B981' }} />
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-main)', margin: 0, lineHeight: 1, fontFamily: 'Space Grotesk, sans-serif' }}>AEGIS-X</p>
                <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: '2px 0 0', fontFamily: 'JetBrains Mono, monospace' }}>Trust Engine</p>
              </div>
            </motion.div>
          ) : (
            <motion.div key="logo-icon" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                <Shield size={17} style={{ color: '#10B981' }} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {!collapsed && (
          <button onClick={onToggle} style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid var(--border-light)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', flexShrink: 0, transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'var(--text-main)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}>
            <ChevronLeft size={14} />
          </button>
        )}
      </div>

      {collapsed && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
          <button onClick={onToggle} style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid var(--border-light)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'var(--text-main)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}>
            <ChevronRight size={14} />
          </button>
        </div>
      )}

      {/* Nav */}
      <nav style={{ flex: 1, padding: collapsed ? '8px 8px' : '10px 10px', overflowY: 'auto', overflowX: 'hidden' }}>
        {!collapsed && (
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'var(--text-muted)', padding: '0 8px', marginBottom: 6, fontFamily: 'JetBrains Mono, monospace' }}>
            Monitoring
          </p>
        )}
        {navItems.map(item => {
          const isActive = location.pathname === item.path
          return (
            <NavLink key={item.id} to={item.path} title={collapsed ? item.label : undefined} style={{ textDecoration: 'none', display: 'block', marginBottom: 2 }}>
              <motion.div
                whileHover={{ x: collapsed ? 0 : 2 }}
                style={{
                  display: 'flex', alignItems: 'center',
                  gap: collapsed ? 0 : 10,
                  padding: collapsed ? '10px 0' : '9px 10px',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  borderRadius: 10,
                  transition: 'all 0.15s',
                  background: isActive ? `${item.color}12` : 'transparent',
                  border: isActive ? `1px solid ${item.color}28` : '1px solid transparent',
                  position: 'relative',
                }}
              >
                {isActive && !collapsed && (
                  <div style={{ position: 'absolute', left: 0, top: '20%', bottom: '20%', width: 3, borderRadius: 99, background: item.color, boxShadow: `0 0 8px ${item.color}` }} />
                )}
                <item.icon size={17} style={{ color: isActive ? item.color : 'var(--text-muted)', flexShrink: 0 }} />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} exit={{ opacity: 0, width: 0 }} transition={{ duration: 0.18 }}
                      style={{ flex: 1, overflow: 'hidden', whiteSpace: 'nowrap', fontSize: 13, fontWeight: 600, color: isActive ? item.color : 'var(--text-sub)' }}>
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
                {isActive && !collapsed && (
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: item.color, boxShadow: `0 0 6px ${item.color}`, flexShrink: 0 }} />
                )}
              </motion.div>
            </NavLink>
          )
        })}
      </nav>

      {/* Status footer */}
      <div style={{ padding: collapsed ? '10px 8px' : '10px 10px', borderTop: '1px solid var(--border-light)' }}>
        {collapsed ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div title={state.isConnected ? 'Pipeline Online' : 'Disconnected'} style={{ width: 8, height: 8, borderRadius: '50%', background: state.isConnected ? '#10B981' : '#EF4444', boxShadow: state.isConnected ? '0 0 6px #10B981' : '0 0 6px #EF4444' }} />
            <button onClick={() => logout()} title="Sign out" style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#EF4444' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)' }}>
              <LogOut size={15} />
            </button>
          </div>
        ) : (
          <>
            <div style={{ borderRadius: 12, padding: '11px 13px', marginBottom: 8, background: 'rgba(16,185,129,0.04)', border: '1px solid rgba(16,185,129,0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: state.isConnected ? '#10B981' : '#EF4444', animation: state.isConnected ? 'pulse 1.5s ease-in-out infinite' : 'none' }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-main)', fontFamily: 'JetBrains Mono, monospace' }}>
                  {state.isConnected ? 'Pipeline Active' : 'Disconnected'}
                </span>
              </div>
              {[
                { label: 'WebSocket', ok: state.isConnected },
                { label: 'Trust Engine', ok: true },
              ].map(({ label, ok }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>{label}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: ok ? '#10B981' : '#EF4444', fontFamily: 'JetBrains Mono, monospace' }}>{ok ? 'Online' : 'Offline'}</span>
                </div>
              ))}
              <div style={{ height: 3, background: 'rgba(255,255,255,0.05)', borderRadius: 99, overflow: 'hidden', marginTop: 5 }}>
                <div style={{ height: '100%', borderRadius: 99, transition: 'width 0.5s', width: state.isConnected ? '92%' : '0%', background: 'linear-gradient(to right, #10B981, #34D399)' }} />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 4px' }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-sub)' }}>{getUsername() || 'Analyst'}</div>
                <div style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>SOC Operator</div>
              </div>
              <button onClick={() => logout()} title="Sign out" style={{ width: 30, height: 30, borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', transition: 'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; e.currentTarget.style.color = '#EF4444' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}>
                <LogOut size={14} />
              </button>
            </div>
          </>
        )}
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
    </motion.aside>
  )
}

export default Sidebar
