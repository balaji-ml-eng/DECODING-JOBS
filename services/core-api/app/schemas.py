"""Pydantic request/response schemas for the core-api service."""

from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.domain import ApplicationStatus, EmploymentType, WorkMode


class CompanySentimentRead(BaseModel):
    """AI-synthesized pros/cons shown in the Company Pulse section."""

    model_config = ConfigDict(from_attributes=True)

    pros: list[str] = Field(default_factory=list)
    cons: list[str] = Field(default_factory=list)


class CompanyRead(BaseModel):
    """API representation of a Company, with PostGIS geometry flattened to lat/lng."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str | None = None
    logo_url: str | None = None
    website_url: str | None = None
    address: str
    latitude: float
    longitude: float
    sentiment_summary: CompanySentimentRead | None = None
    culture_score: float | None = None
    # Phase 2: real company enrichment fields.
    sector: str | None = None
    stage: str | None = None
    area: str | None = None
    city: str | None = None
    founded_year: int | None = None
    team_size: str | None = None
    total_funding: str | None = None
    linkedin_url: str | None = None
    jobs_url: str | None = None
    status: str | None = None
    active_job_count: int = 0
    created_at: datetime

    @model_validator(mode="before")
    @classmethod
    def extract_active_job_count(cls, data: "CompanyRead") -> "CompanyRead":
        """Pull the _active_job_count attribute set by the API route onto the response."""
        if hasattr(data, "_active_job_count"):
            data.active_job_count = data._active_job_count
        elif isinstance(data, dict) and "_active_job_count" in data:
            data["active_job_count"] = data.pop("_active_job_count")
        return data


class BoundingBoxQuery(BaseModel):
    """Validated map-viewport bounding box for the spatial company search endpoint."""

    model_config = ConfigDict(extra="forbid")

    min_lat: float = Field(..., ge=-90, le=90, description="Southwest corner latitude")
    min_lng: float = Field(..., ge=-180, le=180, description="Southwest corner longitude")
    max_lat: float = Field(..., ge=-90, le=90, description="Northeast corner latitude")
    max_lng: float = Field(..., ge=-180, le=180, description="Northeast corner longitude")

    @model_validator(mode="after")
    def check_bounds_are_ordered(self) -> "BoundingBoxQuery":
        if self.min_lat >= self.max_lat:
            raise ValueError("min_lat must be less than max_lat")
        if self.min_lng >= self.max_lng:
            raise ValueError("min_lng must be less than max_lng")
        return self


class JobRead(BaseModel):
    """API representation of a Job posting."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    company_id: int
    title: str
    description: str
    employment_type: EmploymentType
    min_experience_years: int
    salary_min: Decimal | None = None
    salary_max: Decimal | None = None
    work_mode: WorkMode | None = None
    apply_url: str | None = None
    is_active: bool
    # Phase 2: job source tracking.
    source: str | None = None
    source_url: str | None = None
    created_at: datetime


class JobWithCompanyRead(JobRead):
    """A Job posting with its parent Company embedded — used for the detail view."""

    company: CompanyRead


class ApplicationSubmitRequest(BaseModel):
    """Body for POST /applications/submit — the Document Vault's SUBMIT APPLICATION action."""

    model_config = ConfigDict(extra="forbid")

    job_id: int
    resume_filename: str = Field(..., min_length=1, max_length=255)
    user_email: str | None = Field(None, description="Ties the application to a tracker board")


class ApplicationSaveRequest(BaseModel):
    """Body for POST /applications/save — bookmark a job into the tracker's Saved column."""

    model_config = ConfigDict(extra="forbid")

    job_id: int
    user_email: str = Field(..., min_length=3, max_length=320)


class ApplicationStatusUpdate(BaseModel):
    """Body for PATCH /applications/{id}/status — a Kanban column drop."""

    model_config = ConfigDict(extra="forbid")

    status: ApplicationStatus


class ApplicationRoundUpdate(BaseModel):
    """Body for PATCH /applications/{id}/round — advancing/setting the interview round."""

    model_config = ConfigDict(extra="forbid")

    interview_round: int = Field(..., ge=1)


class ApplicationRead(BaseModel):
    """API representation of a submitted Application."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    job_id: int
    user_id: int | None = None
    resume_filename: str | None = None
    status: ApplicationStatus
    interview_round: int | None = None
    applied_at: datetime


class ApplicationBoardRead(ApplicationRead):
    """An Application with its Job (and that Job's Company) embedded — one Kanban card."""

    job: JobWithCompanyRead
    auto_tracked: bool = False

    @model_validator(mode="before")
    @classmethod
    def extract_auto_tracked(cls, data: "ApplicationBoardRead") -> "ApplicationBoardRead":
        """Pulls the _auto_tracked attribute set by the API route onto the response."""
        if hasattr(data, "_auto_tracked"):
            data.auto_tracked = data._auto_tracked
        elif isinstance(data, dict) and "_auto_tracked" in data:
            data["auto_tracked"] = data.pop("_auto_tracked")
        return data


class UserIdentifyRequest(BaseModel):
    """Body for POST /users/identify — Phase 1's password-less sign-in."""

    model_config = ConfigDict(extra="forbid")

    email: str = Field(..., min_length=3, max_length=320)


class UserRead(BaseModel):
    """API representation of a User."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    forwarding_token: str | None = None
    forwarding_address: str | None = None

    @model_validator(mode="before")
    @classmethod
    def extract_forwarding_address(cls, data: "UserRead") -> "UserRead":
        """Pulls the _forwarding_address attribute set by the API route onto the response."""
        if hasattr(data, "_forwarding_address"):
            data.forwarding_address = data._forwarding_address
        elif isinstance(data, dict) and "_forwarding_address" in data:
            data["forwarding_address"] = data.pop("_forwarding_address")
        return data


class EmailEventRead(BaseModel):
    """API representation of an EmailEvent — an unmatched-emails audit entry."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    from_address: str | None = None
    subject: str | None = None
    extracted_company: str | None = None
    extracted_round: int | None = None
    extracted_stage_label: str | None = None
    extracted_status: str | None = None
    matched: bool
    created_at: datetime


class ResumeRead(BaseModel):
    """API representation of a Resume, including its ATS analysis once run."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    filename: str
    ats_score: int | None = None
    ats_summary: str | None = None
    ats_suggestions: dict | None = None
    uploaded_at: datetime
    analyzed_at: datetime | None = None


class ResumeAnalyzeRequest(BaseModel):
    """Body for POST /resumes/{id}/analyze — optionally tailored to one job."""

    model_config = ConfigDict(extra="forbid")

    job_id: int | None = None


class ChatMessage(BaseModel):
    """One turn in a chat conversation."""

    model_config = ConfigDict(extra="forbid")

    role: str = Field(..., pattern="^(user|assistant)$")
    content: str = Field(..., min_length=1, max_length=4000)


class ChatRequest(BaseModel):
    """Body for POST /chat — the full conversation so far, stateless per-turn."""

    model_config = ConfigDict(extra="forbid")

    messages: list[ChatMessage] = Field(..., min_length=1, max_length=50)
    resume_id: int | None = None
    job_id: int | None = None
    user_email: str | None = None


class ChatJobResult(BaseModel):
    """A job the assistant found via a tool call, shown as a result card."""

    id: int
    title: str
    company_name: str
    company_id: int
    sector: str | None = None
    city: str | None = None
    work_mode: str | None = None
    apply_url: str | None = None
    website_url: str | None = None


class ChatCompanyResult(BaseModel):
    """A company the assistant found via a tool call, shown as a result card."""

    id: int
    name: str
    sector: str | None = None
    city: str | None = None
    stage: str | None = None
    website_url: str | None = None
    active_job_count: int = 0


class ChatResponse(BaseModel):
    reply: str
    jobs: list[ChatJobResult] = Field(default_factory=list)
    companies: list[ChatCompanyResult] = Field(default_factory=list)
