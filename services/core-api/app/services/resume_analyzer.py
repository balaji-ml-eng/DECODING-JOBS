"""ATS-friendliness scoring and rewrite suggestions for a resume, via Groq."""

import json
import logging
from typing import TypedDict

from app.services.groq_client import GroqUnavailable, chat_completion

logger = logging.getLogger("decoding_jobs.core_api.resume_analyzer")

_SYSTEM_PROMPT = """You are an ATS (Applicant Tracking System) resume reviewer for tech job \
applicants in India. You are given resume text extracted from a PDF/DOCX, and optionally a \
target job description. Reply with ONLY a JSON object, no other text, matching exactly:

{
  "ats_score": integer 0-100,
  "summary": "one or two sentence overall assessment",
  "strengths": ["short bullet", ...],
  "weaknesses": ["short bullet", ...],
  "suggestions": ["concrete, actionable rewrite suggestion", ...],
  "missing_keywords": ["keyword from the job description not present in the resume", ...]
}

Scoring rules:
- Penalize missing standard sections (contact info, experience, education, skills).
- Penalize vague, unquantified bullet points ("worked on", "helped with") over ones with
  measurable outcomes ("reduced latency by 30%").
- Penalize resumes that look like they'd break ATS parsing (evidence of tables/columns/graphics
  showing up as garbled or out-of-order extracted text).
- If a job description is provided, missing_keywords must list real terms from THAT job
  description absent from the resume — never invent keywords. If no job description was
  given, return an empty missing_keywords array.
- suggestions must be specific and actionable, not generic advice.
"""


class AtsAnalysis(TypedDict):
    ats_score: int
    summary: str
    strengths: list[str]
    weaknesses: list[str]
    suggestions: list[str]
    missing_keywords: list[str]


def _fallback(message: str) -> AtsAnalysis:
    return {
        "ats_score": 0,
        "summary": message,
        "strengths": [],
        "weaknesses": [],
        "suggestions": [],
        "missing_keywords": [],
    }


async def analyze_resume(resume_text: str, job_description: str | None = None) -> AtsAnalysis:
    """Returns a structured ATS analysis, or a clearly-labeled fallback if the
    LLM is unavailable or its response can't be parsed — never raises."""
    user_content = f"Resume:\n{resume_text[:8000]}"
    if job_description:
        user_content += f"\n\nTarget job description:\n{job_description[:4000]}"

    try:
        data = await chat_completion(
            [
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user", "content": user_content},
            ],
            json_mode=True,
            max_tokens=1400,
        )
        raw_text = data["choices"][0]["message"]["content"]
    except GroqUnavailable:
        return _fallback("Resume analysis isn't configured yet — set GROQ_API_KEY to enable it.")
    except Exception:
        logger.exception("Resume analysis request failed")
        return _fallback("Resume analysis failed unexpectedly — please try again.")

    try:
        parsed = json.loads(raw_text)
    except (json.JSONDecodeError, TypeError):
        logger.warning("Resume analysis returned non-JSON response: %r", raw_text)
        return _fallback("Resume analysis returned an unexpected response — please try again.")

    score = parsed.get("ats_score")
    return {
        "ats_score": score if isinstance(score, int) and 0 <= score <= 100 else 0,
        "summary": parsed.get("summary") or "",
        "strengths": [s for s in parsed.get("strengths", []) if isinstance(s, str)],
        "weaknesses": [s for s in parsed.get("weaknesses", []) if isinstance(s, str)],
        "suggestions": [s for s in parsed.get("suggestions", []) if isinstance(s, str)],
        "missing_keywords": [s for s in parsed.get("missing_keywords", []) if isinstance(s, str)],
    }
