import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { RotateCcw, Circle, AlertTriangle, Shield, Brain, TrendingDown, Ban, Wifi } from 'lucide-react'
import { useStore } from '../../services/store'

const TYPE_COLORS: Record<string, string> = {
  calm: '#10b981', focused: '#3b82f6', distressed: '#f59e0b',
  panicked: '#f97316', coerced: '#ef4444', robotic: '#8b5cf6',
}

const SessionReplay: React.FC = () => {
  const { state } = useStore()
  const { timeline, alerts, isConnected, cognitiveHistory } = state

  const replayEvents = timeline.map((t, i) => {
    let type = 'info'
    let icon = <Circle size={13} />
    let label = `Event #${t.event_number}`

    if (t.decision === 'BLOCK') { type = 'critical'; icon = <Ban size={13} />; label = 'TRANSACTION BLOCKED' }
    else if (t.cognitive_state === 'coerced') { type = 'critical'; icon = <Brain size={13} />; label = 'State: COERCED' }
    else if (t.cognitive_state === 'panicked') { type = 'danger'; icon = <Brain size={13} />; label = 'State: PANICKED' }
    else if (t.drift_detected) { type = 'warning'; icon = <TrendingDown size={13} />; label = 'Drift Detected' }
    else if (t.cognitive_state === 'distressed') { type = 'warning'; icon = <AlertTriangle size={13} />; label = 'State: DISTRESSED' }
    else if (i === 0) { icon = <Shield size={13} />; label = 'Session Started' }

    return { ...t, type, icon, label }
  })

  const currentEvent = replayEvents.length > 0 ? replayEvents[replayEvents.length - 1] : null

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 className="heading" style={{ fontSize: 24, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <RotateCcw size={20} color="#8b5cf6" /> Session Replay
          </h1>
          <p className="mono" style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Wifi size={10} color={isConnected ? '#10b981' : '#ef4444'} />
            Live attack progression from backend pipeline
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24 }}>
        {/* Timeline */}
        <div className="card-base" style={{ padding: 24, maxHeight: '70vh', overflow: 'auto' }}>
          <div className="label-xs" style={{ marginBottom: 16 }}>LIVE SESSION TIMELINE</div>
          <div style={{ position: 'relative', paddingLeft: 24 }}>
            <div style={{ position: 'absolute', left: 7, top: 0, bottom: 0, width: 2, background: 'rgba(255,255,255,0.04)' }} />
            <AnimatePresence>
              {replayEvents.map((event, i) => {
                const color = TYPE_COLORS[event.cognitive_state] || '#3b82f6'
                return (
                  <motion.div key={i} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }} style={{ marginBottom: 14, position: 'relative' }}>
                    <div style={{ position: 'absolute', left: -20, top: 6, width: 11, height: 11, borderRadius: '50%', background: color, border: '2px solid var(--bg-panel)', boxShadow: `0 0 6px ${color}50` }} />
                    <div style={{ background: `${color}08`, border: `1px solid ${color}20`, borderRadius: 9, padding: '10px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <span style={{ color }}>{event.icon}</span>
                          <span className="heading" style={{ fontSize: 12, fontWeight: 600, color }}>{event.label}</span>
                        </div>
                        <span className="mono" style={{ fontSize: 9, color: 'var(--text-muted)' }}>{event.time}</span>
                      </div>
                      <div className="mono" style={{ fontSize: 10, color: 'var(--text-sub)', marginLeft: 20 }}>
                        Trust: {event.trust.toFixed(0)}% • Sim: {event.similarity.toFixed(3)} • Decision: {event.decision}
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
            {replayEvents.length === 0 && (
              <div style={{ padding: 40, textAlign: 'center' }}>
                <p className="mono" style={{ color: 'var(--text-muted)', fontSize: 11 }}>Switch to a scenario on Live Monitor to see the timeline build up in real-time.</p>
              </div>
            )}
          </div>
        </div>

        {/* Side panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="card-base" style={{ padding: 20 }}>
            <div className="label-xs" style={{ marginBottom: 10 }}>CURRENT STATE</div>
            {currentEvent ? (
              <>
                <div className="heading" style={{ fontSize: 32, fontWeight: 700, color: currentEvent.trust > 85 ? '#10b981' : currentEvent.trust > 60 ? '#f59e0b' : '#ef4444' }}>
                  {currentEvent.trust.toFixed(0)}%
                </div>
                <div className="mono" style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>Trust Score</div>
                <div style={{ marginTop: 10, padding: '6px 10px', borderRadius: 6, background: `${TYPE_COLORS[currentEvent.cognitive_state] || '#3b82f6'}12`, border: `1px solid ${TYPE_COLORS[currentEvent.cognitive_state] || '#3b82f6'}25`, display: 'inline-block' }}>
                  <span className="mono" style={{ fontSize: 11, fontWeight: 600, color: TYPE_COLORS[currentEvent.cognitive_state] || '#3b82f6' }}>
                    {currentEvent.cognitive_state.toUpperCase()}
                  </span>
                </div>
              </>
            ) : (
              <div className="mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>Waiting...</div>
            )}
          </div>

          <div className="card-base" style={{ padding: 20 }}>
            <div className="label-xs" style={{ marginBottom: 10 }}>PROGRESS</div>
            <div style={{ height: 5, background: 'rgba(255,255,255,0.04)', borderRadius: 3, overflow: 'hidden' }}>
              <motion.div animate={{ width: `${Math.min(100, (replayEvents.length / 15) * 100)}%` }} style={{ height: '100%', background: 'linear-gradient(to right, #10b981, #ef4444)', borderRadius: 3 }} />
            </div>
            <div className="mono" style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6 }}>
              {replayEvents.length} events captured
            </div>
          </div>

          {alerts.length > 0 && (
            <div className="card-base" style={{ padding: 20 }}>
              <div className="label-xs" style={{ marginBottom: 10 }}>ALERTS ({alerts.length})</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 200, overflow: 'auto' }}>
                {alerts.slice(-5).map((a, i) => (
                  <div key={i} style={{ fontSize: 10, color: a.severity === 'CRITICAL' ? '#ef4444' : '#f59e0b', background: `${a.severity === 'CRITICAL' ? '#ef4444' : '#f59e0b'}08`, border: `1px solid ${a.severity === 'CRITICAL' ? '#ef4444' : '#f59e0b'}15`, borderRadius: 6, padding: '6px 8px' }}>
                    <span className="mono" style={{ fontWeight: 600 }}>[{a.severity}]</span> {a.message.slice(0, 60)}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="card-base" style={{ padding: 20, fontSize: 11, color: 'var(--text-sub)', lineHeight: 1.7 }}>
            <div className="label-xs" style={{ marginBottom: 8 }}>HOW IT WORKS</div>
            This timeline shows every trust pipeline execution in real-time. Select "Scam Victim" or "Malware Bot" on the Live Monitor page to watch an attack unfold.
          </div>
        </div>
      </div>
    </div>
  )
}

export default SessionReplay
