/**
 * Identity Flow — Full-page interactive lifecycle graph showing
 * AEGIS-X enrollment, monitoring, and verification architecture.
 */
import React from 'react'
import { useStore } from '../../services/store'
import { AegisFlowGraph } from '../../components/sdk/AegisFlowGraph'
import { Shield } from 'lucide-react'

const IdentityFlow: React.FC = () => {
  const { state } = useStore()
  const { trustScore, decision, sdkState, liveActivity, eventCount } = state

  return (
    <div style={{ height: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column', gap: 12, padding: '0 4px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Shield size={16} color="#3B82F6" />
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-main)', fontFamily: 'Space Grotesk' }}>Identity & Verification Flow</div>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>
            Live AEGIS-X lifecycle · Enrollment → Monitoring → Verification
          </div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ padding: '4px 10px', borderRadius: 6, background: 'var(--accent-dim)', border: '1px solid var(--border-light)' }}>
            <span style={{ fontSize: 8, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>SDK: </span>
            <span style={{ fontSize: 9, fontWeight: 700, color: '#3B82F6', fontFamily: 'JetBrains Mono' }}>{sdkState}</span>
          </div>
          <div style={{ padding: '4px 10px', borderRadius: 6, background: 'var(--accent-dim)', border: '1px solid var(--border-light)' }}>
            <span style={{ fontSize: 8, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>Trust: </span>
            <span style={{ fontSize: 9, fontWeight: 700, color: trustScore > 80 ? '#10B981' : trustScore > 60 ? '#F59E0B' : '#EF4444', fontFamily: 'JetBrains Mono' }}>{trustScore.toFixed(0)}%</span>
          </div>
          <div style={{ padding: '4px 10px', borderRadius: 6, background: 'var(--accent-dim)', border: '1px solid var(--border-light)' }}>
            <span style={{ fontSize: 8, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>Windows: </span>
            <span style={{ fontSize: 9, fontWeight: 700, color: '#8B5CF6', fontFamily: 'JetBrains Mono' }}>{eventCount}</span>
          </div>
        </div>
      </div>

      {/* Flow Graph (fills remaining space) */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <AegisFlowGraph
          sdkState={sdkState}
          currentScreen={liveActivity.currentPage}
          eventCount={eventCount}
          trustScore={trustScore}
          decision={decision}
        />
      </div>
    </div>
  )
}

export default IdentityFlow
