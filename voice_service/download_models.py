"""Download SpeechBrain models during BUILD."""
from huggingface_hub import hf_hub_download
from pathlib import Path

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
for f in FILES:
    local = BASE / Path(f).relative_to("models/../").parent.name / Path(f).name
    # Simpler: download to correct structure
    hf_hub_download(repo_id=REPO, filename=f, local_dir=str(BASE), local_dir_use_symlinks=False)
    print(f"  ✓ {f}")
print("Voice models ready.")
