import React from 'react'
import { Shield, Zap, Brain, TrendingDown, Fingerprint, AlertTriangle, Lock, Activity } from 'lucide-react'

const MiniTrustChart = () => (
  <svg viewBox="0 0 380 110" style={{ width: '100%', height: '100px' }} preserveAspectRatio="none">
    <defs>
      <linearGradient id="areaGradA" x1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#10B981" stopOpacity="0.25" />
        <stop offset="100%" stopColor="#10B981" stopOpacity="0.04" />
      </linearGradient>
      <linearGradient id="lineGradA" x1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#10B981" stopOpacity="1" />
        <stop offset="100%" stopColor="#10B981" stopOpacity="0.15" />
      </linearGradient>
    </defs>
    <path d="M0,30 C40,28 80,25 120,22 C160,19 200,18 240,20 C280,22 320,25 380,30 L380,90 C320,95 280,98 240,100 C200,102 160,103 120,100 C80,98 40,95 0,90 Z" fill="url(#areaGradA)" />
    <polyline points="0,72 40,68 80,62 120,58 160,55 200,52 240,50 280,48 320,46 380,44" stroke="rgba(255,255,255,0.8)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    <line x1="200" y1="0" x2="200" y2="110" stroke="#EF4444" strokeWidth="1.5" strokeDasharray="4,3" opacity="0.8" />
    <rect x="182" y="2" width="48" height="14" rx="3" fill="#EF4444" opacity="0.9" />
    <text x="206" y="13" fill="white" fontSize="8" fontFamily="JetBrains Mono" textAnchor="middle" fontWeight="600">ATTACK</text>
    <polyline points="200,55 240,62 280,74 320,82 380,90" stroke="#EF4444" strokeWidth="2" fill="none" strokeLinecap="round" strokeDasharray="4,3" />
  </svg>
)

const MiniSparkline = () => (
  <svg viewBox="0 0 200 50" style={{ width: '100%', height: '45px' }} preserveAspectRatio="none">
    <defs>
      <linearGradient id="sparkGradA" x1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#10B981" stopOpacity="1" />
        <stop offset="80%" stopColor="#10B981" stopOpacity="0.5" />
        <stop offset="100%" stopColor="#EF4444" stopOpacity="0.8" />
      </linearGradient>
    </defs>
    <polyline points="0,42 20,38 40,32 60,35 80,28 100,30 120,22 140,25 160,19 180,22 200,18" stroke="url(#sparkGradA)" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export const Card1 = () => (
  <div style={{ padding: '28px', height: '100%', display: 'flex', flexDirection: 'column', color: 'white', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981', boxShadow: '0 0 8px rgba(16,185,129,0.8)' }} />
      <span style={{ fontSize: '10px', letterSpacing: '0.12em', color: '#10B981', textTransform: 'uppercase', fontWeight: 600, fontFamily: 'JetBrains Mono' }}>Continuous Trust Engine</span>
    </div>
    <h3 style={{ margin: '0 0 16px 0', fontSize: '22px', fontWeight: 700, color: '#F0F0F8', fontFamily: 'Space Grotesk, sans-serif', lineHeight: '1.2' }}>
      Real-Time Trust<br />Scoring
    </h3>
    <div style={{ flex: 1, background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '12px 8px 4px', border: '1px solid rgba(255,255,255,0.07)' }}>
      <MiniTrustChart />
      <div style={{ display: 'flex', justifyContent: 'space-around', padding: '8px 4px 0', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '9px', color: 'rgba(16,185,129,0.8)', marginBottom: '2px', fontFamily: 'JetBrains Mono' }}>ALLOW</div>
          <div style={{ fontSize: '13px', color: '#6EE7B7', fontWeight: 600, fontFamily: 'JetBrains Mono' }}>T &gt; 0.85</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '9px', color: '#F59E0B', marginBottom: '2px', fontFamily: 'JetBrains Mono' }}>STEP-UP</div>
          <div style={{ fontSize: '13px', color: '#FCD34D', fontWeight: 700, fontFamily: 'JetBrains Mono' }}>0.60-0.85</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '9px', color: 'rgba(239,68,68,0.8)', marginBottom: '2px', fontFamily: 'JetBrains Mono' }}>BLOCK</div>
          <div style={{ fontSize: '13px', color: '#FCA5A5', fontWeight: 600, fontFamily: 'JetBrains Mono' }}>T &lt; 0.60</div>
        </div>
      </div>
    </div>
    <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', boxShadow: '0 0 6px rgba(16,185,129,0.6)' }} />
        <span style={{ fontSize: '12px', color: '#10B981', fontWeight: 600, fontFamily: 'JetBrains Mono' }}>Trust Score: 95/100</span>
      </div>
      <span style={{ fontSize: '10px', color: '#6B7280', background: 'rgba(16,185,129,0.1)', padding: '2px 8px', borderRadius: '20px', border: '1px solid rgba(16,185,129,0.2)', fontFamily: 'JetBrains Mono' }}>ALLOW</span>
    </div>
  </div>
)

export const Card2 = () => (
  <div style={{ padding: '28px', height: '100%', display: 'flex', flexDirection: 'column', color: 'white', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#3B82F6', boxShadow: '0 0 8px rgba(59,130,246,0.8)' }} />
      <span style={{ fontSize: '10px', letterSpacing: '0.12em', color: '#3B82F6', textTransform: 'uppercase', fontWeight: 600, fontFamily: 'JetBrains Mono' }}>Cognitive State Machine</span>
    </div>
    <h3 style={{ margin: '0 0 16px 0', fontSize: '22px', fontWeight: 700, color: '#F0F0F8', fontFamily: 'Space Grotesk, sans-serif', lineHeight: '1.2' }}>
      AI-Powered State<br />Classification
    </h3>
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '12px 14px', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '12px', color: '#E8E8F5', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Brain size={12} color="#3B82F6" /> State: PANICKED
          </span>
          <span style={{ fontSize: '10px', color: '#EF4444', background: 'rgba(239,68,68,0.12)', padding: '2px 6px', borderRadius: '4px', fontFamily: 'JetBrains Mono' }}>0.35</span>
        </div>
        <p style={{ margin: '0 0 8px', fontSize: '12px', color: '#8B8BA8', lineHeight: '1.5' }}>
          <strong style={{ color: '#B0B0C8' }}>Signal:</strong> Elevated hesitation, high correction rate, motor control degradation.
        </p>
        <div style={{ borderLeft: '2px solid #EF4444', paddingLeft: '8px' }}>
          <p style={{ margin: 0, fontSize: '11px', color: '#8B8BA8' }}>
            <strong style={{ color: '#EF4444' }}>Action:</strong> Potential social engineering. Block transaction.
          </p>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {['CALM', 'FOCUSED', 'DISTRESSED', 'PANICKED', 'COERCED'].map((s, i) => (
          <span key={s} style={{ fontSize: '9px', color: i === 3 ? '#EF4444' : '#10B981', background: i === 3 ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.08)', border: `1px solid ${i === 3 ? 'rgba(239,68,68,0.25)' : 'rgba(16,185,129,0.2)'}`, padding: '3px 8px', borderRadius: '12px', fontFamily: 'JetBrains Mono' }}>{s}</span>
        ))}
      </div>
    </div>
    <MiniSparkline />
  </div>
)

export const Card3 = () => (
  <div style={{ padding: '28px', height: '100%', display: 'flex', flexDirection: 'column', color: 'white', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#F59E0B', boxShadow: '0 0 8px rgba(245,158,11,0.8)' }} />
      <span style={{ fontSize: '10px', letterSpacing: '0.12em', color: '#F59E0B', textTransform: 'uppercase', fontWeight: 600, fontFamily: 'JetBrains Mono' }}>CUSUM Drift Detector</span>
    </div>
    <h3 style={{ margin: '0 0 16px 0', fontSize: '22px', fontWeight: 700, color: '#F0F0F8', fontFamily: 'Space Grotesk, sans-serif', lineHeight: '1.2' }}>
      Change-Point<br />Detection
    </h3>
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ background: 'rgba(245,158,11,0.05)', borderRadius: '10px', padding: '12px 14px', border: '1px solid rgba(245,158,11,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <span style={{ fontSize: '12px', color: '#FCD34D', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px' }}>
            <TrendingDown size={12} color="#FCD34D" /> Drift Accumulated
          </span>
          <span style={{ fontSize: '10px', color: '#F59E0B', background: 'rgba(245,158,11,0.15)', padding: '2px 6px', borderRadius: '4px', fontFamily: 'JetBrains Mono' }}>0.42</span>
        </div>
        <p style={{ margin: '0 0 6px', fontSize: '12px', color: '#D0C0A0', lineHeight: '1.4' }}>CUSUM threshold: <strong style={{ color: '#EF4444' }}>EXCEEDED</strong>. Progressive behavioral deviation over 12 steps.</p>
        <p style={{ margin: 0, fontSize: '11px', color: '#9B7A50' }}>Pattern: Gradual account takeover signature.</p>
      </div>
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
        <span style={{ fontSize: '10px', color: '#F59E0B', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', padding: '4px 10px', borderRadius: '6px', fontFamily: 'JetBrains Mono' }}>
          Similarity: 0.87 → 0.62
        </span>
      </div>
    </div>
  </div>
)

export const Card4 = () => (
  <div style={{ padding: '28px', height: '100%', display: 'flex', flexDirection: 'column', color: 'white', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981', boxShadow: '0 0 8px rgba(16,185,129,0.8)' }} />
      <span style={{ fontSize: '10px', letterSpacing: '0.12em', color: '#10B981', textTransform: 'uppercase', fontWeight: 600, fontFamily: 'JetBrains Mono' }}>Security Architecture</span>
    </div>
    <h3 style={{ margin: '0 0 18px 0', fontSize: '22px', fontWeight: 700, color: '#F0F0F8', fontFamily: 'Space Grotesk, sans-serif', lineHeight: '1.2' }}>
      Bank-Grade<br />Trust Infrastructure
    </h3>
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {[
        { icon: <Shield size={16} />, label: 'Anti-Poisoning', desc: 'Baseline updates only when T > 0.90', color: '#10B981' },
        { icon: <Zap size={16} />, label: 'Sub-100ms Latency', desc: 'Full pipeline in one SDK heartbeat', color: '#3B82F6' },
        { icon: <Lock size={16} />, label: 'Zero Raw Data Exposure', desc: 'Only embeddings leave the device', color: '#8B5CF6' },
      ].map((g, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '10px 12px', border: '1px solid rgba(255,255,255,0.06)' }}>
          <span style={{ color: g.color, flexShrink: 0, marginTop: '1px' }}>{g.icon}</span>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: g.color, marginBottom: '2px', fontFamily: 'JetBrains Mono' }}>{g.label}</div>
            <div style={{ fontSize: '11px', color: '#6B7280' }}>{g.desc}</div>
          </div>
          <div style={{ marginLeft: 'auto', width: '8px', height: '8px', borderRadius: '50%', background: g.color, boxShadow: `0 0 6px ${g.color}`, flexShrink: 0, marginTop: '4px' }} />
        </div>
      ))}
    </div>
    <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: 'rgba(16,185,129,0.07)', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.15)' }}>
      <Activity size={14} color="#6EE7B7" />
      <span style={{ fontSize: '11px', color: '#6EE7B7', fontFamily: 'JetBrains Mono', fontWeight: 500 }}>PSB Hackathon 2026 Ready</span>
    </div>
  </div>
)

export const Card5 = () => (
  <div style={{ padding: '28px', height: '100%', display: 'flex', flexDirection: 'column', color: 'white', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#8B5CF6', boxShadow: '0 0 8px rgba(139,92,246,0.8)' }} />
      <span style={{ fontSize: '10px', letterSpacing: '0.12em', color: '#8B5CF6', textTransform: 'uppercase', fontWeight: 600, fontFamily: 'JetBrains Mono' }}>Behavioral Embedding</span>
    </div>
    <h3 style={{ margin: '0 0 14px 0', fontSize: '22px', fontWeight: 700, color: '#F0F0F8', fontFamily: 'Space Grotesk, sans-serif', lineHeight: '1.2' }}>
      384-Dimensional<br />Identity Space
    </h3>
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '16px' }}>
      <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '10px', padding: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px', gap: '4px' }}>
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} style={{ flex: 1, height: '3px', borderRadius: '2px', background: '#10B981', opacity: 1 - (i / 22) }} />
          ))}
        </div>
        <div style={{ position: 'relative', height: '40px', background: 'rgba(16,185,129,0.06)', borderRadius: '6px', overflow: 'hidden' }}>
          {Array.from({ length: 15 }).map((_, i) => (
            <div key={i} style={{ position: 'absolute', left: `${(i / 15) * 100}%`, top: `${20 - (i * 1.2)}%`, width: `${100 / 15 + 0.5}%`, height: `${8 + i * 2.5}%`, background: `rgba(16,185,129,${0.35 - i * 0.02})` }} />
          ))}
          <div style={{ position: 'absolute', bottom: '25%', left: 0, right: 0, height: '2px', background: 'linear-gradient(to right, #10B981 30%, rgba(16,185,129,0.1) 100%)' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
          <span style={{ fontSize: '9px', color: '#6B7280', fontFamily: 'JetBrains Mono' }}>BASELINE</span>
          <span style={{ fontSize: '9px', color: '#6B7280', fontFamily: 'JetBrains Mono' }}>CURRENT SESSION →</span>
        </div>
      </div>
      <blockquote style={{ margin: 0, padding: '10px 14px', borderLeft: '2px solid #10B981', background: 'rgba(16,185,129,0.04)', borderRadius: '0 8px 8px 0' }}>
        <p style={{ margin: 0, fontSize: '11px', color: '#9BA8B8', lineHeight: '1.6', fontStyle: 'italic' }}>
          "Cosine similarity between behavioral embeddings detects identity drift — even when individual metrics appear normal."
        </p>
      </blockquote>
    </div>
  </div>
)
