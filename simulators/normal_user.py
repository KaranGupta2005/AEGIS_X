"""
Simulates a genuine user browsing and making a small transaction.
Connects via WebSocket and sends behavioral events every 2 seconds.

Expected dashboard result:
    Trust: 0.95-0.99 | State: CALM/FOCUSED | Decision: ALLOW
    Graph: Flat stable trust line
"""

import asyncio
import json
import numpy as np
import websockets


SERVER_URL = "ws://localhost:8000/ws/normal_user_demo"


def generate_normal_event():
    """Generate a calm, natural behavioral event."""
    return {
        "typing_speed_cps": 3.8 + np.random.normal(0, 0.3),
        "typing_rhythm_variance": 38 + np.random.normal(0, 4),
        "typing_pressure_mean": 0.55 + np.random.normal(0, 0.03),
        "swipe_velocity_mean": 1.2 + np.random.normal(0, 0.08),
        "swipe_velocity_variance": 0.14 + np.random.normal(0, 0.02),
        "swipe_straightness": 0.82 + np.random.normal(0, 0.02),
        "touch_duration_mean": 120 + np.random.normal(0, 8),
        "touch_duration_variance": 580 + np.random.normal(0, 40),
        "touch_area_mean": 0.45 + np.random.normal(0, 0.02),
        "hesitation_ratio": max(0, 0.08 + np.random.normal(0, 0.015)),
        "hesitation_count": max(0, int(1 + np.random.normal(0, 0.4))),
        "correction_rate": max(0, 0.04 + np.random.normal(0, 0.008)),
        "scroll_speed_mean": 0.8 + np.random.normal(0, 0.08),
        "gyroscope_variance": max(0.001, 0.015 + np.random.normal(0, 0.002)),
        "session_time_elapsed": 90 + np.random.normal(0, 15),
        "interaction_intensity": max(1, int(8 + np.random.normal(0, 1))),
    }


async def simulate():
    print("=" * 60)
    print("  AEGIS-X SIMULATOR: Normal User")
    print("=" * 60)
    print(f"\n  Connecting to {SERVER_URL}...")

    try:
        async with websockets.connect(SERVER_URL) as ws:
            # Receive session confirmation
            response = await ws.recv()
            session = json.loads(response)
            print(f"  Session started: {session.get('session_id', 'N/A')}")
            print(f"\n  {'Step':<5} {'Trust':<8} {'State':<12} {'Decision'}")
            print(f"  {'─' * 40}")

            for step in range(20):
                event = generate_normal_event()
                message = {
                    "type": "behavioral_event",
                    "event": event,
                    "transaction_amount": 2000 if step > 10 else 0,
                }

                await ws.send(json.dumps(message))
                response = await ws.recv()
                result = json.loads(response)

                ts = result.get("trust_state", result)
                trust = ts.get("trust_score", 0)
                state = ts.get("cognitive_state", "?")
                action = ts.get("action", "?")

                print(f"  {step+1:<5} {trust:<8.4f} {state:<12} {action}")
                await asyncio.sleep(2)

            print("\n  ✓ Normal session complete — all ALLOW")

    except ConnectionRefusedError:
        print("\n  ✗ Cannot connect. Start the server first:")
        print("    uvicorn backend.main:app --reload")
    except Exception as e:
        print(f"\n  ✗ Error: {e}")


if __name__ == "__main__":
    asyncio.run(simulate())
