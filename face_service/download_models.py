"""Download InsightFace + MediaPipe models during BUILD."""
from huggingface_hub import hf_hub_download
from pathlib import Path
import zipfile, shutil

REPO = "guptakaran2026/aegisx-models"
BASE = Path(__file__).parent

# Download InsightFace buffalo_l zip
print("[BUILD] Downloading InsightFace buffalo_l from HuggingFace...")
models_dir = BASE / "models" / "insightface" / "models"
models_dir.mkdir(parents=True, exist_ok=True)
buffalo_dir = models_dir / "buffalo_l"

if buffalo_dir.exists() and any(buffalo_dir.iterdir()):
    print("  ✓ buffalo_l already extracted (cached)")
else:
    zip_path = models_dir / "buffalo_l.zip"
    if not zip_path.exists():
        try:
            hf_hub_download(
                repo_id=REPO,
                filename="models/insightface/models/buffalo_l.zip",
                local_dir=str(BASE),
                local_dir_use_symlinks=False,
            )
            # Move to correct location
            actual = BASE / "models" / "insightface" / "models" / "buffalo_l.zip"
            if actual.exists():
                zip_path = actual
            print(f"  ✓ buffalo_l.zip downloaded")
        except Exception as e:
            print(f"  ✗ Download failed: {e}")
            print("  → InsightFace will download from GitHub at first use")
    
    if zip_path.exists():
        print("  Extracting buffalo_l.zip...")
        try:
            with zipfile.ZipFile(str(zip_path), 'r') as zf:
                zf.extractall(str(models_dir))
            print("  ✓ Extracted")
        except Exception as e:
            print(f"  ✗ Extract failed: {e}")

# Download MediaPipe face_landmarker
print("[BUILD] Downloading MediaPipe model...")
mp_dir = BASE / "models" / "mediapipe"
mp_dir.mkdir(parents=True, exist_ok=True)
mp_model = mp_dir / "face_landmarker.task"
if mp_model.exists():
    print("  ✓ face_landmarker.task (cached)")
else:
    try:
        hf_hub_download(
            repo_id=REPO,
            filename="models/mediapipe/face_landmarker.task",
            local_dir=str(BASE),
            local_dir_use_symlinks=False,
        )
        print("  ✓ face_landmarker.task downloaded")
    except Exception as e:
        print(f"  ✗ MediaPipe download failed: {e}")

# Pre-warm InsightFace (downloads remaining ONNX models if needed)
print("[BUILD] Pre-warming InsightFace...")
try:
    from insightface.app import FaceAnalysis
    root = str(BASE / "models" / "insightface")
    fa = FaceAnalysis(name="buffalo_l", root=root, providers=["CPUExecutionProvider"])
    fa.prepare(ctx_id=0, det_size=(160, 160))  # Small size for build
    print("[BUILD] ✓ InsightFace pre-warmed")
    del fa
except Exception as e:
    print(f"[BUILD] ⚠ InsightFace pre-warm failed (will auto-download at runtime): {e}")

print("[BUILD] Face service models ready.")
