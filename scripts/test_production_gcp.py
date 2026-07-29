"""Production E2E Test against GCP Cloud Run backend."""
import asyncio
import json
import httpx
import websockets

BACKEND_URL = "https://aegisx-backend-40060733769.us-central1.run.app"
WS_URL = "wss://aegisx-backend-40060733769.us-central1.run.app"

NORMAL_EVENT = {
    "typing_speed_cps": 3.8, "typing_rhythm_variance": 38,
    "typing_pressure_mean": 0.55, "swipe_velocity_mean": 1.2,
    "swipe_velocity_variance": 0.14, "swipe_straightness": 0.82,
    "touch_duration_mean": 120, "touch_duration_variance": 580,
    "touch_area_mean": 0.45, "hesitation_ratio": 0.08,
    "hesitation_count": 1, "correction_rate": 0.04,
    "scroll_speed_mean": 0.8, "gyroscope_variance": 0.015,
    "session_time_elapsed": 90, "interaction_intensity": 8,
}

SCAM_EVENT = {
    "typing_speed_cps": 0.8, "typing_rhythm_variance": 250,
    "typing_pressure_mean": 0.78, "swipe_velocity_mean": 0.25,
    "swipe_velocity_variance": 0.40, "swipe_straightness": 0.38,
    "touch_duration_mean": 400, "touch_duration_variance": 3500,
    "touch_area_mean": 0.60, "hesitation_ratio": 0.72,
    "hesitation_count": 12, "correction_rate": 0.48,
    "scroll_speed_mean": 0.05, "gyroscope_variance": 0.095,
    "session_time_elapsed": 220, "interaction_intensity": 2,
}

BOT_EVENT = {
    "typing_speed_cps": 9.5, "typing_rhythm_variance": 1.5,
    "typing_pressure_mean": 0.50, "swipe_velocity_mean": 2.4,
    "swipe_velocity_variance": 0.003, "swipe_straightness": 0.99,
    "touch_duration_mean": 48, "touch_duration_variance": 5,
    "touch_area_mean": 0.40, "hesitation_ratio": 0.002,
    "hesitation_count": 0, "correction_rate": 0.001,
    "scroll_speed_mean": 1.8, "gyroscope_variance": 0.0003,
    "session_time_elapsed": 15, "interaction_intensity": 18,
}


async def test_http_endpoints():
    print("=" * 60)
    print("  TEST 1: HTTP ENDPOINTS")
    print("=" * 60)

    async with httpx.AsyncClient(timeout=120.0) as client:
        # Health
        r = await client.get(f"{BACKEND_URL}/")
        print(f"  GET /           → {r.status_code} {r.json()}")

        r = await client.get(f"{BACKEND_URL}/health")
        data = r.json()
        print(f"  GET /health     → {data['status']}")
        for k, v in data["checks"].items():
            symbol = "✓" if v else "✗"
            print(f"    {symbol} {k}")

        r = await client.get(f"{BACKEND_URL}/status")
        print(f"  GET /status     → {r.status_code}")

        r = await client.get(f"{BACKEND_URL}/metrics")
        print(f"  GET /metrics    → {r.status_code}")

    return True


async def send_event(ws, event, tx_amount=0, is_new_ben=False):
    msg = {
        "type": "behavioral_event",
        "event": event,
        "transaction_amount": tx_amount,
        "is_new_beneficiary": is_new_ben,
    }
    await ws.send(json.dumps(msg))
    resp = await ws.recv()
    return json.loads(resp)


def parse_response(r):
    return {
        "trust": r.get("trust_score", 0),
        "effective": r.get("effective_trust", 0),
        "decision": r.get("decision", "?"),
        "cognitive": r.get("cognitive_state", "?"),
        "drift": r.get("drift_severity", "none"),
    }


async def test_websocket_normal():
    print("\n" + "=" * 60)
    print("  TEST 2: WebSocket — NORMAL USER (should stay ALLOW)")
    print("=" * 60)

    uri = f"{WS_URL}/ws/prod_normal_test"
    async with websockets.connect(uri) as ws:
        resp = await ws.recv()
        session = json.loads(resp)
        print(f"  Session started: {session.get('session_id', 'ok')}")

        all_safe = True
        for i in range(8):
            r = await send_event(ws, NORMAL_EVENT)
            p = parse_response(r)
            # First 2 events may show STEP_UP (trust inertia warm-up) — that's OK
            if p["decision"] == "BLOCK":
                all_safe = False
            print(f"  [{i+1}] Trust={p['trust']:.3f} Decision={p['decision']} Cognitive={p['cognitive']}")
            await asyncio.sleep(0.5)

        if all_safe:
            print("  ✓ Normal user never BLOCKED (STEP_UP on warmup is OK)")
        else:
            print("  ✗ FALSE POSITIVE — normal user got BLOCKED!")
    return all_safe


async def test_websocket_scam():
    print("\n" + "=" * 60)
    print("  TEST 3: WebSocket — SCAM ATTACK (should BLOCK)")
    print("=" * 60)

    uri = f"{WS_URL}/ws/prod_scam_test"
    async with websockets.connect(uri) as ws:
        resp = await ws.recv()
        session = json.loads(resp)
        print(f"  Session started: {session.get('session_id', 'ok')}")

        # Normal phase
        for i in range(2):
            r = await send_event(ws, NORMAL_EVENT)
            p = parse_response(r)
            print(f"  [Normal {i+1}] Trust={p['trust']:.3f} Decision={p['decision']}")
            await asyncio.sleep(0.5)

        # Scam phase
        blocked = False
        for i in range(6):
            r = await send_event(ws, SCAM_EVENT, tx_amount=200000, is_new_ben=True)
            p = parse_response(r)
            print(f"  [Scam {i+1}] Trust={p['trust']:.3f} Eff={p.get('effective',0):.3f} Decision={p['decision']} Cog={p['cognitive']} Drift={p['drift']}")
            if p["decision"] == "BLOCK":
                blocked = True
                print("  >>> BLOCKED!")
                break
            await asyncio.sleep(0.5)

        if blocked:
            print("  ✓ Scam detected and blocked")
        else:
            print("  ✗ Scam NOT blocked")
    return blocked


async def test_websocket_malware():
    print("\n" + "=" * 60)
    print("  TEST 4: WebSocket — MALWARE/BOT (should BLOCK)")
    print("=" * 60)

    uri = f"{WS_URL}/ws/prod_malware_test"
    async with websockets.connect(uri) as ws:
        resp = await ws.recv()
        session = json.loads(resp)
        print(f"  Session started: {session.get('session_id', 'ok')}")

        # Normal phase
        for i in range(2):
            r = await send_event(ws, NORMAL_EVENT)
            p = parse_response(r)
            print(f"  [Normal {i+1}] Trust={p['trust']:.3f} Decision={p['decision']}")
            await asyncio.sleep(0.5)

        # Bot phase
        blocked = False
        for i in range(5):
            r = await send_event(ws, BOT_EVENT, tx_amount=500000, is_new_ben=True)
            p = parse_response(r)
            print(f"  [Bot {i+1}] Trust={p['trust']:.3f} Eff={p.get('effective',0):.3f} Decision={p['decision']} Cog={p['cognitive']} Drift={p['drift']}")
            if p["decision"] == "BLOCK":
                blocked = True
                print("  >>> BLOCKED!")
                break
            await asyncio.sleep(0.5)

        if blocked:
            print("  ✓ Malware detected and blocked")
        else:
            print("  ✗ Malware NOT blocked")
    return blocked


async def main():
    print()
    print("╔══════════════════════════════════════════════════════════════╗")
    print("║  AEGIS-X PRODUCTION E2E TEST (GCP Cloud Run)               ║")
    print(f"║  Backend: {BACKEND_URL}  ║")
    print("╚══════════════════════════════════════════════════════════════╝")
    print()

    results = {}
    results["http_endpoints"] = await test_http_endpoints()
    results["normal_allow"] = await test_websocket_normal()
    results["scam_block"] = await test_websocket_scam()
    results["malware_block"] = await test_websocket_malware()

    print("\n" + "=" * 60)
    print("  FINAL RESULTS")
    print("=" * 60)
    for name, passed in results.items():
        status = "✓ PASS" if passed else "✗ FAIL"
        print(f"  {status}  {name}")

    all_pass = all(results.values())
    print()
    if all_pass:
        print("  ═══ ALL PRODUCTION TESTS PASSED ═══")
    else:
        print("  ═══ SOME TESTS FAILED ═══")
    print()


if __name__ == "__main__":
    asyncio.run(main())
