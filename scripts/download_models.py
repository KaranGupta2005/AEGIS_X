"""Download all required models from HuggingFace for production deployment."""
import os
import shutil
from pathlib import Path
from huggingface_hub import hf_hub_download, snapshot_download

REPO_ID = "guptakaran2026/aegisx-models"
BASE_DIR = Path(__file__).parent.parent
MODELS_DIR = BASE_DIR / "models"


def main():
    print("=" * 60)
    print("  AEGIS-X: Downloading models from HuggingFace")
    print("=" * 60)

    files_to_download = [
        ("models/cognitive/cognitive_hgb.pkl", "models/cognitive"),
        ("models/cognitive/cognitive_model_meta.json", "models/cognitive"),
        ("models/classifiers/isolation_forest.pkl", "models/classifiers"),
        ("models/insightface/models/buffalo_l.zip", "models/insightface/models"),
        ("models/mediapipe/face_landmarker.task", "models/mediapipe"),
        ("models/speechbrain_ecapa/classifier.ckpt", "models/speechbrain_ecapa"),
        ("models/speechbrain_ecapa/embedding_model.ckpt", "models/speechbrain_ecapa"),
        ("models/speechbrain_ecapa/hyperparams.yaml", "models/speechbrain_ecapa"),
        ("models/speechbrain_ecapa/label_encoder.ckpt", "models/speechbrain_ecapa"),
        ("models/speechbrain_ecapa/label_encoder.txt", "models/speechbrain_ecapa"),
        ("models/speechbrain_ecapa/mean_var_norm_emb.ckpt", "models/speechbrain_ecapa"),
    ]

    for hf_path, local_dir in files_to_download:
        local_full = MODELS_DIR / Path(hf_path).relative_to("models")
        if local_full.exists():
            print(f"  ✓ Already exists: {hf_path}")
            continue

        print(f"  Downloading: {hf_path}...")
        local_full.parent.mkdir(parents=True, exist_ok=True)
        try:
            downloaded = hf_hub_download(
                repo_id=REPO_ID,
                filename=hf_path,
                local_dir=str(BASE_DIR),
                local_dir_use_symlinks=False,
            )
            print(f"  ✓ {hf_path}")
        except Exception as e:
            print(f"  ✗ Failed: {e}")

    # Unzip insightface if needed
    zip_path = MODELS_DIR / "insightface" / "models" / "buffalo_l.zip"
    extract_dir = MODELS_DIR / "insightface" / "models" / "buffalo_l"
    if zip_path.exists() and not extract_dir.exists():
        print("  Extracting insightface buffalo_l.zip...")
        import zipfile
        with zipfile.ZipFile(str(zip_path), 'r') as zf:
            zf.extractall(str(extract_dir.parent))
        print("  ✓ Extracted")

    print()
    print("  All models ready!")
    print("=" * 60)


if __name__ == "__main__":
    main()
