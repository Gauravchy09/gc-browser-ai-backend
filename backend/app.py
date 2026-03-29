"""
AI Page Assistant — FastAPI Backend
Endpoints: /ingest, /query/stream, /query, /health
"""

import time
import json
import os
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from dotenv import load_dotenv

from rag.pipeline import ingest_content, query_rag_stream, query_rag

load_dotenv()

# ---- Validate env ----
if not os.getenv("GROQ_API_KEY"):
    print("⚠  WARNING: GROQ_API_KEY not set. Copy .env.example → .env and add your key.")

# ---- App ----
app = FastAPI(
    title="AI Page Assistant API",
    description="RAG backend for the Chrome extension",
    version="1.0.0"
)

# Enable CORS so the Chrome Extension (or any injected widget) can talk to this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Production: Allow all origins so any installed extension can access it
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---- Request Models ----
class IngestRequest(BaseModel):
    content: str
    url:     str
    title:   Optional[str] = ""

class QueryRequest(BaseModel):
    question: str
    url:      str


# ==========================================================
# ENDPOINTS
# ==========================================================

@app.get("/health")
def health():
    return {"status": "ok", "timestamp": time.time()}


@app.get("/test-groq")
def test_groq():
    """Quick endpoint to verify the Groq API key is working."""
    import os
    api_key = os.environ.get("GROQ_API_KEY", "")
    if not api_key or api_key == "your_groq_api_key_here":
        return {"status": "error", "detail": "GROQ_API_KEY not set or still placeholder in backend/.env"}
    try:
        from groq import Groq
        client = Groq(api_key=api_key)
        resp = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": "Reply with exactly: OK"}],
            max_tokens=5
        )
        answer = resp.choices[0].message.content
        return {"status": "ok", "response": answer, "key_prefix": api_key[:8] + "..."}
    except Exception as e:
        return {"status": "error", "detail": str(e)}


@app.post("/ingest")
async def ingest(req: IngestRequest):
    """
    Chunk the page content, embed it, and store in FAISS.
    Returns number of chunks and whether it used cache.
    """
    if not req.content or len(req.content.strip()) < 50:
        raise HTTPException(status_code=400, detail="Content too short to index.")

    t0 = time.time()
    result = ingest_content(req.content, req.url, req.title)
    elapsed = round(time.time() - t0, 2)

    return {
        "status":         "success",
        "chunks":         result["chunks"],
        "cached":         result["cached"],
        "embedding_time": elapsed,
        "char_count":     len(req.content)
    }


@app.post("/query/stream")
async def query_stream(req: QueryRequest):
    """
    Stream the answer token by token via SSE.
    """
    if not req.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    def event_generator():
        try:
            for token in query_rag_stream(req.question, req.url):
                payload = json.dumps({"token": token})
                yield f"data: {payload}\n\n"
        except Exception as e:
            err = json.dumps({"error": str(e)})
            yield f"data: {err}\n\n"
        finally:
            yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control":     "no-cache",
            "Connection":        "keep-alive",
            "X-Accel-Buffering": "no",      # Disable nginx buffering if behind proxy
        }
    )


@app.post("/query")
async def query(req: QueryRequest):
    """
    Non-streaming query endpoint (returns complete answer at once).
    """
    if not req.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    t0 = time.time()
    answer = query_rag(req.question, req.url)
    elapsed = round(time.time() - t0, 2)

    return {
        "answer":        answer,
        "response_time": elapsed
    }
