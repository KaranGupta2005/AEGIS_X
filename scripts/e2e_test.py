"""End-to-end validation: WebSocket → Pipeline → Trust Drops → Containment"""
import asyncio
import json
import websockets


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
    if r.get("error"):
        return {"error": r["error"], "reason": r.get("reason", "")}
    # Response is flat: trust_score, decision, cognitive_state are top-level
    return {
        "trust": r.get("trust_score", 0),
        "effective": r.get("effective_trust", 0),
        "decision": r.get("decision", "?"),
        "cognitive": r.get("cognitive_state", "?"),
        "drift": r.get("drift_severity", "none"),
        "security": r.get("security", {}).get("security_state", "NORMAL"),
        "sandbox": r.get("security", {}).get("sandbox_active", False),
    }


async def test_scam_scenario():
    print("=" * 60)
    print("  E2E TEST: SCAM SCENARIO")
    print("=" * 60)

    uri = "ws://localhost:8000/ws/e2e_scam_test"
    async with websockets.connect(uri) as ws:
        resp = await ws.recv()
        session = json.loads(resp)
        print(f"  Session: {session.get('session_id', 'started')}")

        # Normal events (trust should stay high)
        print("\n  --- NORMAL PHASE ---")
        for i in range(3):
            r = await send_event(ws, NORMAL_EVENT)
            p = parse_response(r)
            print(f"  [{i+1}] Trust={p['trust']:.3f} Decision={p['decision']} Cog={p['cognitive']}")
            await asyncio.sleep(0.3)

        # Scam attack (trust should drop, containment should activate)
        print("\n  --- SCAM ATTACK ---")
        blocked = False
        for i in range(5):
            r = await send_event(ws, SCAM_EVENT, tx_amount=200000, is_new_ben=True)
            p = parse_response(r)
            if "error" in p:
                print(f"  [{i+4}] {p['error'].upper()}: {p['reason']}")
                blocked = True
                break
            print(f"  [{i+4}] Trust={p['trust']:.3f} Eff={p['effective']:.3f} Decision={p['decision']} Cog={p['cognitive']} Drift={p['drift']} Security={p['security']}")
            if p["decision"] == "BLOCK":
                print(f"  >>> BLOCKED! Trust dropped below threshold.")
                blocked = True
                break
            await asyncio.sleep(0.3)

        if blocked:
            print("\n  ✓ SCAM DETECTED — Containment activated")
        else:
            print("\n  ✗ SCAM NOT DETECTED — Trust didn't drop enough!")

    return blocked


async def test_malware_scenario():
    print("\n" + "=" * 60)
    print("  E2E TEST: MALWARE SCENARIO")
    print("=" * 60)

    uri = "ws://localhost:8000/ws/e2e_malware_test"
    async with websockets.connect(uri) as ws:
        resp = await ws.recv()
        session = json.loads(resp)
        print(f"  Session: {session.get('session_id', 'started')}")

        # Normal events first
        print("\n  --- NORMAL PHASE ---")
        for i in range(2):
            r = await send_event(ws, NORMAL_EVENT)
            p = parse_response(r)
            print(f"  [{i+1}] Trust={p['trust']:.3f} Decision={p['decision']} Cog={p['cognitive']}")
            await asyncio.sleep(0.3)

        # Malware activation
        print("\n  --- MALWARE ACTIVATED ---")
        blocked = False
        for i in range(4):
            r = await send_event(ws, BOT_EVENT, tx_amount=500000, is_new_ben=True)
            p = parse_response(r)
            if "error" in p:
                print(f"  [Bot {i+1}] {p['error'].upper()}: {p['reason']}")
                blocked = True
                break
            print(f"  [Bot {i+1}] Trust={p['trust']:.3f} Eff={p['effective']:.3f} Decision={p['decision']} Cog={p['cognitive']} Drift={p['drift']} Security={p['security']}")
            if p["decision"] == "BLOCK":
                print(f"  >>> MALWARE BLOCKED! Robotic behavior detected.")
                blocked = True
                break
            await asyncio.sleep(0.3)

        if blocked:
            print("\n  ✓ MALWARE DETECTED — Session terminated")
        else:
            print("\n  ✗ MALWARE NOT DETECTED!")

    return blocked


async def test_normal_stays_safe():
    print("\n" + "=" * 60)
    print("  E2E TEST: NORMAL USER (should stay ALLOW)")
    print("=" * 60)

    uri = "ws://localhost:8000/ws/e2e_normal_test"
    async with websockets.connect(uri) as ws:
        resp = await ws.recv()

        print("\n  --- 10 NORMAL EVENTS ---")
        all_allow = True
        for i in range(10):
            r = await send_event(ws, NORMAL_EVENT)
            p = parse_response(r)
            if p.get("decision") != "ALLOW":
                all_allow = False
            if i % 3 == 0:  # Print every 3rd
                print(f"  [{i+1:>2}] Trust={p['trust']:.3f} Decision={p['decision']} Cog={p['cognitive']}")
            await asyncio.sleep(0.2)

        if all_allow:
            print("\n  ✓ Normal user stays ALLOW — no false positives")
        else:
            print("\n  ✗ FALSE POSITIVE: Normal user got escalated!")

    return all_allow


async def main():
    print()
    print("╔══════════════════════════════════════════════════════════════╗")
    print("║  AEGIS-X END-TO-END VALIDATION                             ║")
    print("║  Testing: Normal → Scam → Malware scenarios                ║")
    print("╚══════════════════════════════════════════════════════════════╝")
    print()

    results = {}

    results["normal_safe"] = await test_normal_stays_safe()
    results["scam_blocked"] = await test_scam_scenario()
    results["malware_blocked"] = await test_malware_scenario()

    print("\n" + "=" * 60)
    print("  FINAL RESULTS")
    print("=" * 60)
    for test_name, passed in results.items():
        status = "✓ PASS" if passed else "✗ FAIL"
        print(f"  {status}  {test_name}")

    all_pass = all(results.values())
    print()
    if all_pass:
        print("  ═══ ALL TESTS PASSED ═══")
    else:
        print("  ═══ SOME TESTS FAILED ═══")
    print()
    return all_pass


if __name__ == "__main__":
    asyncio.run(main())
