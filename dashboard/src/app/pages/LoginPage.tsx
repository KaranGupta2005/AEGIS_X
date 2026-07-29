import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, Link } from "react-router";
import { motion } from "motion/react";
import { Shield, LogIn, Loader2, ArrowLeft } from "lucide-react";
import { ShaderRipple } from "../components/ShaderRipple";
import { login } from "../../services/auth";

// ─── LOGIN BEHAVIORAL TRACKER ─────────────────────────────────────────────
// Captures typing cadence during login for pre-session trust signal.
// Stored in sessionStorage and sent to backend after successful auth.
interface LoginBehaviorMetrics {
    keyTimings: number[]
    totalKeystrokes: number
    corrections: number
    pauses: number  // gaps > 2s between keystrokes
    loginDurationMs: number
    fieldSwitches: number
    startTime: number
}

export default function LoginPage() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [formData, setFormData] = useState({ email: "", password: "" });
    
    // Behavioral tracking refs (don't cause re-renders)
    const metricsRef = useRef<LoginBehaviorMetrics>({
        keyTimings: [], totalKeystrokes: 0, corrections: 0,
        pauses: 0, loginDurationMs: 0, fieldSwitches: 0, startTime: Date.now(),
    })
    const lastKeyTimeRef = useRef<number>(0)

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', 'dark');
        metricsRef.current.startTime = Date.now()
        
        // Track keystrokes globally on this page
        const handleKey = (e: KeyboardEvent) => {
            const now = performance.now()
            const m = metricsRef.current
            m.totalKeystrokes++
            if (e.key === 'Backspace') m.corrections++
            if (lastKeyTimeRef.current > 0) {
                const gap = now - lastKeyTimeRef.current
                m.keyTimings.push(gap)
                if (gap > 2000) m.pauses++
            }
            lastKeyTimeRef.current = now
        }
        
        const handleFocus = () => { metricsRef.current.fieldSwitches++ }
        
        document.addEventListener('keydown', handleKey, { passive: true })
        document.querySelectorAll('input').forEach(el => el.addEventListener('focus', handleFocus))
        
        return () => {
            document.removeEventListener('keydown', handleKey)
            const saved = localStorage.getItem('aegisx-theme') || 'light';
            document.documentElement.setAttribute('data-theme', saved);
        };
    }, []);

    // Send login behavioral metrics to backend after successful auth
    const reportLoginBehavior = useCallback(async () => {
        const m = metricsRef.current
        m.loginDurationMs = Date.now() - m.startTime
        
        // Compute typing speed and rhythm variance
        const typingSpeed = m.loginDurationMs > 0 ? (m.totalKeystrokes / (m.loginDurationMs / 1000)) : 0
        const rhythmVariance = m.keyTimings.length > 2
            ? m.keyTimings.reduce((sum, t) => {
                const mean = m.keyTimings.reduce((a, b) => a + b, 0) / m.keyTimings.length
                return sum + (t - mean) ** 2
              }, 0) / m.keyTimings.length
            : 35
        
        // Store for the SDK to use as pre-session context
        sessionStorage.setItem('aegisx_login_behavior', JSON.stringify({
            typing_speed_cps: Math.min(12, typingSpeed),
            typing_rhythm_variance: Math.min(350, rhythmVariance),
            correction_rate: m.totalKeystrokes > 0 ? m.corrections / m.totalKeystrokes : 0,
            hesitation_count: m.pauses,
            login_duration_ms: m.loginDurationMs,
            field_switches: m.fieldSwitches,
            total_keystrokes: m.totalKeystrokes,
        }))
        
        // Also report to backend for pre-session trust assessment
        try {
            const BACKEND = import.meta.env.VITE_BACKEND_URL || ''
            await fetch(`${BACKEND}/api/v1/auth/login-behavior`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    typing_speed_cps: Math.min(12, typingSpeed),
                    typing_rhythm_variance: Math.min(350, rhythmVariance),
                    correction_rate: m.totalKeystrokes > 0 ? m.corrections / m.totalKeystrokes : 0,
                    pauses: m.pauses,
                    login_duration_ms: m.loginDurationMs,
                    total_keystrokes: m.totalKeystrokes,
                }),
            })
        } catch { /* non-critical */ }
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        try {
            await login(formData.email, formData.password);
            await reportLoginBehavior();
            navigate("/app/demo");
        } catch (err: any) {
            const msg = typeof err === "string" ? err : err?.message || "Login failed.";
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden", background: "#0a1628" }}>
            <Link to="/" style={{ position: "absolute", top: 16, left: 16, zIndex: 50, display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 10, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)", textDecoration: "none", fontSize: 13, fontWeight: 500, transition: "all 0.2s" }}>
                <ArrowLeft size={15} />
                Back
            </Link>

            <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                style={{ position: "relative", zIndex: 10, width: "100%", maxWidth: 420, margin: "0 16px", padding: 32, borderRadius: 20, background: "rgba(15, 29, 50, 0.85)", backdropFilter: "blur(20px)", border: "1px solid rgba(59,130,246,0.15)", boxShadow: "0 0 60px rgba(59,130,246,0.08), 0 25px 50px rgba(0,0,0,0.4)" }}
            >
                <div style={{ marginBottom: 28 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: "#3B82F6", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20, boxShadow: "0 0 20px rgba(59,130,246,0.3)" }}>
                        <Shield size={22} color="#0a1628" />
                    </div>
                    <h2 style={{ fontSize: 26, fontWeight: 700, color: "white", margin: "0 0 6px", fontFamily: "Space Grotesk, sans-serif" }}>Welcome back</h2>
                    <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", margin: 0 }}>Sign in to access your dashboard</p>
                </div>

                <form onSubmit={handleSubmit}>
                    {error && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171", fontSize: 13, marginBottom: 18, display: "flex", alignItems: "center", gap: 8 }}>
                            <span>⚠️</span> {error}
                        </motion.div>
                    )}

                    <div style={{ marginBottom: 18 }}>
                        <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.8)", marginBottom: 8 }}>Email or Username</label>
                        <input
                            type="text"
                            placeholder="you@example.com"
                            value={formData.email}
                            onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))}
                            required
                            disabled={loading}
                            style={{ width: "100%", height: 44, padding: "0 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", color: "white", fontSize: 14, outline: "none", transition: "all 0.2s" }}
                            onFocus={e => { e.currentTarget.style.borderColor = "rgba(59,130,246,0.5)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.1)" }}
                            onBlur={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; e.currentTarget.style.boxShadow = "none" }}
                        />
                    </div>

                    <div style={{ marginBottom: 24 }}>
                        <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.8)", marginBottom: 8 }}>Password</label>
                        <input
                            type="password"
                            placeholder="••••••••"
                            value={formData.password}
                            onChange={(e) => setFormData(p => ({ ...p, password: e.target.value }))}
                            required
                            disabled={loading}
                            style={{ width: "100%", height: 44, padding: "0 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", color: "white", fontSize: 14, outline: "none", transition: "all 0.2s" }}
                            onFocus={e => { e.currentTarget.style.borderColor = "rgba(59,130,246,0.5)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.1)" }}
                            onBlur={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; e.currentTarget.style.boxShadow = "none" }}
                        />
                    </div>

                    <motion.button
                        type="submit"
                        disabled={loading}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        style={{ width: "100%", height: 46, borderRadius: 10, border: "none", background: "linear-gradient(135deg, #2563eb, #1d4ed8)", color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: "0 4px 20px rgba(37,99,235,0.4)", opacity: loading ? 0.6 : 1, transition: "opacity 0.2s" }}
                    >
                        {loading ? <><Loader2 size={16} className="animate-spin" /> Signing in...</> : <><LogIn size={16} /> Sign In</>}
                    </motion.button>

                    <p style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: "rgba(255,255,255,0.45)" }}>
                        Don't have an account?{" "}
                        <Link to="/register" style={{ color: "#60a5fa", fontWeight: 600, textDecoration: "none" }}>Create account</Link>
                    </p>
                </form>
            </motion.div>

            <ShaderRipple className="absolute inset-0 -z-0 h-screen" color1="#1e3a8a" color2="#1d4ed8" color3="#3b82f6" speed={0.05} rotation={135} rippleCount={8} lineWidth={0.002} timeScale={0.5} opacity={0.8} loopDuration={0.7} />
        </div>
    );
}
