"""Job-related API routes: listing active postings and fetching a single job."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func, or_, distinct
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from pydantic import BaseModel, ConfigDict

from app.db.session import get_db
from app.models.domain import Job, Company, EmploymentType, WorkMode
from app.schemas import JobRead, JobWithCompanyRead

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.get(
    "/search",
    summary="Search jobs by role/skill and return matching companies",
)
async def search_jobs(
    db: Annotated[AsyncSession, Depends(get_db)],
    q: str = Query(..., min_length=1, description="Search query"),
    city: str | None = Query(None),
    limit: int = Query(20, ge=1, le=50),
) -> list[dict]:
    """Full-text search across job titles and descriptions.
    Returns companies with matching jobs for the map."""
    pattern = f"%{q}%"

    # Single query: JOIN jobs + companies, get lat/lng via ST_X/ST_Y
    stmt = (
        select(
            Company.id.label("company_id"),
            Company.name.label("company_name"),
            Company.city,
            Company.sector,
            Company.area,
            Company.website_url,
            Company.logo_url,
            func.ST_Y(Company.location).label("latitude"),
            func.ST_X(Company.location).label("longitude"),
            Job.id.label("job_id"),
            Job.title.label("job_title"),
            Job.work_mode,
            Job.apply_url,
            Job.salary_min,
            Job.salary_max,
            Job.source,
        )
        .join(Job, Job.company_id == Company.id)
        .where(Job.is_active.is_(True))
        .where(or_(Job.title.ilike(pattern), Job.description.ilike(pattern)))
    )
    if city:
        stmt = stmt.where(Company.city == city)
    stmt = stmt.order_by(Company.name, Job.title).limit(limit)

    result = await db.execute(stmt)
    rows = result.all()

    # Group by company
    company_map: dict[int, dict] = {}
    for row in rows:
        cid = row.company_id
        if cid not in company_map:
            # Count total active jobs for this company
            count_stmt = select(func.count(Job.id)).where(
                Job.company_id == cid, Job.is_active.is_(True)
            )
            count_result = await db.execute(count_stmt)
            total = count_result.scalar() or 0

            company_map[cid] = {
                "company_id": cid,
                "company_name": row.company_name,
                "city": row.city,
                "sector": row.sector,
                "area": row.area,
                "latitude": float(row.latitude) if row.latitude else None,
                "longitude": float(row.longitude) if row.longitude else None,
                "website_url": row.website_url,
                "logo_url": row.logo_url,
                "active_job_count": total,
                "matching_jobs": [],
            }
        company_map[cid]["matching_jobs"].append({
            "id": row.job_id,
            "title": row.job_title,
            "work_mode": row.work_mode.value if row.work_mode else None,
            "apply_url": row.apply_url,
            "salary_min": row.salary_min,
            "salary_max": row.salary_max,
            "source": row.source,
        })

    return list(company_map.values())


@router.get(
    "/suggestions",
    summary="Autocomplete suggestions for job role search",
)
async def job_suggestions(
    db: Annotated[AsyncSession, Depends(get_db)],
    q: str = Query(..., min_length=1),
    city: str | None = Query(None),
    limit: int = Query(8, ge=1, le=15),
) -> list[dict]:
    """Returns unique job titles matching the query for autocomplete dropdown."""
    pattern = f"%{q}%"
    stmt = (
        select(distinct(Job.title))
        .join(Company, Job.company_id == Company.id)
        .where(Job.is_active.is_(True))
        .where(Job.title.ilike(pattern))
    )
    if city:
        stmt = stmt.where(Company.city == city)
    stmt = stmt.order_by(Job.title).limit(limit)

    result = await db.execute(stmt)
    return [{"title": row[0]} for row in result.all()]


@router.get(
    "",
    response_model=list[JobRead],
    summary="List active job postings, optionally filtered by company",
)
async def list_active_jobs(
    db: Annotated[AsyncSession, Depends(get_db)],
    company_id: Annotated[
        int | None, Query(description="Restrict results to a single company's jobs")
    ] = None,
) -> list[Job]:
    """Returns every job currently marked active, newest first."""
    stmt = select(Job).where(Job.is_active.is_(True))
    if company_id is not None:
        stmt = stmt.where(Job.company_id == company_id)
    stmt = stmt.order_by(Job.created_at.desc())

    result = await db.execute(stmt)
    return list(result.scalars().all())


@router.get(
    "/{job_id}",
    response_model=JobWithCompanyRead,
    summary="Get a single job posting by ID",
)
async def get_job(
    job_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Job:
    """Returns full job detail with its parent company embedded."""
    stmt = select(Job).options(selectinload(Job.company)).where(Job.id == job_id)
    result = await db.execute(stmt)
    job = result.scalar_one_or_none()

    if job is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job {job_id} not found",
        )

    return job


class JobSeedRequest(BaseModel):
    """Request body for seeding a job from the scraper."""
    model_config = ConfigDict(extra="forbid")

    company_id: int
    title: str
    description: str = ""
    employment_type: str = "full_time"
    work_mode: str | None = None
    apply_url: str | None = None
    source: str | None = "manual"
    source_url: str | None = None


@router.post(
    "/seed",
    response_model=JobRead,
    status_code=status.HTTP_201_CREATED,
    summary="Seed a job posting from the scraper",
)
async def seed_job(
    payload: JobSeedRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Job:
    """Insert a job posting. Used by the LinkedIn scraper to populate real hiring data."""
    from datetime import datetime, timezone

    existing = await db.execute(
        select(Job).where(
            Job.company_id == payload.company_id,
            Job.title == payload.title,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Job '{payload.title}' already exists for company {payload.company_id}",
        )

    job = Job(
        company_id=payload.company_id,
        title=payload.title,
        description=payload.description or "No description provided.",
        employment_type=EmploymentType(payload.employment_type),
        work_mode=WorkMode(payload.work_mode) if payload.work_mode else None,
        apply_url=payload.apply_url,
        is_active=True,
        source=payload.source,
        source_url=payload.source_url,
        fetched_at=datetime.now(timezone.utc),
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)

    return job
