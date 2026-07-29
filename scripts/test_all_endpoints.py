"""Full production API coverage test — every endpoint."""
import requests
import json

BASE = "https://aegisx-backend-92ir.onrender.com"
PASS = 0
FAIL = 0

def test(name, method, url, **kwargs):
    global PASS, FAIL
    try:
        r = getattr(requests, method)(url, timeout=15, **kwargs)
        ok = r.status_code in (200, 201, 409)  # 409 = already exists (ok)
        symbol = "✓" if ok else "✗"
        if ok:
            PASS += 1
        else:
            FAIL += 1
        print(f"  {symbol} {name:<30} {r.status_code}")
        return r
    except Exception as e:
        FAIL += 1
        print(f"  ✗ {name:<30} ERROR: {e}")
        return None

print("=" * 55)
print("  PRODUCTION — FULL ENDPOINT TEST")
print("=" * 55)
print()

# Health
test("Health /", "get", f"{BASE}/")
test("Health /health", "get", f"{BASE}/health")

# Auth
test("Register", "post", f"{BASE}/api/v1/auth/register",
     json={"username": "prodtest2026", "email": "pt@x.com", "password": "pass123"})
test("Login", "post", f"{BASE}/api/v1/auth/login",
     json={"username": "prodtest2026", "password": "pass123"})
test("Login Behavior", "post", f"{BASE}/api/v1/auth/login-behavior",
     json={"typing_speed_cps": 3.5, "typing_rhythm_variance": 35,
            "correction_rate": 0.04, "pauses": 1,
            "login_duration_ms": 5000, "total_keystrokes": 20})

# Session
test("Session Start", "post", f"{BASE}/api/v1/session/start",
     json={"user_id": "api_test_user"})
test("Session Status", "get", f"{BASE}/api/v1/session/api_test_user")
test("Session End", "post", f"{BASE}/api/v1/session/end",
     json={"user_id": "api_test_user"})

# Security
test("Security Evaluate", "post", f"{BASE}/api/v1/security/evaluate",
     json={"user_id": "t", "session_id": "s", "trust_score": 0.5,
            "cognitive_state": "distressed"})
test("Security Status", "get", f"{BASE}/api/v1/security/status/t/s")
test("Bot Detection", "get", f"{BASE}/api/v1/security/intelligence/bot/t/s")
test("Deception Loading", "get", f"{BASE}/api/v1/security/deception/loading")

# Verification
test("Verify Initiate", "post", f"{BASE}/api/v1/verify/initiate",
     json={"user_id": "t", "session_id": "s", "trust_score": 0.6})
test("Verify Providers", "get", f"{BASE}/api/v1/verify/providers")
test("Verify History", "get", f"{BASE}/api/v1/verify/history/t")

# Audit
test("Audit Explain", "post",
     f"{BASE}/api/v1/audit/explain?trust_score=0.4&similarity=0.5&cognitive_state=panicked&cognitive_stability=0.3&drift_detected=true&drift_severity=high&decision=BLOCK")

# Monitor
test("Sessions Overview", "get", f"{BASE}/api/v1/sessions/overview")

print()
print("=" * 55)
total = PASS + FAIL
print(f"  RESULT: {PASS}/{total} passed, {FAIL} failed")
if FAIL == 0:
    print("  ✓ ALL ENDPOINTS ACCESSIBLE — PRODUCTION READY")
else:
    print("  ⚠ Some endpoints need attention")
print("=" * 55)
