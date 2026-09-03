"""Shared low-level client for Groq's free-tier, OpenAI-compatible chat API.

Used by resume_analyzer.py and api/chat.py. app/services/email_parser.py
predates this and has its own proven, working call — left as-is rather than
risking a refactor of a shipped feature for the sake of DRY-ness.
"""

import logging
from typing import Any

import httpx

from app.core.config import get_settings

logger = logging.getLogger("decoding_jobs.core_api.groq_client")

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
DEFAULT_MODEL = "llama-3.3-70b-versatile"


class GroqUnavailable(Exception):
    """Raised when GROQ_API_KEY isn't configured — callers should degrade
    gracefully (a canned response), never surface this as a 500."""


async def chat_completion(
    messages: list[dict[str, Any]],
    *,
    tools: list[dict[str, Any]] | None = None,
    json_mode: bool = False,
    model: str = DEFAULT_MODEL,
    max_tokens: int = 1024,
    timeout: float = 30.0,
) -> dict[str, Any]:
    """Calls Groq's chat completions endpoint, returning the raw response JSON.

    Raises GroqUnavailable if no API key is configured. Any other failure
    (network, non-2xx, malformed response) raises normally — callers that
    need a soft-fail (e.g. structured extraction) should catch broadly.
    """
    settings = get_settings()
    if not settings.GROQ_API_KEY:
        raise GroqUnavailable("GROQ_API_KEY not configured")

    payload: dict[str, Any] = {
        "model": model,
        "max_tokens": max_tokens,
        "messages": messages,
    }
    if tools:
        payload["tools"] = tools
    if json_mode:
        payload["response_format"] = {"type": "json_object"}

    async with httpx.AsyncClient(timeout=timeout) as client:
        response = await client.post(
            GROQ_API_URL,
            headers={
                "Authorization": f"Bearer {settings.GROQ_API_KEY}",
                "Content-Type": "application/json",
            },
            json=payload,
        )
        response.raise_for_status()
        return response.json()
