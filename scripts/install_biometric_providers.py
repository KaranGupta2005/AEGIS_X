"""
Install & Validate Biometric AI Providers
==========================================
Run: python scripts/install_biometric_providers.py

This script:
1. Installs required packages
2. Downloads ML models (first run only)
3. Validates each provider can load
4. Runs basic health checks
5. Reports compatibility status
"""

import subprocess
import sys
import os
import time

os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

REQUIREMENTS_FILE = "requirements-biometric.txt"


def run_cmd(cmd: str, desc: str) -> bool:
    print(f"\n{'─' * 60}")
    print(f"  {desc}")
    print(f"{'─' * 60}")
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"  ✗ FAILED: {result.stderr[:200]}")
        return False
    print(f"  ✓ SUCCESS")
    return True


def check_import(module: str, desc: str) -> bool:
    try:
        __import__(module)
        print(f"  ✓ {desc}: available")
        return True
    except ImportError:
        print(f"  ✗ {desc}: NOT INSTALLED")
        return False


def main():
    print("=" * 60)
    print("  AEGIS-X Biometric Provider Installation")
    print("=" * 60)

    # Step 1: Install requirements
    print("\n[1/4] Installing dependencies...")
    run_cmd(
        f"{sys.executable} -m pip install -r {REQUIREMENTS_FILE} --quiet",
        "Installing biometric ML packages"
    )

    # Step 2: Validate imports
    print("\n[2/4] Validating package imports...")
    results = {}
    results["torch"] = check_import("torch", "PyTorch")
    results["torchaudio"] = check_import("torchaudio", "TorchAudio")
    results["speechbrain"] = check_import("speechbrain", "SpeechBrain")
    results["insightface"] = check_import("insightface", "InsightFace")
    results["mediapipe"] = check_import("mediapipe", "MediaPipe")
    results["cv2"] = check_import("cv2", "OpenCV")
    results["onnxruntime"] = check_import("onnxruntime", "ONNX Runtime")
    results["numpy"] = check_import("numpy", "NumPy")
    results["scipy"] = check_import("scipy", "SciPy")
    results["librosa"] = check_import("librosa", "Librosa")
    results["soundfile"] = check_import("soundfile", "SoundFile")

    # Step 3: Load providers
    print("\n[3/4] Loading AI providers (models will download on first run)...")

    voice_ok = False
    face_ok = False
    liveness_ok = False

    try:
        from backend.services.providers.speechbrain_provider import SpeechBrainVoiceProvider
        provider = SpeechBrainVoiceProvider()
        print(f"  ✓ SpeechBrain ECAPA-TDNN: {provider.provider_name}")
        voice_ok = True
    except Exception as e:
        print(f"  ✗ SpeechBrain: {e}")

    try:
        from backend.services.providers.insightface_provider import InsightFaceVerificationProvider
        provider = InsightFaceVerificationProvider()
        print(f"  ✓ InsightFace buffalo_l: {provider.provider_name}")
        face_ok = True
    except Exception as e:
        print(f"  ✗ InsightFace: {e}")

    try:
        from backend.services.providers.mediapipe_provider import MediaPipeLivenessProvider
        provider = MediaPipeLivenessProvider()
        print(f"  ✓ MediaPipe Face Mesh: {provider.provider_name}")
        liveness_ok = True
    except Exception as e:
        print(f"  ✗ MediaPipe: {e}")

    # Step 4: Summary
    print("\n" + "=" * 60)
    print("  INSTALLATION SUMMARY")
    print("=" * 60)
    total = sum(results.values())
    print(f"\n  Packages: {total}/{len(results)} installed")
    print(f"  Voice Provider (SpeechBrain):  {'✓ READY' if voice_ok else '✗ NOT READY'}")
    print(f"  Face Provider (InsightFace):   {'✓ READY' if face_ok else '✗ NOT READY'}")
    print(f"  Liveness Provider (MediaPipe): {'✓ READY' if liveness_ok else '✗ NOT READY'}")

    all_ok = voice_ok and face_ok and liveness_ok
    print(f"\n  Overall: {'✓ ALL PROVIDERS READY' if all_ok else '⚠ SOME PROVIDERS UNAVAILABLE (mocks will be used)'}")
    print(f"\n  Note: Mock providers are always available as fallback.")
    print("=" * 60)

    return 0 if all_ok else 1


if __name__ == "__main__":
    sys.exit(main())
