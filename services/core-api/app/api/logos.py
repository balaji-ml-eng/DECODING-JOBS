"""Durable, shared company-logo cache backed by Postgres.

Proxied by apps/web/app/api/logo/route.ts, which keeps a small in-memory
layer in front of this for low latency, but this endpoint is the source of
truth — it survives a frontend restart/redeploy and is shared across any
number of frontend instances, unlike a per-process in-memory cache.
"""

import base64
import logging
import re
from datetime import datetime, timedelta, timezone
from typing import Annotated

import httpx
from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.domain import LogoCache

logger = logging.getLogger("decoding_jobs.core_api.logos")

router = APIRouter(prefix="/logos", tags=["logos"])

CACHE_TTL = timedelta(days=30)
FAVICON_SOURCE = "https://www.google.com/s2/favicons"

# 1x1 transparent PNG — returned when a domain has no resolvable favicon, so
# the frontend never shows a broken-image icon. Same bytes as the frontend's
# own fallback in apps/web/app/api/logo/route.ts.
_TRANSPARENT_PNG = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
)


def _clean_domain(domain: str) -> str | None:
    cleaned = re.sub(r"[^a-zA-Z0-9.\-]", "", domain).lower()
    return cleaned if cleaned and "." in cleaned else None


@router.get(
    "",
    summary="Get a company's logo, cached durably in Postgres",
)
async def get_logo(
    db: Annotated[AsyncSession, Depends(get_db)],
    domain: str = Query(..., description="Company website domain, e.g. razorpay.com"),
) -> Response:
    clean = _clean_domain(domain)
    if not clean:
        return Response(content=_TRANSPARENT_PNG, media_type="image/png")

    cached = await db.get(LogoCache, clean)
    if cached and (datetime.now(timezone.utc) - cached.fetched_at) < CACHE_TTL:
        return Response(content=bytes(cached.image_bytes), media_type=cached.content_type)

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            upstream = await client.get(
                FAVICON_SOURCE,
                params={"domain": clean, "sz": "128"},
                headers={"User-Agent": "Mozilla/5.0"},
                follow_redirects=True,
            )
        if not upstream.is_success:
            raise httpx.HTTPStatusError("non-2xx", request=upstream.request, response=upstream)

        content_type = upstream.headers.get("content-type", "image/png")
        image_bytes = upstream.content
    except Exception:
        logger.info("Logo fetch failed for domain %r — caching transparent fallback", clean)
        content_type = "image/png"
        image_bytes = _TRANSPARENT_PNG

    if cached:
        cached.content_type = content_type
        cached.image_bytes = image_bytes
        cached.fetched_at = datetime.now(timezone.utc)
    else:
        db.add(LogoCache(domain=clean, content_type=content_type, image_bytes=image_bytes))
    await db.commit()

    return Response(content=image_bytes, media_type=content_type)
