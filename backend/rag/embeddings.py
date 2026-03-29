"""
Embeddings — encode text using sentence-transformers.
Model: all-MiniLM-L6-v2 (~80MB, very fast on CPU)
"""

from sentence_transformers import SentenceTransformer
import numpy as np
from typing import List

# Loaded once at startup (singleton)
_model: SentenceTransformer | None = None


def _get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        print("[Embeddings] Loading all-MiniLM-L6-v2...")
        _model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
        print("[Embeddings] Model loaded.")
    return _model


def embed_texts(texts: List[str]) -> np.ndarray:
    """
    Embed a list of texts.

    Returns:
        numpy array of shape (len(texts), 384)
    """
    model = _get_model()
    embeddings = model.encode(
        texts,
        batch_size=64,
        show_progress_bar=False,
        normalize_embeddings=True   # cosine similarity via dot product
    )
    return np.array(embeddings, dtype=np.float32)


def embed_query(text: str) -> np.ndarray:
    """Embed a single query string."""
    return embed_texts([text])
