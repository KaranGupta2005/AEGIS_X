"""
Provider Benchmark & Health Check
===================================
Run: python scripts/benchmark_providers.py

Tests each provider with synthetic data and reports:
- Latency (p50, p95, p99)
- Accuracy expectations
- Error handling
- Fallback behavior
"""

import sys
import os
import time
import numpy as np

os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.getcwd())


def generate_synthetic_wav(duration_s: float = 2.0, sample_rate: int = 16000) -> bytes:
    """Generate synthetic WAV audio for testing."""
    import io
    import struct

    num_samples = int(duration_s * sample_rate)
    # Generate sine wave at 440Hz + noise (simulates speech-like signal)
    t = np.linspace(0, duration_s, num_samples)
    signal = (np.sin(2 * np.pi * 440 * t) * 0.5 + np.random.randn(num_samples) * 0.1)
    signal = (signal * 32767).astype(np.int16)

    # Write WAV header + data
    buffer = io.BytesIO()
    data_size = num_samples * 2  # 16-bit samples
    buffer.write(b"RIFF")
    buffer.write(struct.pack("<I", 36 + data_size))
    buffer.write(b"WAVE")
    buffer.write(b"fmt ")
    buffer.write(struct.pack("<I", 16))  # Subchunk1Size
    buffer.write(struct.pack("<H", 1))   # PCM
    buffer.write(struct.pack("<H", 1))   # Mono
    buffer.write(struct.pack("<I", sample_rate))
    buffer.write(struct.pack("<I", sample_rate * 2))
    buffer.write(struct.pack("<H", 2))   # BlockAlign
    buffer.write(struct.pack("<H", 16))  # BitsPerSample
    buffer.write(b"data")
    buffer.write(struct.pack("<I", data_size))
    buffer.write(signal.tobytes())
    return buffer.getvalue()


def generate_synthetic_image(width: int = 640, height: int = 480) -> bytes:
    """Generate synthetic image for testing."""
    import cv2
    # Create a simple face-like pattern (circle on gradient background)
    img = np.zeros((height, width, 3), dtype=np.uint8)
    # Gradient background
    for y in range(height):
        img[y, :] = [50 + y // 4, 80 + y // 5, 100 + y // 6]
    # Face-like circle
    cv2.circle(img, (width // 2, height // 2), 100, (200, 180, 160), -1)
    # Eyes
    cv2.circle(img, (width // 2 - 30, height // 2 - 20), 10, (50, 50, 50), -1)
    cv2.circle(img, (width // 2 + 30, height // 2 - 20), 10, (50, 50, 50), -1)
    # Mouth
    cv2.ellipse(img, (width // 2, height // 2 + 30), (25, 10), 0, 0, 180, (100, 50, 50), 2)

    _, buffer = cv2.imencode(".jpg", img)
    return buffer.tobytes()


def benchmark_provider(name: str, func, iterations: int = 5):
    """Run a provider function multiple times and report latency stats."""
    latencies = []
    errors = 0

    for i in range(iterations):
        t_start = time.perf_counter()
        try:
            result = func()
            latencies.append((time.perf_counter() - t_start) * 1000)
        except Exception as e:
            errors += 1
            latencies.append((time.perf_counter() - t_start) * 1000)

    if latencies:
        p50 = np.percentile(latencies, 50)
        p95 = np.percentile(latencies, 95)
        p99 = np.percentile(latencies, 99)
        print(f"  {name}:")
        print(f"    p50={p50:.0f}ms  p95={p95:.0f}ms  p99={p99:.0f}ms  errors={errors}/{iterations}")
    return latencies


def main():
    print("=" * 60)
    print("  AEGIS-X Provider Benchmark")
    print("=" * 60)

    audio = generate_synthetic_wav()
    try:
        image = generate_synthetic_image()
    except ImportError:
        print("  ⚠ OpenCV not available — skipping image-based benchmarks")
        image = b"\x00" * 1000

    enrolled_voice = np.random.randn(192).astype(np.float32)
    enrolled_voice /= np.linalg.norm(enrolled_voice)
    enrolled_face = np.random.randn(512).astype(np.float32)
    enrolled_face /= np.linalg.norm(enrolled_face)

    print("\n── Voice Verification ──────────────────────────────────────")
    try:
        from backend.services.providers.speechbrain_provider import SpeechBrainVoiceProvider
        prov = SpeechBrainVoiceProvider()
        benchmark_provider("SpeechBrain ECAPA-TDNN", lambda: prov.verify_speaker(audio, enrolled_voice))
    except Exception as e:
        print(f"  ✗ SpeechBrain not available: {e}")
        from backend.services.providers.mock_providers import MockVoiceVerificationProvider
        prov = MockVoiceVerificationProvider()
        benchmark_provider("Mock Voice", lambda: prov.verify_speaker(audio, enrolled_voice))

    print("\n── Face Verification ───────────────────────────────────────")
    try:
        from backend.services.providers.insightface_provider import InsightFaceVerificationProvider
        prov = InsightFaceVerificationProvider()
        benchmark_provider("InsightFace buffalo_l", lambda: prov.verify_face(image, enrolled_face))
    except Exception as e:
        print(f"  ✗ InsightFace not available: {e}")
        from backend.services.providers.mock_providers import MockFaceVerificationProvider
        prov = MockFaceVerificationProvider()
        benchmark_provider("Mock Face", lambda: prov.verify_face(image, enrolled_face))

    print("\n── Liveness Detection ──────────────────────────────────────")
    try:
        from backend.services.providers.mediapipe_provider import MediaPipeLivenessProvider
        prov = MediaPipeLivenessProvider()
        benchmark_provider("MediaPipe Liveness", lambda: prov.check_liveness(image, ["blink", "smile"], ["blink", "smile"]))
    except Exception as e:
        print(f"  ✗ MediaPipe not available: {e}")
        from backend.services.providers.mock_providers import MockLivenessProvider
        prov = MockLivenessProvider()
        benchmark_provider("Mock Liveness", lambda: prov.check_liveness(image, ["blink", "smile"], ["blink", "smile"]))

    print("\n── Replay Detection ────────────────────────────────────────")
    try:
        from backend.services.providers.speechbrain_provider import SpeechBrainVoiceProvider
        prov = SpeechBrainVoiceProvider()
        is_replay = prov.detect_replay(audio)
        print(f"  Replay detected: {is_replay}")
    except Exception:
        print("  Using mock replay detection")

    print("\n" + "=" * 60)
    print("  Benchmark complete.")
    print("=" * 60)


if __name__ == "__main__":
    main()
