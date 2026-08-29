"""User-related API routes: Phase 1's password-less, email-only identity."""

import secrets
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.db.session import get_db
from app.models.domain import User
from app.schemas import UserIdentifyRequest, UserRead

router = APIRouter(prefix="/users", tags=["users"])


async def get_or_create_user(db: AsyncSession, email: str) -> User:
    """Looks up a User by email, creating one if it doesn't exist yet.

    Phase 1 has no login/password — an email is the whole identity, shared
    by the Application Tracker board and the map's 1-Click Apply flow.
    """
    normalized = email.strip().lower()
    existing = await db.execute(select(User).where(User.email == normalized))
    user = existing.scalar_one_or_none()
    if user:
        return user

    user = User(
        email=normalized,
        full_name=normalized.split("@")[0],
        forwarding_token=secrets.token_hex(8),
    )
    db.add(user)
    await db.flush()
    return user


@router.post(
    "/identify",
    response_model=UserRead,
    summary="Get-or-create a User by email (no password) — Phase 1 sign-in",
)
async def identify(
    payload: UserIdentifyRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    user = await get_or_create_user(db, payload.email)
    await db.commit()
    await db.refresh(user)

    settings = get_settings()
    user._forwarding_address = (
        f"u-{user.forwarding_token}@{settings.INBOUND_EMAIL_DOMAIN}"
        if settings.INBOUND_EMAIL_DOMAIN and user.forwarding_token
        else None
    )
    return user
