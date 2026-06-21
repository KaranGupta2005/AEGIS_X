import React from 'react'

const LiveMonitor: React.FC = () => {
  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, fontFamily: 'Space Grotesk', marginBottom: 8 }}>Live Session Monitor</h1>
      <p style={{ color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', fontSize: 12 }}>Real-time trust scoring — updates every 2 seconds</p>
    </div>
  )
}

export default LiveMonitor
