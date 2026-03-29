"""
Vector Store — per-URL FAISS index with in-memory caching.
Each unique URL gets its own index so navigating pages is seamless.
"""

import hashlib
from dataclasses import dataclass, field
from typing import Dict, List, Optional

import faiss
import numpy as np


@dataclass
class PageIndex:
    index:  faiss.IndexFlatIP  # Inner-product (cosine via normalized vectors)
    chunks: List[str]
    url:    str
    title:  str = ""


# Global cache: url_hash → PageIndex
_cache: Dict[str, PageIndex] = {}

MAX_CACHE_SIZE = 10   # Keep last 10 pages in memory


def _url_hash(url: str) -> str:
    """Create a stable short hash for a URL."""
    # Strip query params & fragments for better caching
    clean = url.split('?')[0].split('#')[0]
    return hashlib.md5(clean.encode()).hexdigest()[:12]


def store_embeddings(
    embeddings: np.ndarray,
    chunks:     List[str],
    url:        str,
    title:      str = ""
) -> None:
    """Build a FAISS index for the given page and cache it."""
    dim   = embeddings.shape[1]
    index = faiss.IndexFlatIP(dim)     # Cosine similarity (normalized vectors)
    index.add(embeddings)

    key = _url_hash(url)

    # Evict oldest entry if cache is full
    if len(_cache) >= MAX_CACHE_SIZE:
        oldest_key = next(iter(_cache))
        del _cache[oldest_key]

    _cache[key] = PageIndex(index=index, chunks=chunks, url=url, title=title)


def get_page_index(url: str) -> Optional[PageIndex]:
    """Retrieve cached index for the given URL, or None."""
    return _cache.get(_url_hash(url))


def is_cached(url: str) -> bool:
    """Check if URL is already indexed."""
    return _url_hash(url) in _cache


def retrieve(
    query_embedding: np.ndarray,
    url:             str,
    k:               int = 4
) -> List[str]:
    """
    Return the top-k most relevant chunks for the query.

    Args:
        query_embedding: shape (1, dim) normalized float32 array
        url:             current page URL
        k:               number of chunks to retrieve

    Returns:
        List of relevant text chunks.
    """
    page_idx = get_page_index(url)
    if page_idx is None:
        raise ValueError(f"No index found for URL: {url}. Please ingest first.")

    k = min(k, page_idx.index.ntotal)
    scores, indices = page_idx.index.search(query_embedding, k)

    results = []
    for idx, score in zip(indices[0], scores[0]):
        if idx >= 0 and score > 0.1:    # Filter very low-relevance chunks
            results.append(page_idx.chunks[idx])

    return results
