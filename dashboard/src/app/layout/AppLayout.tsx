import React, { useState } from 'react'
import { Outlet } from 'react-router'
import Sidebar from './Sidebar'

const AppLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-page)', overflow: 'hidden' }}>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(p => !p)} />
      <main style={{ flex: 1, overflow: 'auto', padding: '24px 32px', minWidth: 0 }}>
        <Outlet />
      </main>
    </div>
  )
}

export default AppLayout
