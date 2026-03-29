"""
RAG Pipeline — orchestrates chunking → embedding → FAISS → generation.
Handles per-URL caching so the same page isn't re-embedded on every query.
"""

from typing import Iterator

from .chunking    import chunk_text
from .embeddings  import embed_texts, embed_query
from .vector_store import store_embeddings, retrieve, is_cached
from .generator   import generate_answer, generate_answer_stream


def ingest_content(content: str, url: str, title: str = "") -> dict:
    """
    Process and index page content.

    - If the URL is already cached, skip re-embedding (fast path).
    - Otherwise: chunk → embed → store in FAISS.

    Returns:
        dict with 'chunks' count and 'cached' bool.
    """
    # Fast path: already indexed
    if is_cached(url):
        print(f"[Pipeline] Cache hit for: {url[:60]}")
        return {"chunks": 0, "cached": True}

    print(f"[Pipeline] Indexing: {url[:60]}")

    # 1. Chunk
    chunks = chunk_text(content, max_words=150, overlap_words=30)
    print(f"[Pipeline] {len(chunks)} chunks created")

    if not chunks:
        return {"chunks": 0, "cached": False}

    # 2. Embed
    embeddings = embed_texts(chunks)

    # 3. Store in FAISS
    store_embeddings(embeddings, chunks, url, title)
    print(f"[Pipeline] Indexed {len(chunks)} chunks for: {url[:60]}")

    return {"chunks": len(chunks), "cached": False}


def _get_context(question: str, url: str) -> str:
    """Embed the question and retrieve relevant chunks."""
    q_emb  = embed_query(question)
    chunks = retrieve(q_emb, url, k=4)

    if not chunks:
        return "No relevant content found on this page."

    return "\n\n".join(chunks)


def query_rag(question: str, url: str) -> str:
    """Non-streaming RAG query."""
    context = _get_context(question, url)
    return generate_answer(context, question)


def query_rag_stream(question: str, url: str) -> Iterator[str]:
    """Streaming RAG query — yields tokens one by one."""
    context = _get_context(question, url)
    yield from generate_answer_stream(context, question)
