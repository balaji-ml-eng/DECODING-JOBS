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
  /** True if a job went live in the last few days — powers the pin's "hiring now" flash. */
  recently_hiring: boolean;
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

/** Matches GET /api/v1/jobs/{job_id} on services/core-api — a Job with its Company embedded. */
export async function getJobById(jobId: number): Promise<Job & { company: Company }> {
  return fetchJson<Job & { company: Company }>(`/api/v1/jobs/${jobId}`);
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

// ---------------------------------------------------------------------------
// AI Assistant — resume ATS coach + chat
// ---------------------------------------------------------------------------

export interface AtsSuggestions {
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  missing_keywords: string[];
}

export interface Resume {
  id: number;
  filename: string;
  ats_score: number | null;
  ats_summary: string | null;
  ats_suggestions: AtsSuggestions | null;
  uploaded_at: string;
  analyzed_at: string | null;
}

/** Matches POST /api/v1/resumes/upload on services/core-api. */
export async function uploadResume(params: { file: File; userEmail: string }): Promise<Resume> {
  const form = new FormData();
  form.append("file", params.file);
  form.append("user_email", params.userEmail);

  const response = await fetch(`${API_BASE_URL}/api/v1/resumes/upload`, {
    method: "POST",
    body: form,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.detail || `Resume upload failed (${response.status})`);
  }
  return response.json() as Promise<Resume>;
}

/** Matches POST /api/v1/resumes/{id}/analyze on services/core-api. */
export async function analyzeResume(params: { resumeId: number; jobId?: number }): Promise<Resume> {
  return postJson<Resume>(`/api/v1/resumes/${params.resumeId}/analyze`, {
    job_id: params.jobId ?? null,
  });
}

/** Matches GET /api/v1/resumes on services/core-api. */
export async function listResumes(email: string): Promise<Resume[]> {
  const params = new URLSearchParams({ email });
  return fetchJson<Resume[]>(`/api/v1/resumes?${params.toString()}`);
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatJobResult {
  id: number;
  title: string;
  company_name: string;
  company_id: number;
  sector: string | null;
  city: string | null;
  work_mode: WorkMode | null;
  apply_url: string | null;
  website_url: string | null;
}

export interface ChatCompanyResult {
  id: number;
  name: string;
  sector: string | null;
  city: string | null;
  stage: string | null;
  website_url: string | null;
  active_job_count: number;
}

export interface ChatResponse {
  reply: string;
  jobs: ChatJobResult[];
  companies: ChatCompanyResult[];
  conversation_id: number | null;
}

/** Matches POST /api/v1/chat on services/core-api. */
export async function sendChatMessage(params: {
  messages: ChatMessage[];
  resumeId?: number | null;
  jobId?: number | null;
  userEmail?: string | null;
  conversationId?: number | null;
}): Promise<ChatResponse> {
  return postJson<ChatResponse>("/api/v1/chat", {
    messages: params.messages,
    resume_id: params.resumeId ?? null,
    job_id: params.jobId ?? null,
    user_email: params.userEmail ?? null,
    conversation_id: params.conversationId ?? null,
  });
}

export interface ChatConversationSummary {
  id: number;
  title: string;
  updated_at: string;
}

export interface ChatConversationMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
  jobs: ChatJobResult[];
  companies: ChatCompanyResult[];
  resume: Resume | null;
  created_at: string;
}

/** Matches GET /api/v1/chat/conversations on services/core-api. */
export async function listChatConversations(email: string): Promise<ChatConversationSummary[]> {
  const params = new URLSearchParams({ email });
  return fetchJson<ChatConversationSummary[]>(`/api/v1/chat/conversations?${params.toString()}`);
}

/** Matches GET /api/v1/chat/conversations/{id}/messages on services/core-api. */
export async function getConversationMessages(
  conversationId: number,
  email: string
): Promise<ChatConversationMessage[]> {
  const params = new URLSearchParams({ email });
  return fetchJson<ChatConversationMessage[]>(
    `/api/v1/chat/conversations/${conversationId}/messages?${params.toString()}`
  );
}

/** Matches DELETE /api/v1/chat/conversations/{id} on services/core-api. */
export async function deleteChatConversation(conversationId: number, email: string): Promise<void> {
  const params = new URLSearchParams({ email });
  const response = await fetch(
    `${API_BASE_URL}/api/v1/chat/conversations/${conversationId}?${params.toString()}`,
    { method: "DELETE" }
  );
  if (!response.ok) {
    throw new Error(`Failed to delete conversation (${response.status})`);
  }
}

/** Matches POST /api/v1/chat/conversations/messages on services/core-api. */
export async function appendChatMessage(params: {
  conversationId?: number | null;
  userEmail: string;
  role: "user" | "assistant";
  content: string;
  resumeId?: number | null;
}): Promise<{ conversation_id: number; message_id: number }> {
  return postJson<{ conversation_id: number; message_id: number }>("/api/v1/chat/conversations/messages", {
    conversation_id: params.conversationId ?? null,
    user_email: params.userEmail,
    role: params.role,
    content: params.content,
    resume_id: params.resumeId ?? null,
  });
}

export interface CompanyRegisterParams {
  founderEmail: string;
  name: string;
  websiteUrl: string;
  description?: string;
  sector?: string;
  stage?: string;
  city?: string;
  area?: string;
  streetAddress?: string;
  latitude?: number;
  longitude?: number;
  teamSize?: string;
  foundedYear?: number;
  linkedinUrl?: string;
}

/** Matches POST /api/v1/companies/register on services/core-api. */
export async function registerCompany(params: CompanyRegisterParams): Promise<Company> {
  const response = await fetch(`${API_BASE_URL}/api/v1/companies/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      founder_email: params.founderEmail,
      name: params.name,
      website_url: params.websiteUrl,
      description: params.description || null,
      sector: params.sector || null,
      stage: params.stage || null,
      city: params.city || null,
      area: params.area || null,
      street_address: params.streetAddress || null,
      latitude: params.latitude ?? null,
      longitude: params.longitude ?? null,
      team_size: params.teamSize || null,
      founded_year: params.foundedYear || null,
      linkedin_url: params.linkedinUrl || null,
    }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.detail || `Company registration failed (${response.status})`);
  }
  return response.json() as Promise<Company>;
}

export interface JobRegisterParams {
  founderEmail: string;
  companyId: number;
  title: string;
  description: string;
  employmentType?: EmploymentType;
  workMode?: WorkMode;
  salaryMin?: number;
  salaryMax?: number;
  applyUrl?: string;
}

/** Matches POST /api/v1/jobs/register on services/core-api. */
export async function registerJob(params: JobRegisterParams): Promise<Job> {
  const response = await fetch(`${API_BASE_URL}/api/v1/jobs/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      founder_email: params.founderEmail,
      company_id: params.companyId,
      title: params.title,
      description: params.description,
      employment_type: params.employmentType || "full_time",
      work_mode: params.workMode || null,
      salary_min: params.salaryMin || null,
      salary_max: params.salaryMax || null,
      apply_url: params.applyUrl || null,
    }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.detail || `Job posting failed (${response.status})`);
  }
  return response.json() as Promise<Job>;
}
