/** Typed client for the core-api service (services/core-api). */

export type EmploymentType = "full_time" | "internship" | "contract" | "part_time";
export type WorkMode = "remote" | "hybrid" | "onsite";

export interface CompanySentiment {
  pros: string[];
  cons: string[];
}

export interface Company {
  id: number;
  name: string;
  description: string | null;
  logo_url: string | null;
  website_url: string | null;
  address: string;
  latitude: number;
  longitude: number;
  sentiment_summary: CompanySentiment | null;
  culture_score: number | null;
  // Phase 2: real company enrichment fields.
  sector: string | null;
  stage: string | null;
  area: string | null;
  city: string | null;
  founded_year: number | null;
  team_size: string | null;
  total_funding: string | null;
  linkedin_url: string | null;
  jobs_url: string | null;
  status: string | null;
  active_job_count: number;
  created_at: string;
}

export interface Job {
  id: number;
  company_id: number;
  title: string;
  description: string;
  employment_type: EmploymentType;
  min_experience_years: number;
  salary_min: string | null;
  salary_max: string | null;
  work_mode: WorkMode | null;
  apply_url: string | null;
  is_active: boolean;
  // Phase 2: job source tracking.
  source: string | null;
  source_url: string | null;
  created_at: string;
}

export type ApplicationStatus = "saved" | "applied" | "viewed" | "interview" | "rejected" | "offer";

export interface Application {
  id: number;
  job_id: number;
  user_id: number | null;
  resume_filename: string | null;
  status: ApplicationStatus;
  interview_round: number | null;
  applied_at: string;
}

/** A Kanban card: an Application with its Job (and that Job's Company) embedded. */
export interface ApplicationBoardCard extends Application {
  job: Job & { company: Company };
  /** True if an inbound forwarded email (not a manual click) last updated this card. */
  auto_tracked: boolean;
}

export interface BoundingBox {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`);

  if (!response.ok) {
    throw new Error(`Request to ${path} failed (${response.status})`);
  }

  return response.json() as Promise<T>;
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Request to ${path} failed (${response.status})`);
  }

  return response.json() as Promise<T>;
}

async function patchJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Request to ${path} failed (${response.status})`);
  }

  return response.json() as Promise<T>;
}

/** Matches GET /api/v1/companies/search on services/core-api. */
export async function searchCompaniesInBoundingBox(
  bbox: BoundingBox,
  filters?: { sector?: string; city?: string; hiring_only?: boolean; stage?: string; area?: string; company_type?: string }
): Promise<Company[]> {
  const params = new URLSearchParams({
    min_lat: bbox.minLat.toString(),
    min_lng: bbox.minLng.toString(),
    max_lat: bbox.maxLat.toString(),
    max_lng: bbox.maxLng.toString(),
  });

  if (filters?.sector) params.set("sector", filters.sector);
  if (filters?.city) params.set("city", filters.city);
  if (filters?.hiring_only) params.set("hiring_only", "true");
  if (filters?.stage) params.set("stage", filters.stage);
  if (filters?.area) params.set("area", filters.area);
  if (filters?.company_type) params.set("company_type", filters.company_type);

  return fetchJson<Company[]>(`/api/v1/companies/search?${params.toString()}`);
}

/** Matches GET /api/v1/companies/sectors on services/core-api. */
export async function getSectors(city?: string): Promise<{ sector: string; count: number }[]> {
  const params = city ? `?city=${encodeURIComponent(city)}` : "";
  return fetchJson<{ sector: string; count: number }[]>(`/api/v1/companies/sectors${params}`);
}

/** Matches GET /api/v1/companies/stages on services/core-api. */
export async function getStages(city?: string): Promise<{ stage: string; count: number }[]> {
  const params = city ? `?city=${encodeURIComponent(city)}` : "";
  return fetchJson<{ stage: string; count: number }[]>(`/api/v1/companies/stages${params}`);
}

/** Matches GET /api/v1/companies/areas on services/core-api. */
export async function getAreas(city?: string): Promise<{ area: string; count: number }[]> {
  const params = city ? `?city=${encodeURIComponent(city)}` : "";
  return fetchJson<{ area: string; count: number }[]>(`/api/v1/companies/areas${params}`);
}

/** Matches GET /api/v1/companies/types on services/core-api. */
export async function getTypes(city?: string): Promise<{ type: string; count: number }[]> {
  const params = city ? `?city=${encodeURIComponent(city)}` : "";
  return fetchJson<{ type: string; count: number }[]>(`/api/v1/companies/types${params}`);
}

/** Matches GET /api/v1/companies/cities on services/core-api. */
export async function getCities(): Promise<{ city: string; count: number; hiring_count: number }[]> {
  return fetchJson<{ city: string; count: number; hiring_count: number }[]>(`/api/v1/companies/cities`);
}

/** Matches GET /api/v1/companies/{company_id} on services/core-api. */
export async function getCompanyById(companyId: number): Promise<Company> {
  return fetchJson<Company>(`/api/v1/companies/${companyId}`);
}

/** Matches GET /api/v1/jobs?company_id={company_id} on services/core-api. */
export async function getJobsByCompany(companyId: number): Promise<Job[]> {
  const params = new URLSearchParams({ company_id: companyId.toString() });
  return fetchJson<Job[]>(`/api/v1/jobs?${params.toString()}`);
}

/** Matches GET /api/v1/jobs/search?q=... on services/core-api. */
export interface JobSearchResult {
  company_id: number;
  company_name: string;
  city: string | null;
  sector: string | null;
  area: string | null;
  latitude: number | null;
  longitude: number | null;
  website_url: string | null;
  logo_url: string | null;
  active_job_count: number;
  matching_jobs: {
    id: number;
    title: string;
    work_mode: string | null;
    apply_url: string | null;
    salary_min: string | null;
    salary_max: string | null;
    source: string | null;
  }[];
}

export async function searchJobs(
  q: string,
  city?: string,
): Promise<JobSearchResult[]> {
  const params = new URLSearchParams({ q });
  if (city) params.set("city", city);
  return fetchJson<JobSearchResult[]>(`/api/v1/jobs/search?${params.toString()}`);
}

export async function getJobSuggestions(
  q: string,
  city?: string,
): Promise<{ title: string }[]> {
  const params = new URLSearchParams({ q });
  if (city) params.set("city", city);
  return fetchJson<{ title: string }[]>(`/api/v1/jobs/suggestions?${params.toString()}`);
}

/** Matches POST /api/v1/applications/submit on services/core-api. */
export async function submitApplication(params: {
  jobId: number;
  resumeFilename: string;
  userEmail?: string | null;
}): Promise<Application> {
  return postJson<Application>("/api/v1/applications/submit", {
    job_id: params.jobId,
    resume_filename: params.resumeFilename,
    user_email: params.userEmail || undefined,
  });
}

export interface IdentifyResult {
  id: number;
  email: string;
  forwarding_token: string | null;
  /** u-{token}@{domain}, or null if email auto-tracking isn't configured yet. */
  forwarding_address: string | null;
}

/** Matches POST /api/v1/users/identify on services/core-api — Phase 1's password-less sign-in. */
export async function identify(email: string): Promise<IdentifyResult> {
  return postJson<IdentifyResult>("/api/v1/users/identify", { email });
}

/** Matches GET /api/v1/applications/board on services/core-api — the Kanban tracker's cards. */
export async function getApplicationBoard(email: string): Promise<ApplicationBoardCard[]> {
  const params = new URLSearchParams({ email });
  return fetchJson<ApplicationBoardCard[]>(`/api/v1/applications/board?${params.toString()}`);
}

/** Matches POST /api/v1/applications/save on services/core-api — bookmark a job pre-application. */
export async function saveJob(params: { jobId: number; userEmail: string }): Promise<ApplicationBoardCard> {
  return postJson<ApplicationBoardCard>("/api/v1/applications/save", {
    job_id: params.jobId,
    user_email: params.userEmail,
  });
}

/** Matches PATCH /api/v1/applications/{id}/status on services/core-api — a Kanban column drop. */
export async function updateApplicationStatus(params: {
  applicationId: number;
  status: ApplicationStatus;
}): Promise<ApplicationBoardCard> {
  return patchJson<ApplicationBoardCard>(`/api/v1/applications/${params.applicationId}/status`, {
    status: params.status,
  });
}

/** Matches PATCH /api/v1/applications/{id}/round on services/core-api — advance the interview round. */
export async function updateInterviewRound(params: {
  applicationId: number;
  interviewRound: number;
}): Promise<ApplicationBoardCard> {
  return patchJson<ApplicationBoardCard>(`/api/v1/applications/${params.applicationId}/round`, {
    interview_round: params.interviewRound,
  });
}
