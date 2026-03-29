"""
Generator — Answer questions using the Groq API (ultra-fast inference).
Model: llama-3.3-70b-versatile (best quality free tier)
Supports both streaming and non-streaming modes.
"""

import os
from typing import Iterator, Optional

from groq import Groq
from dotenv import load_dotenv

load_dotenv()

# ---- Groq client (singleton) ----
_client: Optional[Groq] = None

LLM_MODEL = "llama-3.3-70b-versatile"  # Best quality on Groq free tier

SYSTEM_PROMPT = """You are a smart, helpful AI assistant embedded in a web browser.
Your job is to answer questions based ONLY on the context extracted from the current webpage.

Rules:
- Answer concisely and accurately based on the provided context.
- If the answer is not present in the context, say: "I couldn't find that information on this page."  
- Do NOT make up information or use external knowledge.
- Format your response clearly. Use bullet points or numbered lists when helpful.
- Keep answers focused and under 300 words unless the question requires more detail."""


def _get_client() -> Groq:
    global _client
    if _client is None:
        api_key = os.environ.get("GROQ_API_KEY")
        if not api_key:
            raise ValueError(
                "GROQ_API_KEY not set. Please add it to your backend/.env file. "
                "Get a free key at https://console.groq.com"
            )
        _client = Groq(api_key=api_key)
    return _client


def _build_messages(context: str, question: str) -> list:
    return [
        {"role": "system", "content": SYSTEM_PROMPT},
        {
            "role": "user",
            "content": (
                f"Here is the relevant content from the current webpage:\n\n"
                f"---\n{context}\n---\n\n"
                f"Question: {question}"
            )
        }
    ]


def generate_answer(context: str, question: str) -> str:
    """Generate a complete answer (non-streaming)."""
    client = _get_client()
    completion = client.chat.completions.create(
        model=LLM_MODEL,
        messages=_build_messages(context, question),
        max_tokens=512,
        temperature=0.1,
        top_p=0.9,
    )
    return completion.choices[0].message.content


def generate_answer_stream(context: str, question: str) -> Iterator[str]:
    """Stream answer tokens one by one."""
    client = _get_client()
    stream = client.chat.completions.create(
        model=LLM_MODEL,
        messages=_build_messages(context, question),
        max_tokens=512,
        temperature=0.1,
        top_p=0.9,
        stream=True,
    )
    for chunk in stream:
        token = chunk.choices[0].delta.content
        if token:
            yield token
