"""
AEGIS-X Embedding Engine
====================================
Converts behavioral text descriptions into 384-dimensional semantic embeddings
using sentence-transformers/all-MiniLM-L6-v2.
"""

import numpy as np
from typing import List, Optional
from sentence_transformers import SentenceTransformer


class EmbeddingService:
    """
    Generates 384-dimensional behavioral embeddings from text descriptions.
    Singleton pattern — model loads once, reused across all calls.
    """

    _instance: Optional["EmbeddingService"] = None
    _model: Optional[SentenceTransformer] = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        if EmbeddingService._model is None:
            EmbeddingService._model = SentenceTransformer(
                "all-MiniLM-L6-v2",
                device="cpu"
            )

    @property
    def model(self) -> SentenceTransformer:
        return EmbeddingService._model

    def generate_embedding(self, text: str) -> np.ndarray:
        embedding = self.model.encode(
            text,
            convert_to_numpy=True,
            normalize_embeddings=True
        )
        return embedding

    def generate_embeddings_batch(self, texts: List[str]) -> np.ndarray:
        embeddings = self.model.encode(
            texts,
            convert_to_numpy=True,
            normalize_embeddings=True,
            batch_size=32,
        )
        return embeddings
