import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { motion } from "motion/react";
import { Shield, LogIn, Loader2, ArrowLeft } from "lucide-react";
import { ShaderRipple } from "../components/ShaderRipple";
import { login } from "../../services/auth";

export default function LoginPage() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [formData, setFormData] = useState({ email: "", password: "" });

    // Force dark theme on login page
    useState(() => {
        document.documentElement.setAttribute('data-theme', 'dark');
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        try {
            await login(formData.email, formData.password);
            navigate("/app/monitor");
        } catch (err: any) {
            const msg = typeof err === "string" ? err : err?.message || "Login failed. Make sure the backend is running.";
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden", background: "#030014" }}>
            <Link to="/" style={{ position: "absolute", top: 16, left: 16, zIndex: 50, display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 10, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)", textDecoration: "none", fontSize: 13, fontWeight: 500, transition: "all 0.2s" }}>
                <ArrowLeft size={15} />
                Back
            </Link>

            <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                style={{ position: "relative", zIndex: 10, width: "100%", maxWidth: 420, margin: "0 16px", padding: 32, borderRadius: 20, background: "rgba(15, 18, 30, 0.85)", backdropFilter: "blur(20px)", border: "1px solid rgba(16,185,129,0.15)", boxShadow: "0 0 60px rgba(16,185,129,0.08), 0 25px 50px rgba(0,0,0,0.4)" }}
            >
                <div style={{ marginBottom: 28 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: "#10B981", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20, boxShadow: "0 0 20px rgba(16,185,129,0.3)" }}>
                        <Shield size={22} color="#030014" />
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
                        <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.8)", marginBottom: 8 }}>Email</label>
                        <input
                            type="email"
                            placeholder="you@example.com"
                            value={formData.email}
                            onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))}
                            required
                            disabled={loading}
                            style={{ width: "100%", height: 44, padding: "0 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", color: "white", fontSize: 14, outline: "none", transition: "all 0.2s" }}
                            onFocus={e => { e.currentTarget.style.borderColor = "rgba(16,185,129,0.5)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(16,185,129,0.1)" }}
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
                            onFocus={e => { e.currentTarget.style.borderColor = "rgba(16,185,129,0.5)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(16,185,129,0.1)" }}
                            onBlur={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; e.currentTarget.style.boxShadow = "none" }}
                        />
                    </div>

                    <motion.button
                        type="submit"
                        disabled={loading}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        style={{ width: "100%", height: 46, borderRadius: 10, border: "none", background: "linear-gradient(135deg, #10B981, #059669)", color: "#030014", fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: "0 4px 20px rgba(16,185,129,0.3)", opacity: loading ? 0.6 : 1, transition: "opacity 0.2s" }}
                    >
                        {loading ? <><Loader2 size={16} className="animate-spin" /> Signing in...</> : <><LogIn size={16} /> Sign In</>}
                    </motion.button>

                    <p style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: "rgba(255,255,255,0.45)" }}>
                        Don't have an account?{" "}
                        <Link to="/register" style={{ color: "#10B981", fontWeight: 600, textDecoration: "none" }}>Create account</Link>
                    </p>
                </form>
            </motion.div>

            <ShaderRipple className="absolute inset-0 -z-0 h-screen" color1="#10B981" color2="#059669" color3="#34D399" speed={0.05} rotation={135} rippleCount={8} lineWidth={0.002} timeScale={0.5} opacity={0.8} loopDuration={0.7} />
        </div>
    );
}
