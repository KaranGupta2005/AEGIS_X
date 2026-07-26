/**
 * AegisFlowGraph — Interactive React Flow graph showing the AEGIS-X
 * identity lifecycle: Enrollment → Monitoring → Transaction → Verification.
 *
 * Nodes highlight in real-time based on the current SDK state and session phase.
 */

import React, { useMemo, useCallback } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  Position,
  Handle,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { motion } from 'motion/react'
import { Shield, Camera, Mic, Lock, Users, Activity, Brain, AlertTriangle, CheckCircle, Eye } from 'lucide-react'
import { SDKState } from '../../services/sdk/AegisBehavioralSDK'

// ─── CUSTOM NODE ─────────────────────────────────────────────────────────────

interface FlowNodeData {
  label: string
  icon: any
  color: string
  description: string
  isActive?: boolean
  isCompleted?: boolean
}

function AegisNode({ data }: { data: FlowNodeData }) {
  const Icon = data.icon
  const active = data.isActive
  const completed = data.isCompleted

  return (
    <div style={{
      background: active ? `${data.color}18` : completed ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.03)',
      border: `1.5px solid ${active ? data.color : completed ? '#10B98150' : 'rgba(255,255,255,0.08)'}`,
      borderRadius: 12,
      padding: '10px 14px',
      minWidth: 140,
      textAlign: 'center',
      position: 'relative',
      boxShadow: active ? `0 0 20px ${data.color}20` : 'none',
      transition: 'all 0.3s ease',
    }}>
      <Handle type="target" position={Position.Top} style={{ background: data.color, width: 6, height: 6, border: 'none' }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: active ? `${data.color}25` : 'rgba(255,255,255,0.05)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: `1px solid ${active ? `${data.color}40` : 'rgba(255,255,255,0.08)'}`,
        }}>
          {completed ? <CheckCircle size={14} color="#10B981" /> : <Icon size={14} color={active ? data.color : 'rgba(255,255,255,0.4)'} />}
        </div>
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: active ? data.color : completed ? '#10B981' : 'rgba(255,255,255,0.7)', fontFamily: 'Space Grotesk' }}>
            {data.label}
          </div>
          <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.35)', fontFamily: 'JetBrains Mono' }}>
            {data.description}
          </div>
        </div>
      </div>

      {active && (
        <motion.div
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
          style={{ position: 'absolute', top: -3, right: -3, width: 8, height: 8, borderRadius: '50%', background: data.color }}
        />
      )}

      <Handle type="source" position={Position.Bottom} style={{ background: data.color, width: 6, height: 6, border: 'none' }} />
    </div>
  )
}

const nodeTypes = { aegisNode: AegisNode }

// ─── GRAPH DEFINITION ────────────────────────────────────────────────────────

interface AegisFlowGraphProps {
  sdkState: SDKState
  currentScreen: string
  eventCount: number
  trustScore: number
  decision: string
}

export const AegisFlowGraph: React.FC<AegisFlowGraphProps> = ({
  sdkState, currentScreen, eventCount, trustScore, decision,
}) => {
  // Determine which nodes are active/completed based on current state
  const isOnboarding = currentScreen === 'onboarding' || currentScreen === 'launch'
  const isObserving = sdkState === 'OBSERVING' || sdkState === 'LEARNING'
  const isTransaction = sdkState === 'TRANSACTION'
  const isVerifying = sdkState === 'VERIFYING'
  const hasFaceEnrolled = eventCount > 2
  const hasVoiceEnrolled = eventCount > 4
  const hasMPIN = eventCount > 6
  const hasDelegate = eventCount > 8

  const nodes: Node[] = useMemo(() => [
    // Row 1: Enrollment
    { id: 'face_enroll', position: { x: 0, y: 0 }, type: 'aegisNode', data: { label: 'Face Enrollment', icon: Camera, color: '#10B981', description: 'Capture face template', isActive: isOnboarding && !hasFaceEnrolled, isCompleted: hasFaceEnrolled } },
    { id: 'voice_enroll', position: { x: 200, y: 0 }, type: 'aegisNode', data: { label: 'Voice Enrollment', icon: Mic, color: '#8B5CF6', description: 'Record voiceprint', isActive: isOnboarding && hasFaceEnrolled && !hasVoiceEnrolled, isCompleted: hasVoiceEnrolled } },
    { id: 'mpin_setup', position: { x: 400, y: 0 }, type: 'aegisNode', data: { label: 'MPIN Setup', icon: Lock, color: '#F59E0B', description: '6-digit transaction PIN', isActive: isOnboarding && hasVoiceEnrolled && !hasMPIN, isCompleted: hasMPIN } },
    { id: 'delegate', position: { x: 600, y: 0 }, type: 'aegisNode', data: { label: 'Trusted Delegates', icon: Users, color: '#F97316', description: 'Up to 3 delegates', isActive: isOnboarding && hasMPIN && !hasDelegate, isCompleted: hasDelegate } },

    // Row 2: Continuous Monitoring
    { id: 'behavioral', position: { x: 100, y: 130 }, type: 'aegisNode', data: { label: 'Behavioral Monitoring', icon: Activity, color: '#3B82F6', description: 'Continuous 2s windows', isActive: isObserving, isCompleted: false } },
    { id: 'cognitive', position: { x: 350, y: 130 }, type: 'aegisNode', data: { label: 'Cognitive Analysis', icon: Brain, color: '#8B5CF6', description: 'State classification', isActive: isObserving && eventCount > 5, isCompleted: false } },
    { id: 'trust_engine', position: { x: 550, y: 130 }, type: 'aegisNode', data: { label: 'Trust Engine T(t)', icon: Shield, color: '#10B981', description: `Score: ${trustScore.toFixed(0)}%`, isActive: isObserving || isTransaction, isCompleted: false } },

    // Row 3: Transaction + Verification
    { id: 'transaction', position: { x: 50, y: 260 }, type: 'aegisNode', data: { label: 'Transaction', icon: Lock, color: '#F59E0B', description: currentScreen === 'send' ? 'Active payment' : 'Waiting', isActive: isTransaction, isCompleted: decision === 'ALLOW' && currentScreen === 'success' } },
    { id: 'voice_verify', position: { x: 250, y: 260 }, type: 'aegisNode', data: { label: 'Voice Challenge', icon: Mic, color: '#8B5CF6', description: 'Speaker verification', isActive: isVerifying && trustScore < 85 && trustScore >= 50, isCompleted: false } },
    { id: 'face_verify', position: { x: 450, y: 260 }, type: 'aegisNode', data: { label: 'Face Liveness', icon: Camera, color: '#EF4444', description: 'Anti-spoofing check', isActive: isVerifying && trustScore < 50, isCompleted: false } },
    { id: 'decision', position: { x: 650, y: 260 }, type: 'aegisNode', data: { label: decision || 'ALLOW', icon: decision === 'BLOCK' ? AlertTriangle : decision === 'STEP_UP' ? Eye : Shield, color: decision === 'BLOCK' ? '#EF4444' : decision === 'STEP_UP' ? '#F59E0B' : '#10B981', description: `Confidence: ${trustScore.toFixed(0)}%`, isActive: true, isCompleted: decision === 'ALLOW' } },
  ], [sdkState, currentScreen, eventCount, trustScore, decision, isOnboarding, isObserving, isTransaction, isVerifying, hasFaceEnrolled, hasVoiceEnrolled, hasMPIN, hasDelegate])

  const edges: Edge[] = useMemo(() => [
    // Enrollment flow
    { id: 'e-face-voice', source: 'face_enroll', target: 'voice_enroll', animated: isOnboarding },
    { id: 'e-voice-mpin', source: 'voice_enroll', target: 'mpin_setup', animated: isOnboarding },
    { id: 'e-mpin-delegate', source: 'mpin_setup', target: 'delegate', animated: isOnboarding },

    // Enrollment → Monitoring
    { id: 'e-face-behavioral', source: 'face_enroll', target: 'behavioral', animated: isObserving, style: { stroke: '#3B82F6' } },
    { id: 'e-delegate-behavioral', source: 'delegate', target: 'behavioral', animated: isObserving, style: { stroke: '#3B82F6' } },

    // Monitoring chain
    { id: 'e-behavioral-cognitive', source: 'behavioral', target: 'cognitive', animated: isObserving },
    { id: 'e-cognitive-trust', source: 'cognitive', target: 'trust_engine', animated: isObserving },

    // Trust → Transaction / Verification
    { id: 'e-trust-tx', source: 'trust_engine', target: 'transaction', animated: isTransaction, style: { stroke: '#F59E0B' } },
    { id: 'e-tx-voice', source: 'transaction', target: 'voice_verify', animated: isVerifying, style: { stroke: '#8B5CF6' } },
    { id: 'e-tx-face', source: 'transaction', target: 'face_verify', animated: isVerifying, style: { stroke: '#EF4444' } },
    { id: 'e-voice-decision', source: 'voice_verify', target: 'decision', animated: true },
    { id: 'e-face-decision', source: 'face_verify', target: 'decision', animated: true },
    { id: 'e-trust-decision', source: 'trust_engine', target: 'decision', animated: true, style: { stroke: '#10B981' } },
  ], [isOnboarding, isObserving, isTransaction, isVerifying])

  return (
    <div style={{ width: '100%', height: '100%', background: 'rgba(6,9,16,0.98)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        proOptions={{ hideAttribution: true }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag={false}
        zoomOnScroll={false}
        zoomOnPinch={false}
        zoomOnDoubleClick={false}
        defaultEdgeOptions={{ style: { stroke: 'rgba(255,255,255,0.15)', strokeWidth: 1.5 }, type: 'smoothstep' }}
      >
        <Background color="rgba(255,255,255,0.03)" gap={20} />
      </ReactFlow>
    </div>
  )
}
