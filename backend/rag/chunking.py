"""
Chunking — split cleaned page text into overlapping chunks.
Uses sentence-boundary awareness for better retrieval quality.
"""

import re
from typing import List


def split_into_sentences(text: str) -> List[str]:
    """Simple sentence splitter using regex (no NLTK dependency)."""
    # Split on .  !  ? followed by space + capital letter
    sentence_endings = re.compile(r'(?<=[.!?])\s+(?=[A-Z])')
    sentences = sentence_endings.split(text)
    # Also split on newlines
    result = []
    for s in sentences:
        parts = [p.strip() for p in s.split('\n') if p.strip()]
        result.extend(parts)
    return result


def chunk_text(
    text: str,
    max_words: int = 150,
    overlap_words: int = 30
) -> List[str]:
    """
    Split text into overlapping chunks of ~max_words each.
    Tries to respect sentence boundaries.

    Args:
        text:          Clean page text.
        max_words:     Target words per chunk.
        overlap_words: Words to overlap between consecutive chunks.

    Returns:
        List of text chunks.
    """
    sentences = split_into_sentences(text)

    chunks   = []
    current  = []
    word_cnt = 0

    for sentence in sentences:
        words = sentence.split()
        if not words:
            continue

        # If adding this sentence would exceed the limit and we have content, flush
        if word_cnt + len(words) > max_words and current:
            chunks.append(' '.join(current))
            # Keep last overlap_words as context for next chunk
            overlap = ' '.join(current).split()[-overlap_words:]
            current  = overlap
            word_cnt = len(overlap)

        current.extend(words)
        word_cnt += len(words)

    # Flush remaining
    if current:
        chunks.append(' '.join(current))

    # Remove very short chunks (likely noise)
    chunks = [c for c in chunks if len(c.split()) >= 10]

    return chunks
