import React, { useState, useEffect } from 'react'
import { Outlet, Navigate } from 'react-router'
import Sidebar from './Sidebar'
import { StoreProvider } from '../../services/StoreProvider'
import { isAuthenticated } from '../../services/auth'

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: string }> {
  state = { hasError: false, error: '' }
  static getDerivedStateFromError(error: Error) { return { hasError: true, error: error.message } }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#EF4444', marginBottom: 8, fontFamily: 'Space Grotesk' }}>Something went wrong</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', marginBottom: 16 }}>{this.state.error}</div>
          <button onClick={() => { this.setState({ hasError: false }); window.location.reload() }}
            style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#3B82F6', color: 'var(--text-main)', fontSize: 11, cursor: 'pointer' }}>
            Reload
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

const ProtectedLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false)

  // Restore user's saved theme when entering the app
  useEffect(() => {
    const saved = localStorage.getItem('aegisx-theme') || 'light'
    document.documentElement.setAttribute('data-theme', saved)
  }, [])

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />
  }

  return (
    <StoreProvider>
      <div style={{ display: 'flex', height: '100dvh', background: 'var(--bg-page)', overflow: 'hidden' }}>
        {/* Desktop sidebar (hidden on mobile via CSS) */}
        <div className="desktop-sidebar">
          <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(p => !p)} />
        </div>
        <main className="scroll-container" style={{
          flex: 1, overflow: 'auto', padding: '28px 36px', minWidth: 0,
          background: 'var(--bg-page)', position: 'relative',
        }}>
          <div style={{ position: 'relative', zIndex: 1, maxWidth: 1400 }} className="page-transition">
            <ErrorBoundary>
              <Outlet />
            </ErrorBoundary>
          </div>
        </main>
      </div>
    </StoreProvider>
  )
}

export default ProtectedLayout
