"""SQLAlchemy 2.0 ORM domain models for DECODING JOBS Phase 1.

Table DDL (including the PostGIS geometry column, GiST index, and the
`employment_type` enum) lives in infra/init-db/*.sql — these classes map
onto that existing schema, they do not generate it.
"""

import enum
from datetime import datetime
from decimal import Decimal
from typing import TypedDict

from geoalchemy2 import Geometry
from geoalchemy2.elements import WKBElement
from geoalchemy2.shape import to_shape
from sqlalchemy import (
    BigInteger,
    Boolean,
    DateTime,
)
from sqlalchemy import (
    Enum as SAEnum,
)
from sqlalchemy import (
    ForeignKey,
    LargeBinary,
    Numeric,
    SmallInteger,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    """Shared declarative base for all ORM models."""


class EmploymentType(str, enum.Enum):
    """Mirrors the Postgres `employment_type` enum created in 02-init-jobs-users.sql."""

    FULL_TIME = "full_time"
    INTERNSHIP = "internship"
    CONTRACT = "contract"
    PART_TIME = "part_time"


class WorkMode(str, enum.Enum):
    """Mirrors the Postgres `work_mode` enum created in 03-add-sentiment-and-work-mode.sql."""

    REMOTE = "remote"
    HYBRID = "hybrid"
    ONSITE = "onsite"


class ApplicationStatus(str, enum.Enum):
    """Mirrors the Postgres `application_status` enum (created in 04-init-applications.sql,
    with SAVED added in 11-add-application-tracker.sql for the Kanban tracker).

    SAVED/APPLIED/INTERVIEW/OFFER back the tracker's Kanban columns; VIEWED
    and REJECTED are tracked but not yet surfaced as their own column.
    """

    SAVED = "saved"
    APPLIED = "applied"
    VIEWED = "viewed"
    INTERVIEW = "interview"
    REJECTED = "rejected"
    OFFER = "offer"


class CompanySentiment(TypedDict):
    """Shape of `Company.sentiment_summary`'s JSONB payload."""

    pros: list[str]
    cons: list[str]


class Company(Base):
    """A tech company shown as a pin on the map."""

    __tablename__ = "companies"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    logo_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    website_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    address: Mapped[str] = mapped_column(String(500), nullable=False)
    location: Mapped[WKBElement] = mapped_column(
        Geometry(geometry_type="POINT", srid=4326), nullable=False
    )
    sentiment_summary: Mapped[CompanySentiment | None] = mapped_column(JSONB, nullable=True)
    culture_score: Mapped[Decimal | None] = mapped_column(Numeric(2, 1), nullable=True)
    # Phase 2: real company enrichment fields.
    sector: Mapped[str | None] = mapped_column(String(50), nullable=True)
    stage: Mapped[str | None] = mapped_column(String(50), nullable=True)
    area: Mapped[str | None] = mapped_column(String(100), nullable=True)
    city: Mapped[str | None] = mapped_column(String(100), nullable=True, default="Bengaluru")
    founded_year: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    team_size: Mapped[str | None] = mapped_column(String(20), nullable=True)
    total_funding: Mapped[str | None] = mapped_column(String(50), nullable=True)
    linkedin_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    jobs_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str | None] = mapped_column(String(20), nullable=True, default="active")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    jobs: Mapped[list["Job"]] = relationship(
        back_populates="company", cascade="all, delete-orphan"
    )

    @property
    def longitude(self) -> float:
        """Decodes the geometry column into a plain float for API responses."""
        return to_shape(self.location).x

    @property
    def latitude(self) -> float:
        """Decodes the geometry column into a plain float for API responses."""
        return to_shape(self.location).y


class Job(Base):
    """A job posting belonging to a single company."""

    __tablename__ = "jobs"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    company_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    employment_type: Mapped[EmploymentType] = mapped_column(
        SAEnum(
            EmploymentType,
            name="employment_type",
            # Postgres enum labels are the lowercase `.value`s (e.g. "full_time"),
            # not the uppercase Python member names — without this, SQLAlchemy
            # would try to write "FULL_TIME" and fail against the DB enum.
            values_callable=lambda enum_cls: [member.value for member in enum_cls],
        ),
        nullable=False,
        default=EmploymentType.FULL_TIME,
    )
    min_experience_years: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=0)
    salary_min: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    salary_max: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    work_mode: Mapped[WorkMode | None] = mapped_column(
        SAEnum(
            WorkMode,
            name="work_mode",
            values_callable=lambda enum_cls: [member.value for member in enum_cls],
        ),
        nullable=True,
    )
    apply_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    # Phase 2: job source tracking.
    source: Mapped[str | None] = mapped_column(String(50), nullable=True, default="manual")
    source_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    fetched_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    company: Mapped["Company"] = relationship(back_populates="jobs")


class Application(Base):
    """A submitted job application — created by the Document Vault's 1-Click Apply flow."""

    __tablename__ = "applications"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    job_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("jobs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    # NULL for a "saved" bookmark that hasn't gone through 1-Click Apply yet.
    resume_filename: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[ApplicationStatus] = mapped_column(
        SAEnum(
            ApplicationStatus,
            name="application_status",
            values_callable=lambda enum_cls: [member.value for member in enum_cls],
        ),
        nullable=False,
        default=ApplicationStatus.APPLIED,
    )
    # Which interview round the candidate is on. NULL until the card first
    # enters INTERVIEW; set to 1 at that point and bumped from the board.
    interview_round: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    applied_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    job: Mapped["Job"] = relationship()


class User(Base):
    """A student/job-seeker account."""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    email: Mapped[str] = mapped_column(String(320), nullable=False, unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    # Phase 1 identity is email-only (no login) — see api/users.py `identify`.
    hashed_password: Mapped[str | None] = mapped_column(String(255), nullable=True)
    # Local-part of this user's personal inbound-email address
    # (u-{forwarding_token}@{INBOUND_EMAIL_DOMAIN}) — see api/emails.py.
    forwarding_token: Mapped[str | None] = mapped_column(String(32), unique=True, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class EmailEvent(Base):
    """Audit trail of one inbound email the parser has seen, matched or not.

    Created by the SendGrid Inbound Parse webhook in api/emails.py.
    """

    __tablename__ = "email_events"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    application_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("applications.id", ondelete="SET NULL"), nullable=True, index=True
    )
    from_address: Mapped[str | None] = mapped_column(Text, nullable=True)
    subject: Mapped[str | None] = mapped_column(Text, nullable=True)
    raw_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    extracted_company: Mapped[str | None] = mapped_column(String(255), nullable=True)
    extracted_round: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    extracted_stage_label: Mapped[str | None] = mapped_column(String(100), nullable=True)
    extracted_status: Mapped[str | None] = mapped_column(String(20), nullable=True)
    matched: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class LogoCache(Base):
    """A cached company favicon, keyed by domain.

    Durable (Postgres-backed) so it survives a frontend restart/redeploy and
    is shared across every instance — see api/logos.py and
    apps/web/app/api/logo/route.ts.
    """

    __tablename__ = "logo_cache"

    domain: Mapped[str] = mapped_column(String(255), primary_key=True)
    content_type: Mapped[str] = mapped_column(String(100), nullable=False)
    image_bytes: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    fetched_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
