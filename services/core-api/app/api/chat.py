"""AI Job Search Assistant: a tool-calling chat backed by our own real data.

The model never invents a company or posting — every job/company it mentions
comes from one of the tool calls below, which query the same tables the map
and Kanban tracker use. If GROQ_API_KEY isn't set, /chat degrades to a
friendly canned reply instead of erroring, same pattern as the rest of the
app's optional LLM features.
"""

import json
import logging
from typing import Annotated, Any

from fastapi import APIRouter, Depends
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.models.domain import Company, Job, Resume
from app.schemas import ChatCompanyResult, ChatJobResult, ChatRequest, ChatResponse
from app.services.groq_client import GroqUnavailable, chat_completion

logger = logging.getLogger("decoding_jobs.core_api.chat")

router = APIRouter(prefix="/chat", tags=["chat"])

MAX_TOOL_ROUNDS = 4

_SYSTEM_PROMPT = """You are the AI Job Search Assistant for DECODING JOBS, a map-based job \
search tool for tech students and job seekers in India. You help people find real jobs and \
companies, and give interview/application prep guidance.

Rules:
- You have tools to search real jobs, list real companies, get a company's real detail, and \
get interview prep grounded in real company data. ALWAYS use a tool before naming a specific \
company or job — never invent one.
- If a request is vague (e.g. just "find me a job"), ask a short clarifying question first — \
role/title, city, and work mode (remote/hybrid/onsite) are the things a real job seeker narrows \
by. Don't ask more than one or two questions before trying a search.
- When asked to prepare for an interview or a specific role, use get_interview_prep. Be clear \
about what's real (the company's actual culture/sentiment data, the actual job description if \
found) versus general advice about that type of role — never claim to know real interview \
questions you don't have.
- If the user's resume text is included in this conversation's context, use it to give specific, \
personalized advice when relevant (e.g. how it matches a role) — don't ask them to paste it again.
- Keep replies concise and conversational, not a wall of text.
"""

TOOLS: list[dict[str, Any]] = [
    {
        "type": "function",
        "function": {
            "name": "search_jobs",
            "description": "Search real job postings by role/title/skill, optionally scoped to a city.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Role, title, or skill keywords"},
                    "city": {"type": "string", "description": "Optional city to scope the search to"},
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "list_companies",
            "description": "List real companies, optionally filtered by sector, city, funding stage, or hiring status.",
            "parameters": {
                "type": "object",
                "properties": {
                    "sector": {"type": "string", "description": "e.g. AI, Fintech, SaaS, Consumer"},
                    "city": {"type": "string"},
                    "stage": {"type": "string", "description": "e.g. Seed, Series A, Growth, Public"},
                    "hiring_only": {"type": "boolean", "description": "Only companies with open roles"},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_company_detail",
            "description": "Get one company's real detail: sector, city, funding, culture score, sentiment pros/cons.",
            "parameters": {
                "type": "object",
                "properties": {"company_name": {"type": "string"}},
                "required": ["company_name"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_interview_prep",
            "description": "Get real data to prep for an interview at a company: culture/sentiment, and the real job description if one is posted.",
            "parameters": {
                "type": "object",
                "properties": {
                    "company_name": {"type": "string"},
                    "job_title": {"type": "string", "description": "Optional specific role title"},
                },
                "required": ["company_name"],
            },
        },
    },
]


def _company_dict(company: Company, active_job_count: int = 0) -> dict:
    return {
        "id": company.id,
        "name": company.name,
        "sector": company.sector,
        "city": company.city,
        "stage": company.stage,
        "website_url": company.website_url,
        "active_job_count": active_job_count,
    }


def _job_dict(job: Job) -> dict:
    return {
        "id": job.id,
        "title": job.title,
        "company_name": job.company.name,
        "company_id": job.company.id,
        "sector": job.company.sector,
        "city": job.company.city,
        "work_mode": job.work_mode.value if job.work_mode else None,
        "apply_url": job.apply_url,
        "website_url": job.company.website_url,
    }


async def _tool_search_jobs(db: AsyncSession, query: str, city: str | None = None) -> list[dict]:
    pattern = f"%{query}%"
    stmt = (
        select(Job)
        .options(selectinload(Job.company))
        .join(Company, Job.company_id == Company.id)
        .where(Job.is_active.is_(True))
        .where(or_(Job.title.ilike(pattern), Job.description.ilike(pattern)))
    )
    if city:
        stmt = stmt.where(Company.city.ilike(f"%{city}%"))
    stmt = stmt.order_by(Job.created_at.desc()).limit(8)

    result = await db.execute(stmt)
    return [_job_dict(job) for job in result.scalars().all()]


async def _tool_list_companies(
    db: AsyncSession,
    sector: str | None = None,
    city: str | None = None,
    stage: str | None = None,
    hiring_only: bool | None = None,
) -> list[dict]:
    stmt = select(Company)
    if sector:
        stmt = stmt.where(Company.sector.ilike(f"%{sector}%"))
    if city:
        stmt = stmt.where(Company.city.ilike(f"%{city}%"))
    if stage:
        stmt = stmt.where(Company.stage.ilike(f"%{stage}%"))
    if hiring_only:
        hiring_subq = select(Job.company_id).where(Job.is_active.is_(True)).distinct()
        stmt = stmt.where(Company.id.in_(hiring_subq))
    stmt = stmt.limit(8)

    result = await db.execute(stmt)
    companies = list(result.scalars().all())

    out = []
    for company in companies:
        count_result = await db.execute(
            select(func.count(Job.id)).where(Job.company_id == company.id, Job.is_active.is_(True))
        )
        out.append(_company_dict(company, count_result.scalar() or 0))
    return out


async def _tool_get_company_detail(db: AsyncSession, company_name: str) -> dict:
    result = await db.execute(select(Company).where(Company.name.ilike(f"%{company_name}%")).limit(1))
    company = result.scalar_one_or_none()
    if company is None:
        return {"found": False, "message": f"No company matching '{company_name}' found"}

    return {
        "found": True,
        "name": company.name,
        "description": company.description,
        "sector": company.sector,
        "stage": company.stage,
        "city": company.city,
        "area": company.area,
        "founded_year": company.founded_year,
        "team_size": company.team_size,
        "total_funding": company.total_funding,
        "culture_score": float(company.culture_score) if company.culture_score else None,
        "sentiment_pros": (company.sentiment_summary or {}).get("pros", []),
        "sentiment_cons": (company.sentiment_summary or {}).get("cons", []),
    }


async def _tool_get_interview_prep(
    db: AsyncSession, company_name: str, job_title: str | None = None
) -> dict:
    detail = await _tool_get_company_detail(db, company_name)
    if not detail.get("found"):
        return detail

    job_stmt = select(Job).join(Company, Job.company_id == Company.id).where(
        Company.name.ilike(f"%{company_name}%"), Job.is_active.is_(True)
    )
    if job_title:
        job_stmt = job_stmt.where(Job.title.ilike(f"%{job_title}%"))
    job_stmt = job_stmt.limit(1)

    job_result = await db.execute(job_stmt)
    job = job_result.scalar_one_or_none()

    return {
        **detail,
        "matching_job_title": job.title if job else None,
        "matching_job_description": job.description if job else None,
        "note": "culture_score/sentiment/job_description above are real data from our database; "
        "anything else about interview format is general guidance, not confirmed real questions.",
    }


_TOOL_IMPLS = {
    "search_jobs": _tool_search_jobs,
    "list_companies": _tool_list_companies,
    "get_company_detail": _tool_get_company_detail,
    "get_interview_prep": _tool_get_interview_prep,
}


def _fallback_response(text: str) -> ChatResponse:
    return ChatResponse(reply=text, jobs=[], companies=[])


@router.post("", response_model=ChatResponse, summary="Chat with the AI Job Search Assistant")
async def chat(payload: ChatRequest, db: Annotated[AsyncSession, Depends(get_db)]) -> ChatResponse:
    system_content = _SYSTEM_PROMPT

    if payload.resume_id is not None:
        resume = await db.get(Resume, payload.resume_id)
        if resume and resume.extracted_text:
            system_content += f"\n\nThe user's resume text:\n{resume.extracted_text[:4000]}"

    if payload.job_id is not None:
        job_result = await db.execute(
            select(Job).options(selectinload(Job.company)).where(Job.id == payload.job_id)
        )
        job = job_result.scalar_one_or_none()
        if job:
            system_content += (
                f"\n\nThe user is asking specifically about this job: {job.title} at "
                f"{job.company.name}. Description: {job.description[:2000]}"
            )

    messages: list[dict[str, Any]] = [{"role": "system", "content": system_content}]
    messages.extend({"role": m.role, "content": m.content} for m in payload.messages)

    collected_jobs: dict[int, dict] = {}
    collected_companies: dict[int, dict] = {}

    try:
        for _ in range(MAX_TOOL_ROUNDS):
            data = await chat_completion(messages, tools=TOOLS, max_tokens=800)
            message = data["choices"][0]["message"]
            tool_calls = message.get("tool_calls")

            if not tool_calls:
                return ChatResponse(
                    reply=message.get("content") or "",
                    jobs=[ChatJobResult(**j) for j in collected_jobs.values()],
                    companies=[ChatCompanyResult(**c) for c in collected_companies.values()],
                )

            messages.append(message)
            for call in tool_calls:
                name = call["function"]["name"]
                try:
                    args = json.loads(call["function"]["arguments"] or "{}")
                except json.JSONDecodeError:
                    args = {}

                impl = _TOOL_IMPLS.get(name)
                if impl is None:
                    tool_result: Any = {"error": f"Unknown tool {name}"}
                else:
                    tool_result = await impl(db, **args)

                if name == "search_jobs" and isinstance(tool_result, list):
                    for j in tool_result:
                        collected_jobs[j["id"]] = j
                elif name == "list_companies" and isinstance(tool_result, list):
                    for c in tool_result:
                        collected_companies[c["id"]] = c

                messages.append(
                    {
                        "role": "tool",
                        "tool_call_id": call["id"],
                        "content": json.dumps(tool_result),
                    }
                )

        return _fallback_response(
            "I found some options but I'm having trouble putting together a final answer — "
            "try narrowing your request a bit."
        )
    except GroqUnavailable:
        return _fallback_response(
            "The AI assistant isn't configured yet — set GROQ_API_KEY on the server to enable it."
        )
    except Exception:
        logger.exception("Chat request failed")
        return _fallback_response("Something went wrong on my end — please try again.")
