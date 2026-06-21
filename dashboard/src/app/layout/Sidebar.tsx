import React from 'react'
import { NavLink, useLocation } from 'react-router'
import { motion, AnimatePresence } from 'motion/react'
import {
  Activity, Radio, TrendingDown, Brain, FileWarning, RotateCcw,
  PanelLeftClose, PanelLeftOpen, Shield,
} from 'lucide-react'

const navItems = [
  { icon: <Radio size={18} />, label: 'Live Monitor', path: '/app/monitor', desc: 'Real-time trust' },
  { icon: <TrendingDown size={18} />, label: 'Trust Timeline', path: '/app/timeline', desc: 'Score history' },
  { icon: <Brain size={18} />, label: 'Cognitive Analysis', path: '/app/cognitive', desc: 'State machine' },
  { icon: <FileWarning size={18} />, label: 'Incident Explorer', path: '/app/incident', desc: 'Root causes' },
  { icon: <RotateCcw size={18} />, label: 'Session Replay', path: '/app/replay', desc: 'Attack timeline' },
]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle }) => {
  const location = useLocation()

  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 240 }}
      transition={{ type: 'spring', stiffness: 350, damping: 35 }}
      style={{
        flexShrink: 0,
        background: 'var(--bg-panel)',
        borderRight: '1px solid var(--border-light)',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: 'sticky',
        top: 0,
        overflow: 'hidden',
      }}
    >
      <div style={{
        padding: collapsed ? '16px 8px' : '20px 16px',
        borderBottom: '1px solid var(--border-light)',
        display: 'flex',
        alignItems: collapsed ? 'center' : 'flex-start',
        justifyContent: collapsed ? 'center' : 'space-between',
        minHeight: '72px',
        flexDirection: collapsed ? 'column' : 'row',
        gap: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'linear-gradient(135deg, #10b981, #059669)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 16px rgba(16,185,129,0.3)',
          }}>
            <Shield size={16} color="white" />
          </div>
          {!collapsed && (
            <div>
              <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-main)', fontFamily: 'Space Grotesk' }}>AEGIS-X</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px rgba(16,185,129,0.6)' }} />
                <span style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>ENGINE ACTIVE</span>
              </div>
            </div>
          )}
        </div>
        <button onClick={onToggle} style={{
          background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)',
          borderRadius: 6, padding: 5, cursor: 'pointer', display: 'flex',
          alignItems: 'center', justifyContent: 'center', color: '#10b981',
        }}>
          {collapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
        </button>
      </div>

      <nav style={{ flex: 1, padding: collapsed ? '12px 8px' : '16px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {!collapsed && (
          <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.12em', padding: '4px 8px 10px', fontFamily: 'JetBrains Mono', textTransform: 'uppercase' }}>
            Monitoring
          </div>
        )}
        {navItems.map(item => {
          const isActive = location.pathname === item.path
          return (
            <NavLink key={item.path} to={item.path} style={{ textDecoration: 'none' }}>
              <motion.div
                whileHover={{ x: collapsed ? 0 : 2 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: collapsed ? 0 : 10,
                  padding: collapsed ? '10px 0' : '10px 12px',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  borderRadius: 8,
                  background: isActive ? 'rgba(16,185,129,0.08)' : 'transparent',
                  border: isActive ? '1px solid rgba(16,185,129,0.2)' : '1px solid transparent',
                  cursor: 'pointer', transition: 'all 0.15s', position: 'relative',
                }}
              >
                {isActive && !collapsed && (
                  <div style={{ position: 'absolute', left: 0, top: '20%', bottom: '20%', width: 2, borderRadius: 1, background: '#10b981', boxShadow: '0 0 8px rgba(16,185,129,0.6)' }} />
                )}
                <div style={{ color: isActive ? '#10b981' : 'var(--text-muted)', display: 'flex', flexShrink: 0 }}>
                  {item.icon}
                </div>
                <AnimatePresence>
                  {!collapsed && (
                    <motion.div
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.15 }}
                      style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 500, color: isActive ? 'var(--text-main)' : 'var(--text-sub)', fontFamily: 'Space Grotesk' }}>{item.label}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', marginTop: 1 }}>{item.desc}</div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </NavLink>
          )
        })}
      </nav>

      <div style={{ padding: '12px', borderTop: '1px solid var(--border-light)' }}>
        {!collapsed && (
          <div style={{
            background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.12)',
            borderRadius: 8, padding: '10px 12px',
          }}>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', marginBottom: 4 }}>SYSTEM STATUS</div>
            <div style={{ fontSize: 11, color: '#10b981', fontFamily: 'JetBrains Mono', fontWeight: 600 }}>All Services Operational</div>
          </div>
        )}
      </div>
    </motion.aside>
  )
}

export default Sidebar
