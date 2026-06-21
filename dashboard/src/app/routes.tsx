import React, { Suspense } from 'react'
import { createBrowserRouter, Navigate } from 'react-router'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ProtectedLayout from './layout/ProtectedLayout'

const LiveMonitor = React.lazy(() => import('./pages/LiveMonitor'))
const TrustTimeline = React.lazy(() => import('./pages/TrustTimeline'))
const CognitiveAnalysis = React.lazy(() => import('./pages/CognitiveAnalysis'))
const IncidentExplorer = React.lazy(() => import('./pages/IncidentExplorer'))
const SessionReplay = React.lazy(() => import('./pages/SessionReplay'))
const LiveDemo = React.lazy(() => import('./pages/LiveDemo'))

const Lazy: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Suspense fallback={<div style={{ padding: 40, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>Loading...</div>}>
    {children}
  </Suspense>
)

export const router = createBrowserRouter([
  { path: '/', Component: LandingPage },
  { path: '/login', Component: LoginPage },
  { path: '/register', Component: RegisterPage },
  {
    path: '/app',
    Component: ProtectedLayout,
    children: [
      { index: true, element: <Navigate to="/app/demo" replace /> },
      { path: 'demo', element: <Lazy><LiveDemo /></Lazy> },
      { path: 'monitor', element: <Lazy><LiveMonitor /></Lazy> },
      { path: 'timeline', element: <Lazy><TrustTimeline /></Lazy> },
      { path: 'cognitive', element: <Lazy><CognitiveAnalysis /></Lazy> },
      { path: 'incident', element: <Lazy><IncidentExplorer /></Lazy> },
      { path: 'replay', element: <Lazy><SessionReplay /></Lazy> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
