"""
AEGIS-X Embedding Engine (ONNX Runtime — Memory Efficient)
============================================================
Converts behavioral text descriptions into 384-dimensional semantic embeddings
using all-MiniLM-L6-v2 via ONNX Runtime (no PyTorch dependency).

Memory: ~150MB total (vs ~2GB with full PyTorch + sentence-transformers)
Latency: ~15-30ms per embedding (comparable to PyTorch on CPU)
"""

import os
import numpy as np
from pathlib import Path
from typing import List, Optional

# Lazy imports to minimize startup memory
_ort_session = None
_tokenizer = None
_MODEL_DIR = Path(__file__).parent.parent.parent / "models" / "minilm_onnx"


def _ensure_model():
    """Download and cache the ONNX model on first use."""
    global _ort_session, _tokenizer

    if _ort_session is not None:
        return

    _MODEL_DIR.mkdir(parents=True, exist_ok=True)
    onnx_path = _MODEL_DIR / "model.onnx"
    tokenizer_path = _MODEL_DIR / "tokenizer.json"

    # Download from HuggingFace if not cached locally
    if not onnx_path.exists() or not tokenizer_path.exists():
        print("[AEGIS-X] Downloading MiniLM ONNX model...")
        try:
            from huggingface_hub import hf_hub_download
            hf_hub_download(
                repo_id="sentence-transformers/all-MiniLM-L6-v2",
                filename="onnx/model.onnx",
                local_dir=str(_MODEL_DIR),
                local_dir_use_symlinks=False,
            )
            # Move from nested path
            nested = _MODEL_DIR / "onnx" / "model.onnx"
            if nested.exists():
                import shutil
                shutil.move(str(nested), str(onnx_path))
                (nested.parent).rmdir()
        except Exception as e:
            print(f"[AEGIS-X] ONNX download failed: {e}")
            # Fallback: try optimum export
            pass

        if not tokenizer_path.exists():
            try:
                from huggingface_hub import hf_hub_download
                hf_hub_download(
                    repo_id="sentence-transformers/all-MiniLM-L6-v2",
                    filename="tokenizer.json",
                    local_dir=str(_MODEL_DIR),
                    local_dir_use_symlinks=False,
                )
            except Exception:
                pass

    # Load ONNX model
    if onnx_path.exists():
        import onnxruntime as ort
        _ort_session = ort.InferenceSession(
            str(onnx_path),
            providers=['CPUExecutionProvider'],
            sess_options=_get_session_options(),
        )
        print(f"[AEGIS-X] ✓ MiniLM ONNX loaded ({onnx_path.stat().st_size / 1024 / 1024:.1f} MB)")
    else:
        print("[AEGIS-X] WARNING: ONNX model not found — using hash fallback")

    # Load tokenizer
    if tokenizer_path.exists():
        from tokenizers import Tokenizer
        _tokenizer = Tokenizer.from_file(str(tokenizer_path))
    else:
        # Try loading from HF cache
        try:
            from tokenizers import Tokenizer
            from huggingface_hub import hf_hub_download
            tok_path = hf_hub_download(
                repo_id="sentence-transformers/all-MiniLM-L6-v2",
                filename="tokenizer.json",
            )
            _tokenizer = Tokenizer.from_file(tok_path)
        except Exception:
            print("[AEGIS-X] WARNING: Tokenizer not found — using hash fallback")


def _get_session_options():
    """Optimized ONNX session for low memory."""
    import onnxruntime as ort
    opts = ort.SessionOptions()
    opts.intra_op_num_threads = 1
    opts.inter_op_num_threads = 1
    opts.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
    opts.enable_mem_pattern = True
    opts.enable_cpu_mem_arena = False  # Reduce peak memory
    return opts


def _mean_pooling(token_embeddings: np.ndarray, attention_mask: np.ndarray) -> np.ndarray:
    """Mean pooling — same as sentence-transformers default."""
    mask_expanded = np.expand_dims(attention_mask, -1).astype(np.float32)
    sum_embeddings = np.sum(token_embeddings * mask_expanded, axis=1)
    sum_mask = np.clip(mask_expanded.sum(axis=1), a_min=1e-9, a_max=None)
    return sum_embeddings / sum_mask


def _hash_embedding(text: str) -> np.ndarray:
    """
    Deterministic hash-based 384-dim embedding fallback.
    NOT semantic — but deterministic and consistent for same input.
    Used only when ONNX model is unavailable.
    """
    import hashlib
    # Create multiple hashes for 384 dimensions
    embedding = np.zeros(384, dtype=np.float32)
    for i in range(12):
        h = hashlib.sha256(f"{text}_{i}".encode()).digest()
        for j in range(32):
            embedding[i * 32 + j] = (h[j] - 128) / 128.0
    # L2 normalize
    norm = np.linalg.norm(embedding)
    if norm > 0:
        embedding /= norm
    return embedding


class EmbeddingService:
    """
    Generates 384-dimensional behavioral embeddings.
    Uses ONNX Runtime for memory efficiency (~150MB vs 2GB PyTorch).
    Falls back to hash-based embedding if model unavailable.
    """

    _instance: Optional["EmbeddingService"] = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        # Lazy load on first use
        pass

    def generate_embedding(self, text: str) -> np.ndarray:
        """Generate a single 384-dim embedding from behavioral text."""
        _ensure_model()

        if _ort_session is None or _tokenizer is None:
            return _hash_embedding(text)

        # Tokenize
        encoded = _tokenizer.encode(text)
        input_ids = np.array([encoded.ids], dtype=np.int64)
        attention_mask = np.array([encoded.attention_mask], dtype=np.int64)
        token_type_ids = np.zeros_like(input_ids, dtype=np.int64)

        # Truncate to max 128 tokens (MiniLM max is 256, but 128 is enough)
        max_len = 128
        input_ids = input_ids[:, :max_len]
        attention_mask = attention_mask[:, :max_len]
        token_type_ids = token_type_ids[:, :max_len]

        # Run ONNX inference
        outputs = _ort_session.run(
            None,
            {
                "input_ids": input_ids,
                "attention_mask": attention_mask,
                "token_type_ids": token_type_ids,
            },
        )

        # outputs[0] = token embeddings (1, seq_len, 384)
        token_embeddings = outputs[0]
        embedding = _mean_pooling(token_embeddings, attention_mask.astype(np.float32))

        # L2 normalize
        norm = np.linalg.norm(embedding[0])
        if norm > 0:
            embedding = embedding[0] / norm
        else:
            embedding = embedding[0]

        return embedding.astype(np.float32)

    def generate_embeddings_batch(self, texts: List[str]) -> np.ndarray:
        """Generate embeddings for multiple texts."""
        return np.array([self.generate_embedding(t) for t in texts])
