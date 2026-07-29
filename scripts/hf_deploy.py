"""Upload AEGIS-X models to Hugging Face for deployment."""
import os
import sys
from pathlib import Path
from huggingface_hub import HfApi, create_repo

TOKEN = os.environ.get("HF_TOKEN", "")
REPO_ID = "guptakaran2026/aegisx-models"
BASE_DIR = Path(__file__).parent.parent

def main():
    if not TOKEN:
        print("ERROR: Set HF_TOKEN environment variable")
        sys.exit(1)
    
    api = HfApi(token=TOKEN)
    info = api.whoami()
    print(f"Logged in as: {info['name']}")
    
    # Create model repo (or use existing)
    try:
        create_repo(REPO_ID, token=TOKEN, repo_type="model", exist_ok=True)
        print(f"Repo ready: {REPO_ID}")
    except Exception as e:
        print(f"Repo exists or error: {e}")
    
    # Files to upload
    uploads = [
        # Cognitive models
        ("models/cognitive/cognitive_hgb.pkl", "models/cognitive/cognitive_hgb.pkl"),
        ("models/cognitive/cognitive_model_meta.json", "models/cognitive/cognitive_model_meta.json"),
        # Anomaly model
        ("models/classifiers/isolation_forest.pkl", "models/classifiers/isolation_forest.pkl"),
        # InsightFace
        ("models/insightface/models/buffalo_l.zip", "models/insightface/models/buffalo_l.zip"),
        # MediaPipe
        ("models/mediapipe/face_landmarker.task", "models/mediapipe/face_landmarker.task"),
        # SpeechBrain
        ("models/speechbrain_ecapa/classifier.ckpt", "models/speechbrain_ecapa/classifier.ckpt"),
        ("models/speechbrain_ecapa/embedding_model.ckpt", "models/speechbrain_ecapa/embedding_model.ckpt"),
        ("models/speechbrain_ecapa/hyperparams.yaml", "models/speechbrain_ecapa/hyperparams.yaml"),
        ("models/speechbrain_ecapa/label_encoder.ckpt", "models/speechbrain_ecapa/label_encoder.ckpt"),
        ("models/speechbrain_ecapa/label_encoder.txt", "models/speechbrain_ecapa/label_encoder.txt"),
        ("models/speechbrain_ecapa/mean_var_norm_emb.ckpt", "models/speechbrain_ecapa/mean_var_norm_emb.ckpt"),
    ]
    
    for local_path, hf_path in uploads:
        full_path = BASE_DIR / local_path
        if not full_path.exists():
            print(f"  SKIP (not found): {local_path}")
            continue
        size_mb = full_path.stat().st_size / 1024 / 1024
        print(f"  Uploading: {local_path} ({size_mb:.1f} MB)...")
        try:
            api.upload_file(
                path_or_fileobj=str(full_path),
                path_in_repo=hf_path,
                repo_id=REPO_ID,
                repo_type="model",
                token=TOKEN,
            )
            print(f"  ✓ {hf_path}")
        except Exception as e:
            print(f"  ✗ Failed: {e}")
    
    print()
    print(f"All models uploaded to: https://huggingface.co/{REPO_ID}")
    print("Backend can now download these on startup.")


if __name__ == "__main__":
    main()
