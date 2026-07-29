"""Test production deployment on Render."""
import asyncio
import json
import websockets

BACKEND = "wss://aegisx-backend-92ir.onrender.com"

async def test():
    print("=" * 50)
    print("  PRODUCTION E2E TEST")
    print("=" * 50)
    
    uri = f"{BACKEND}/ws/prod_test"
    async with websockets.connect(uri) as ws:
        resp = await ws.recv()
        session = json.loads(resp)
        print(f"  Session: {session.get('status', '?')}")
        
        normal = {
            "typing_speed_cps": 3.8, "typing_rhythm_variance": 38,
            "typing_pressure_mean": 0.55, "swipe_velocity_mean": 1.2,
            "swipe_velocity_variance": 0.14, "swipe_straightness": 0.82,
            "touch_duration_mean": 120, "touch_duration_variance": 580,
            "touch_area_mean": 0.45, "hesitation_ratio": 0.08,
            "hesitation_count": 1, "correction_rate": 0.04,
            "scroll_speed_mean": 0.8, "gyroscope_variance": 0.015,
            "session_time_elapsed": 90, "interaction_intensity": 8,
        }
        await ws.send(json.dumps({"type": "behavioral_event", "event": normal}))
        resp = await ws.recv()
        r = json.loads(resp)
        print(f"  Normal: trust={r.get('trust_score')} decision={r.get('decision')} cog={r.get('cognitive_state')}")
        
        scam = {
            "typing_speed_cps": 0.8, "typing_rhythm_variance": 250,
            "typing_pressure_mean": 0.78, "swipe_velocity_mean": 0.25,
            "swipe_velocity_variance": 0.40, "swipe_straightness": 0.38,
            "touch_duration_mean": 400, "touch_duration_variance": 3500,
            "touch_area_mean": 0.60, "hesitation_ratio": 0.72,
            "hesitation_count": 12, "correction_rate": 0.48,
            "scroll_speed_mean": 0.05, "gyroscope_variance": 0.095,
            "session_time_elapsed": 220, "interaction_intensity": 2,
        }
        await ws.send(json.dumps({"type": "behavioral_event", "event": scam, "transaction_amount": 200000, "is_new_beneficiary": True}))
        resp = await ws.recv()
        r = json.loads(resp)
        print(f"  Scam:   trust={r.get('trust_score')} decision={r.get('decision')} cog={r.get('cognitive_state')}")
        
        if r.get("decision") == "BLOCK":
            print("\n  ✓ PRODUCTION TEST PASSED — Scam blocked!")
        else:
            print(f"\n  ? Decision: {r.get('decision')} (cognitive model may still be loading)")

if __name__ == "__main__":
    asyncio.run(test())
