"""Download SpeechBrain models during BUILD."""
from huggingface_hub import hf_hub_download
from pathlib import Path
import shutil

REPO = "guptakaran2026/aegisx-models"
BASE = Path(__file__).parent

FILES = [
    "models/speechbrain_ecapa/classifier.ckpt",
    "models/speechbrain_ecapa/embedding_model.ckpt",
    "models/speechbrain_ecapa/hyperparams.yaml",
    "models/speechbrain_ecapa/label_encoder.ckpt",
    "models/speechbrain_ecapa/label_encoder.txt",
    "models/speechbrain_ecapa/mean_var_norm_emb.ckpt",
]

print("[BUILD] Downloading SpeechBrain models from HuggingFace...")
for f in FILES:
    dest = BASE / "models" / "speechbrain_ecapa" / Path(f).name
    if dest.exists():
        print(f"  ✓ {Path(f).name} (cached)")
        continue
    dest.parent.mkdir(parents=True, exist_ok=True)
    try:
        downloaded = hf_hub_download(repo_id=REPO, filename=f, local_dir=str(BASE), local_dir_use_symlinks=False)
        # Move to correct location if needed
        actual = BASE / f
        if actual.exists() and not dest.exists():
            shutil.copy2(str(actual), str(dest))
        print(f"  ✓ {Path(f).name}")
    except Exception as e:
        print(f"  ✗ {Path(f).name}: {e}")

# Also pre-download the sentence-transformers tokenizer (used indirectly by SpeechBrain)
print("[BUILD] Pre-warming SpeechBrain model load...")
try:
    from speechbrain.inference.speaker import EncoderClassifier
    model_dir = BASE / "models" / "speechbrain_ecapa"
    if (model_dir / "embedding_model.ckpt").exists():
        m = EncoderClassifier.from_hparams(
            source=str(model_dir), savedir=str(model_dir / "cache"),
            run_opts={"device": "cpu"},
        )
        print("[BUILD] ✓ SpeechBrain model pre-warmed successfully")
        del m
    else:
        print("[BUILD] ⚠ Model files not found after download")
except Exception as e:
    print(f"[BUILD] ⚠ Pre-warm failed (will work at runtime): {e}")

print("[BUILD] Voice service models ready.")
