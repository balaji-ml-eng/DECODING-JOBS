"""Extracts interview-round signal from a forwarded email using an LLM.

Used by api/emails.py's SendGrid Inbound Parse webhook. Uses Groq's free-tier
API (an OpenAI-compatible chat completions endpoint, no paid key required —
sign up at https://console.groq.com). Deliberately fails soft everywhere — a
bad LLM response, a network error, or a missing API key must never break the
webhook; they just mean nothing gets extracted.
"""

import json
import logging
from typing import TypedDict

import httpx

from app.core.config import get_settings

logger = logging.getLogger("decoding_jobs.core_api.email_parser")

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
# Verified against a live key on 2026-09-05 (GET /v1/models) — Groq's lineup
# changes over time, so re-check that list if this model ever disappears.
# gpt-oss models are "reasoning" models: they spend tokens on an internal
# `reasoning` field before the final content, so max_tokens below needs real
# headroom or json_object mode can fail with "max tokens reached" instead of
# actually returning JSON.
GROQ_MODEL = "openai/gpt-oss-120b"

EXTRACTION_SYSTEM_PROMPT = """You extract structured signal from a job-application-related email \
forwarded by a candidate. Reply with ONLY a JSON object, no other text, matching exactly:

{"company_name": string|null, "round_number": integer|null, "stage_label": string|null, \
"status": "interview"|"offer"|"rejected"|null}

Rules:
- company_name: the hiring company's name, if identifiable.
- round_number: the interview round number if the email states or implies one \
(e.g. "second round" -> 2, "final round" -> a reasonable guess like 3 if no earlier \
round number is known from this email alone, "technical interview" with no number -> null).
- stage_label: a short human label for the stage if round_number isn't a clean number \
(e.g. "Final Round", "Technical Screen", "Onsite").
- status: "interview" if this is an interview invite/update, "offer" if this is an offer, \
"rejected" if this is a rejection, null if none of those apply (e.g. an application \
confirmation with no stage change).
- If the email isn't job-application-related at all, return all nulls.
"""


class ExtractedSignal(TypedDict):
    company_name: str | None
    round_number: int | None
    stage_label: str | None
    status: str | None


_NULL_SIGNAL: ExtractedSignal = {
    "company_name": None,
    "round_number": None,
    "stage_label": None,
    "status": None,
}


async def extract_interview_signal(subject: str, text: str) -> ExtractedSignal:
    """Returns extracted fields, or an all-`None` signal if extraction can't run."""
    settings = get_settings()
    if not settings.GROQ_API_KEY:
        logger.info("GROQ_API_KEY not set — skipping email extraction")
        return dict(_NULL_SIGNAL)

    email_excerpt = f"Subject: {subject}\n\n{text}".strip()[:6000]

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                GROQ_API_URL,
                headers={
                    "Authorization": f"Bearer {settings.GROQ_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": GROQ_MODEL,
                    "max_tokens": 600,
                    "response_format": {"type": "json_object"},
                    "messages": [
                        {"role": "system", "content": EXTRACTION_SYSTEM_PROMPT},
                        {"role": "user", "content": email_excerpt},
                    ],
                },
            )
            response.raise_for_status()
            data = response.json()
            raw_text = data["choices"][0]["message"]["content"]
    except Exception:
        logger.exception("Email extraction request failed")
        return dict(_NULL_SIGNAL)

    try:
        parsed = json.loads(raw_text)
    except (json.JSONDecodeError, TypeError):
        logger.warning("Email extraction returned non-JSON response: %r", raw_text)
        return dict(_NULL_SIGNAL)

    return {
        "company_name": parsed.get("company_name") or None,
        "round_number": parsed.get("round_number") if isinstance(parsed.get("round_number"), int) else None,
        "stage_label": parsed.get("stage_label") or None,
        "status": parsed.get("status") if parsed.get("status") in ("interview", "offer", "rejected") else None,
    }
