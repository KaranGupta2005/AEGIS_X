"""Test: Normal-mode spam detection (person rapidly typing/clicking)"""
import asyncio
import json
import websockets


async def test_spam():
    print("=" * 60)
    print("  SPAM DETECTION TEST")
    print("  Scenario: Person spamming keys rapidly in normal mode")
    print("=" * 60)

    # Simulates what the SDK would produce when someone holds down a key
    # or types random characters as fast as possible
    SPAM_EVENT = {
        "typing_speed_cps": 10.5,        # 21 keys in 2 seconds
        "typing_rhythm_variance": 4.0,    # extremely consistent (machine-like)
        "typing_pressure_mean": 0.72,     # harder press from holding key
        "swipe_velocity_mean": 0.5,       # minimal mouse
        "swipe_velocity_variance": 0.02,  # barely moving
        "swipe_straightness": 0.90,       # whatever little movement is straight
        "touch_duration_mean": 45,        # very short key holds
        "touch_duration_variance": 8,     # consistent short holds
        "touch_area_mean": 0.40,
        "hesitation_ratio": 0.0,          # ZERO hesitation (holding key)
        "hesitation_count": 0,
        "correction_rate": 0.0,           # no corrections during spam
        "scroll_speed_mean": 0.0,         # not scrolling
        "gyroscope_variance": 0.008,      # phone on desk
        "session_time_elapsed": 30,
        "interaction_intensity": 22,      # high: all those keystrokes
    }

    # Also test rapid clicking spam
    CLICK_SPAM_EVENT = {
        "typing_speed_cps": 0.5,          # not typing
        "typing_rhythm_variance": 35,     # default
        "typing_pressure_mean": 0.55,
        "swipe_velocity_mean": 3.0,       # very fast mouse
        "swipe_velocity_variance": 0.01,  # consistent speed
        "swipe_straightness": 0.95,       # straight lines (programmatic feel)
        "touch_duration_mean": 30,        # very fast clicks
        "touch_duration_variance": 3,     # uniform
        "touch_area_mean": 0.38,
        "hesitation_ratio": 0.0,
        "hesitation_count": 0,
        "correction_rate": 0.0,
        "scroll_speed_mean": 2.5,         # rapid scrolling
        "gyroscope_variance": 0.002,      # stationary device
        "session_time_elapsed": 15,
        "interaction_intensity": 35,      # VERY high click rate
    }

    uri = "ws://localhost:8000/ws/spam_test_user"
    async with websockets.connect(uri) as ws:
        resp = await ws.recv()  # session start
        print(f"\n  Session started.")

        # Normal warmup (2 events)
        print("\n  --- NORMAL PHASE ---")
        normal = {
            "typing_speed_cps": 3.5, "typing_rhythm_variance": 40,
            "typing_pressure_mean": 0.55, "swipe_velocity_mean": 1.1,
            "swipe_velocity_variance": 0.13, "swipe_straightness": 0.81,
            "touch_duration_mean": 118, "touch_duration_variance": 560,
            "touch_area_mean": 0.44, "hesitation_ratio": 0.09,
            "hesitation_count": 1, "correction_rate": 0.04,
            "scroll_speed_mean": 0.75, "gyroscope_variance": 0.014,
            "session_time_elapsed": 80, "interaction_intensity": 7,
        }
        for i in range(2):
            await ws.send(json.dumps({"type": "behavioral_event", "event": normal}))
            resp = await ws.recv()
            r = json.loads(resp)
            print(f"  [{i+1}] Trust={r['trust_score']:.3f} Decision={r['decision']} Cog={r['cognitive_state']}")
            await asyncio.sleep(0.3)

        # Key spam attack
        print("\n  --- KEY SPAM (rapid typing) ---")
        for i in range(4):
            await ws.send(json.dumps({"type": "behavioral_event", "event": SPAM_EVENT}))
            resp = await ws.recv()
            r = json.loads(resp)
            if r.get("error") == "session_blocked":
                print(f"  [Spam {i+1}] SESSION BLOCKED")
                break
            print(f"  [Spam {i+1}] Trust={r['trust_score']:.3f} Decision={r['decision']} Cog={r['cognitive_state']}")
            if r["decision"] == "BLOCK":
                print(f"  >>> KEY SPAM DETECTED AND BLOCKED!")
                break
            await asyncio.sleep(0.3)

    # Click spam test (separate session)
    print("\n  --- CLICK SPAM TEST ---")
    uri2 = "ws://localhost:8000/ws/click_spam_user"
    async with websockets.connect(uri2) as ws:
        resp = await ws.recv()

        # Normal warmup
        for i in range(2):
            await ws.send(json.dumps({"type": "behavioral_event", "event": normal}))
            resp = await ws.recv()
            await asyncio.sleep(0.2)
        print("  Normal warmup done.")

        # Click spam
        for i in range(4):
            await ws.send(json.dumps({"type": "behavioral_event", "event": CLICK_SPAM_EVENT}))
            resp = await ws.recv()
            r = json.loads(resp)
            if r.get("error") == "session_blocked":
                print(f"  [Click {i+1}] SESSION BLOCKED")
                break
            print(f"  [Click {i+1}] Trust={r['trust_score']:.3f} Decision={r['decision']} Cog={r['cognitive_state']}")
            if r["decision"] == "BLOCK":
                print(f"  >>> CLICK SPAM DETECTED AND BLOCKED!")
                break
            await asyncio.sleep(0.3)

    print("\n" + "=" * 60)
    print("  SPAM DETECTION TEST COMPLETE")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(test_spam())
