"""Application-related API routes: submitting a job application."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.domain import Application, Job
from app.schemas import ApplicationRead, ApplicationSubmitRequest

router = APIRouter(prefix="/applications", tags=["applications"])


@router.post(
    "/submit",
    response_model=ApplicationRead,
    status_code=status.HTTP_201_CREATED,
    summary="Submit a job application via the Document Vault's 1-Click Apply flow",
)
async def submit_application(
    payload: ApplicationSubmitRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Application:
    """Creates an Application row with status 'applied' for the given job.

    Phase 1 has no auth/session system yet, so `user_id` is left unset —
    submissions are currently anonymous.
    """
    job = await db.get(Job, payload.job_id)
    if job is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job {payload.job_id} not found",
        )

    application = Application(
        job_id=payload.job_id,
        resume_filename=payload.resume_filename,
    )
    db.add(application)
    await db.commit()
    await db.refresh(application)

    return application
