import React, { useState, useEffect } from 'react'
import { Outlet, Navigate } from 'react-router'
import Sidebar from './Sidebar'
import { StoreProvider } from '../../services/StoreProvider'
import { isAuthenticated } from '../../services/auth'

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
      <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-page)', overflow: 'hidden' }}>
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(p => !p)} />
        <main style={{
          flex: 1, overflow: 'auto', padding: '28px 36px', minWidth: 0,
          background: 'var(--bg-page)', position: 'relative',
        }}>
          <div style={{ position: 'relative', zIndex: 1, maxWidth: 1400 }}>
            <Outlet />
          </div>
        </main>
      </div>
    </StoreProvider>
  )
}

export default ProtectedLayout
