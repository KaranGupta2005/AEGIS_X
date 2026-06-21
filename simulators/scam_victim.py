"""
Simulates a user receiving a fraudulent phone call and being coerced
into transferring ₹2,00,000 to an unknown account.

Behavioral progression:
    Starts normal → receives call → becomes distressed → panics → coerced
"""

import asyncio
import json
import numpy as np
import websockets


SERVER_URL = "ws://localhost:8000/ws/scam_victim_demo"


def generate_normal_event():
    """Calm behavior before scam call."""
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
        "session_time_elapsed": 60,
        "interaction_intensity": max(1, int(8 + np.random.normal(0, 1))),
    }


def generate_coercion_event(stress: float):
    """Progressively stressed behavior as scam call continues."""
    return {
        "typing_speed_cps": max(0.5, 1.5 - stress * 0.6),
        "typing_rhythm_variance": 55 + stress * 200,
        "typing_pressure_mean": 0.68 + stress * 0.2,
        "swipe_velocity_mean": max(0.1, 0.5 - stress * 0.3),
        "swipe_velocity_variance": 0.2 + stress * 0.35,
        "swipe_straightness": max(0.3, 0.68 - stress * 0.25),
        "touch_duration_mean": 180 + stress * 160,
        "touch_duration_variance": 800 + stress * 3500,
        "touch_area_mean": 0.52 + stress * 0.14,
        "hesitation_ratio": min(0.9, 0.3 + stress * 0.5),
        "hesitation_count": int(4 + stress * 8),
        "correction_rate": min(0.6, 0.15 + stress * 0.4),
        "scroll_speed_mean": max(0.05, 0.3 - stress * 0.2),
        "gyroscope_variance": 0.025 + stress * 0.065,
        "session_time_elapsed": 200 + stress * 250,
        "interaction_intensity": max(1, int(4 - stress * 2)),
    }


async def simulate():
    print("=" * 60)
    print("  AEGIS-X SIMULATOR: Scam Call Victim")
    print("=" * 60)
    print(f"\n  Connecting to {SERVER_URL}...")

    try:
        async with websockets.connect(SERVER_URL) as ws:
            response = await ws.recv()
            session = json.loads(response)
            print(f"  Session started: {session.get('session_id', 'N/A')}")
            print(f"\n  {'Step':<5} {'Trust':<8} {'State':<12} {'Decision':<9} {'Phase'}")
            print(f"  {'─' * 55}")

            # Phase 1: Normal behavior (5 steps)
            for step in range(5):
                message = {
                    "type": "behavioral_event",
                    "event": generate_normal_event(),
                    "transaction_amount": 0,
                }
                await ws.send(json.dumps(message))
                response = await ws.recv()
                result = json.loads(response)

                ts = result.get("trust_state", result)
                print(f"  {step+1:<5} {ts.get('trust_score', 0):<8.4f} "
                      f"{ts.get('cognitive_state', '?'):<12} "
                      f"{ts.get('action', '?'):<9} Normal browsing")
                await asyncio.sleep(2)

            print(f"\n  📞 SCAM CALL RECEIVED — Victim being coerced...\n")

            # Phase 2: Escalating coercion (10 steps)
            for step in range(10):
                stress = (step + 1) / 10.0
                message = {
                    "type": "behavioral_event",
                    "event": generate_coercion_event(stress),
                    "transaction_amount": 200000,
                    "is_new_beneficiary": True,
                }
                await ws.send(json.dumps(message))
                response = await ws.recv()
                result = json.loads(response)

                # Handle blocked session response
                if result.get("error") == "session_blocked":
                    print(f"  {step+6:<5} {'─────':<8} {'BLOCKED':<12} "
                          f"{'BLOCK':<9} Session terminated")
                    break

                ts = result.get("trust_state", result)
                print(f"  {step+6:<5} {ts.get('trust_score', 0):<8.4f} "
                      f"{ts.get('cognitive_state', '?'):<12} "
                      f"{ts.get('action', '?'):<9} Stress={stress:.0%}")

                if ts.get("action") == "BLOCK":
                    print(f"\n  🚨 SESSION BLOCKED — Fraud prevented!")
                    break

                await asyncio.sleep(2)

            print("\n  ✓ Scam simulation complete — attack detected and blocked")

    except ConnectionRefusedError:
        print("\n  ✗ Cannot connect. Start the server first:")
        print("    uvicorn backend.main:app --reload")
    except Exception as e:
        print(f"\n  ✗ Error: {e}")


if __name__ == "__main__":
    asyncio.run(simulate())
