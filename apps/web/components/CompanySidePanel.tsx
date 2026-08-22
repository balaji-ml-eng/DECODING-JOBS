"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  CheckCircle2,
  XCircle,
  FileText,
  ChevronDown,
  Sparkles,
  MapPin,
  AlertTriangle,
  Loader2,
  Briefcase,
  Users,
  Calendar,
  ExternalLink,
  Zap,
  Globe,
  Linkedin,
  TrendingUp,
  Building2,
  ArrowUpRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useMapSelectionStore } from "@/lib/store";
import {
  getCompanyById,
  getJobsByCompany,
  submitApplication,
  type Job,
  type WorkMode,
  type Company,
} from "@/lib/api";

const WORK_MODE_LABELS: Record<WorkMode, string> = {
  remote: "Remote",
  hybrid: "Hybrid",
  onsite: "On-site",
};

function formatSalaryRange(job: Job): string {
  if (job.salary_min && job.salary_max) {
    return `₹${Number(job.salary_min).toLocaleString("en-IN")} – ₹${Number(job.salary_max).toLocaleString("en-IN")}`;
  }
  return "";
}

const SOURCE_BADGES: Record<string, { label: string; cls: string }> = {
  linkedin: { label: 'LinkedIn', cls: 'rounded-md bg-blue-50 px-1.5 py-0.5 text-[9px] font-bold text-blue-600' },
  indeed: { label: 'Indeed', cls: 'rounded-md bg-blue-50 px-1.5 py-0.5 text-[9px] font-bold text-blue-700' },
  glassdoor: { label: 'Glassdoor', cls: 'rounded-md bg-green-50 px-1.5 py-0.5 text-[9px] font-bold text-green-700' },
  naukri: { label: 'Naukri', cls: 'rounded-md bg-indigo-50 px-1.5 py-0.5 text-[9px] font-bold text-indigo-600' },
  internshala: { label: 'Internshala', cls: 'rounded-md bg-yellow-50 px-1.5 py-0.5 text-[9px] font-bold text-yellow-700' },
  foundit: { label: 'Foundit', cls: 'rounded-md bg-orange-50 px-1.5 py-0.5 text-[9px] font-bold text-orange-600' },
  wellfound: { label: 'Wellfound', cls: 'rounded-md bg-purple-50 px-1.5 py-0.5 text-[9px] font-bold text-purple-600' },
  careers: { label: 'Careers', cls: 'rounded-md bg-gray-100 px-1.5 py-0.5 text-[9px] font-bold text-gray-600' },
};

function EmptyState() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-green-50 to-emerald-50">
        <MapPin className="h-6 w-6 text-green-400" />
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-900">Select a company</p>
        <p className="mt-1 text-xs text-gray-400">Click any pin on the map to view roles & info</p>
      </div>
    </div>
  );
}

function ErrorState() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50">
        <AlertTriangle className="h-6 w-6 text-red-400" />
      </div>
      <p className="text-sm font-medium text-gray-900">Couldn&apos;t load details</p>
      <p className="text-xs text-gray-400">Try selecting again</p>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="flex h-full w-full flex-col gap-3 p-4">
      <div className="h-20 animate-pulse rounded-2xl bg-green-50" />
      <div className="h-16 animate-pulse rounded-xl bg-gray-50" />
      <div className="h-32 animate-pulse rounded-xl bg-gray-50" />
    </div>
  );
}

function CompanyInfoBar({ company }: { company: Company }) {
  const items = [
    company.active_job_count > 0 && {
      icon: Briefcase,
      label: `${company.active_job_count} open`,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    company.team_size && {
      icon: Users,
      label: company.team_size,
      color: "text-gray-600",
      bg: "bg-gray-50",
    },
    company.founded_year && {
      icon: Calendar,
      label: `Est. ${company.founded_year}`,
      color: "text-gray-600",
      bg: "bg-gray-50",
    },
    company.total_funding && {
      icon: TrendingUp,
      label: company.total_funding,
      color: "text-gray-600",
      bg: "bg-gray-50",
    },
  ].filter(Boolean) as { icon: React.ElementType; label: string; color: string; bg: string }[];

  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item, i) => (
        <span
          key={i}
          className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold ${item.color} ${item.bg}`}
        >
          <item.icon className="h-3 w-3" />
          {item.label}
        </span>
      ))}
    </div>
  );
}

function RoleCard({ job }: { job: Job }) {
  const mode = job.work_mode ? WORK_MODE_LABELS[job.work_mode] : null;
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-3 transition-all hover:border-green-200 hover:shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-gray-900">{job.title}</p>
          {job.salary_min || job.salary_max ? (
            <p className="mt-0.5 text-[11px] text-gray-400">{formatSalaryRange(job)}</p>
          ) : null}
          <div className="mt-1.5 flex items-center gap-1 flex-wrap">
            {mode && (
              <span className="rounded-md bg-gray-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-gray-500">
                {mode}
              </span>
            )}
            {job.source && SOURCE_BADGES[job.source] && (
              <span className={SOURCE_BADGES[job.source]!.cls}>
                {SOURCE_BADGES[job.source]!.label}
              </span>
            )}
            {job.source && !SOURCE_BADGES[job.source] && (
              <span className="rounded-md bg-gray-50 px-1.5 py-0.5 text-[9px] font-bold text-gray-500 capitalize">
                {job.source}
              </span>
            )}
          </div>
        </div>
        {job.apply_url ? (
          <a
            href={job.apply_url}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 px-2.5 py-1.5 text-[10px] font-bold text-white shadow-sm shadow-green-500/20 transition-all hover:shadow-md hover:shadow-green-500/30"
          >
            <Zap className="h-3 w-3" />
            APPLY
          </a>
        ) : (
          <span className="shrink-0 rounded-lg bg-gray-100 px-2.5 py-1.5 text-[10px] font-bold text-gray-400">
            APPLY
          </span>
        )}
      </div>
    </div>
  );
}

export function CompanySidePanel() {
  const selectedCompanyId = useMapSelectionStore((s) => s.selectedCompanyId);
  const [selectedResume, setSelectedResume] = useState("Quantum_Analytics_Resume.pdf");

  const companyQuery = useQuery({
    queryKey: ["company", selectedCompanyId],
    queryFn: () => getCompanyById(selectedCompanyId as number),
    enabled: selectedCompanyId !== null,
  });

  const jobsQuery = useQuery({
    queryKey: ["jobs", "company", selectedCompanyId],
    queryFn: () => getJobsByCompany(selectedCompanyId as number),
    enabled: selectedCompanyId !== null,
  });

  const applyMutation = useMutation({
    mutationFn: (v: { jobId: number; resumeFilename: string }) => submitApplication(v),
  });

  useEffect(() => { applyMutation.reset(); }, [selectedCompanyId]);

  if (selectedCompanyId === null) return <EmptyState />;
  if (companyQuery.isLoading) return <LoadingSkeleton />;
  if (companyQuery.isError || !companyQuery.data) return <ErrorState />;

  const company = companyQuery.data;
  const jobs = jobsQuery.data ?? [];
  const pros = company.sentiment_summary?.pros ?? [];
  const cons = company.sentiment_summary?.cons ?? [];
  const hasSentiment = pros.length > 0 || cons.length > 0;
  const primaryJob = jobs[0];
  // Dynamic section numbering — skip sections with no data
  let _sec = 0;
  const hasApplied = applyMutation.isSuccess && applyMutation.data?.job_id === primaryJob?.id;

  // Extract domain for display
  const websiteDomain = company.website_url
    ? (() => {
        try { return new URL(company.website_url).hostname.replace("www.", ""); }
        catch {
          const url = company.website_url.replace(/^[/]+/, '').split(/[/s?#]/)[0];
          return url && url.includes('.') ? url.replace("www.", "") : null;
        }
      })()
    : null;

  return (
    <div className="scroll-thin flex h-full w-full flex-col gap-3 overflow-y-auto p-3">
      {/* ── Company Header ── */}
      <div className="rounded-2xl bg-gradient-to-br from-green-50 via-white to-emerald-50/50 p-3.5">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-bold text-gray-900">{company.name}</h1>
            <div className="mt-1 flex items-center gap-1.5">
              {company.sector && (
                <span className="rounded-md bg-green-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-green-700">
                  {company.sector}
                </span>
              )}
              {company.area && (
                <span className="flex items-center gap-0.5 text-[11px] text-gray-500">
                  <MapPin className="h-2.5 w-2.5 text-green-400" />
                  {company.area}{company.city ? `, ${company.city}` : ""}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-2.5">
          <CompanyInfoBar company={company} />
        </div>
      </div>

      {/* ── Links ── */}
      {(company.website_url || company.linkedin_url) && (
        <div className="flex gap-1.5">
          {company.website_url && (
            <a
              href={company.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-[11px] font-semibold text-gray-600 transition-all hover:border-green-200 hover:bg-green-50 hover:text-green-700"
            >
              <Globe className="h-3.5 w-3.5" />
              {websiteDomain || "Website"}
              <ArrowUpRight className="h-3 w-3 text-gray-400" />
            </a>
          )}
          {company.linkedin_url && (
            <a
              href={company.linkedin_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-[11px] font-semibold text-gray-600 transition-all hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
            >
              <Linkedin className="h-3.5 w-3.5" />
              LinkedIn
              <ArrowUpRight className="h-3 w-3 text-gray-400" />
            </a>
          )}
        </div>
      )}

      {/* ── Section: Open Roles ── */}
      <div className="rounded-xl border border-gray-100 bg-white p-3">
        <div className="mb-2 flex items-center gap-1.5">
          <span className="flex h-4.5 w-4.5 items-center justify-center rounded-md bg-green-100 text-[9px] font-bold text-green-700">{++_sec}</span>
          <h2 className="text-xs font-bold text-gray-900">Open Roles</h2>
          {jobs.length > 0 && (
            <span className="ml-auto rounded-full bg-green-100 px-1.5 py-0.5 text-[9px] font-bold text-green-700">{jobs.length}</span>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          {jobs.length > 0 ? (
            jobs.map((job) => <RoleCard key={job.id} job={job} />)
          ) : (
            <p className="py-2 text-center text-[11px] text-gray-400">No active roles right now</p>
          )}
        </div>
      </div>

      {/* ── Section: Company Pulse (only if data exists) ── */}
      {hasSentiment && (
        <div className="rounded-xl border border-gray-100 bg-white p-3">
          <div className="mb-2 flex items-center gap-1.5">
            <span className="flex h-4.5 w-4.5 items-center justify-center rounded-md bg-green-100 text-[9px] font-bold text-green-700">{++_sec}</span>
            <h2 className="text-xs font-bold text-gray-900">Company Pulse</h2>
          </div>
          <div className="flex flex-col gap-1">
            {pros.map((pro) => (
              <div key={pro} className="flex items-start gap-1.5 rounded-lg bg-green-50/50 px-2 py-1.5">
                <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-green-500" />
                <span className="text-[11px] text-gray-700">{pro}</span>
              </div>
            ))}
            {cons.map((con) => (
              <div key={con} className="flex items-start gap-1.5 rounded-lg bg-red-50/50 px-2 py-1.5">
                <XCircle className="mt-0.5 h-3 w-3 shrink-0 text-red-400" />
                <span className="text-[11px] text-gray-700">{con}</span>
              </div>
            ))}
          </div>
          {company.culture_score !== null && (
            <div className="mt-2 flex items-center justify-between rounded-lg bg-gray-50 px-2.5 py-1.5">
              <span className="text-[10px] font-medium text-gray-500">Culture Score</span>
              <span className="text-[11px] font-bold text-gray-900">{company.culture_score!.toFixed(1)} / 5</span>
            </div>
          )}
        </div>
      )}

      {/* ── Section: Apply ── */}
      <div className="rounded-xl border border-green-100 bg-gradient-to-br from-green-50/30 to-white p-3">
        <div className="mb-2 flex items-center gap-1.5">
          <span className="flex h-4.5 w-4.5 items-center justify-center rounded-md bg-green-100 text-[9px] font-bold text-green-700">{++_sec}</span>
          <h2 className="text-xs font-bold text-gray-900">Apply</h2>
        </div>
        <div className="flex flex-col gap-2">
          {/* Resume selector */}
          <button
            type="button"
            className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-left transition-all hover:border-green-200"
          >
            <span className="flex items-center gap-1.5 text-[11px] text-gray-600">
              <FileText className="h-3.5 w-3.5 text-green-500" />
              <span className="truncate">{selectedResume}</span>
            </span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-gray-400" />
          </button>

          {/* Tailor with AI */}
          <button
            type="button"
            onClick={() => setSelectedResume("Quantum_Analytics_Resume_Tailored.pdf")}
            className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-green-200 bg-white py-1.5 text-[10px] font-semibold text-green-600 transition-all hover:bg-green-50"
          >
            <Sparkles className="h-3 w-3" />
            Tailor with AI
          </button>

          {/* Submit */}
          {hasApplied ? (
            <div className="flex items-center justify-center gap-1.5 rounded-xl bg-green-500 py-2.5 text-[11px] font-bold text-white shadow-md shadow-green-500/20">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Applied
            </div>
          ) : (
            <button
              className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 py-2.5 text-[11px] font-bold text-white shadow-lg shadow-green-500/25 transition-all hover:shadow-xl hover:shadow-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!primaryJob || applyMutation.isPending}
              onClick={() => {
                if (!primaryJob) return;
                applyMutation.mutate({ jobId: primaryJob.id, resumeFilename: selectedResume });
              }}
            >
              {applyMutation.isPending ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Submitting…</>
              ) : (
                <><Zap className="h-3.5 w-3.5" /> SUBMIT</>
              )}
            </button>
          )}
          {applyMutation.isError && (
            <p className="text-[10px] text-red-500">Submission failed. Try again.</p>
          )}
        </div>
      </div>

      {/* ── Section: Job Description ── */}
      {primaryJob && (
        <div className="rounded-xl border border-gray-100 bg-white p-3">
          <div className="mb-2 flex items-center gap-1.5">
            <span className="flex h-4.5 w-4.5 items-center justify-center rounded-md bg-green-100 text-[9px] font-bold text-green-700">{++_sec}</span>
            <h2 className="text-xs font-bold text-gray-900">Job Description</h2>
          </div>
          <p className="text-[11px] leading-relaxed text-gray-500">
            {primaryJob.description || "No description available."}
          </p>
        </div>
      )}

      {/* Bottom spacer */}
      <div className="h-2" />
    </div>
  );
}
