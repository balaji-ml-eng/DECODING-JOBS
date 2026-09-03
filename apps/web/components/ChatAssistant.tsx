"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Sparkles,
  Send,
  Loader2,
  MapPin,
  Briefcase,
  FileText,
  Bot,
  User,
  RotateCcw,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useMapSelectionStore } from "@/lib/store";
import { useIdentityStore } from "@/lib/identityStore";
import {
  getJobById,
  sendChatMessage,
  type ChatMessage,
  type ChatJobResult,
  type ChatCompanyResult,
} from "@/lib/api";

const STARTER_PROMPTS = [
  "Remote frontend roles in Bengaluru",
  "Fintech companies hiring in Chennai",
  "AI internships for freshers",
  "Help me prep for a backend engineer interview",
];

function logoUrlFor(websiteUrl: string | null): string | null {
  if (!websiteUrl) return null;
  try {
    return `/api/logo?domain=${new URL(websiteUrl).hostname}`;
  } catch {
    return null;
  }
}

function getInitials(name: string): string {
  return name
    .split(/[\s&]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

interface Turn {
  role: "user" | "assistant";
  content: string;
  jobs?: ChatJobResult[];
  companies?: ChatCompanyResult[];
}

function JobResultCard({ job }: { job: ChatJobResult }) {
  const router = useRouter();
  const setSelectedCompanyId = useMapSelectionStore((s) => s.setSelectedCompanyId);
  const logo = logoUrlFor(job.website_url);

  return (
    <button
      type="button"
      onClick={() => {
        setSelectedCompanyId(job.company_id);
        router.push("/");
      }}
      className="flex w-full items-center gap-2.5 rounded-xl border border-gray-100 bg-white p-2.5 text-left transition-all hover:-translate-y-0.5 hover:border-green-200 hover:shadow-[0_6px_20px_rgba(22,163,74,0.12)]"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 text-[11px] font-bold text-green-700">
        {logo ? (
          <img src={logo} alt={job.company_name} className="h-full w-full object-contain p-1" />
        ) : (
          getInitials(job.company_name)
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12.5px] font-bold text-gray-900">{job.title}</p>
        <p className="truncate text-[11px] text-gray-500">{job.company_name}</p>
      </div>
      {job.city && (
        <span className="flex shrink-0 items-center gap-0.5 text-[10px] text-gray-400">
          <MapPin className="h-2.5 w-2.5" />
          {job.city}
        </span>
      )}
    </button>
  );
}

function CompanyResultCard({ company }: { company: ChatCompanyResult }) {
  const router = useRouter();
  const setSelectedCompanyId = useMapSelectionStore((s) => s.setSelectedCompanyId);
  const logo = logoUrlFor(company.website_url);

  return (
    <button
      type="button"
      onClick={() => {
        setSelectedCompanyId(company.id);
        router.push("/");
      }}
      className="flex w-full items-center gap-2.5 rounded-xl border border-gray-100 bg-white p-2.5 text-left transition-all hover:-translate-y-0.5 hover:border-green-200 hover:shadow-[0_6px_20px_rgba(22,163,74,0.12)]"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 text-[11px] font-bold text-green-700">
        {logo ? (
          <img src={logo} alt={company.name} className="h-full w-full object-contain p-1" />
        ) : (
          getInitials(company.name)
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12.5px] font-bold text-gray-900">{company.name}</p>
        <p className="truncate text-[11px] text-gray-500">{company.sector || "—"} · {company.city || "—"}</p>
      </div>
      {company.active_job_count > 0 && (
        <span className="flex shrink-0 items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-bold text-green-700">
          <Briefcase className="h-2.5 w-2.5" />
          {company.active_job_count}
        </span>
      )}
    </button>
  );
}

export function ChatAssistant({
  jobId,
  resumeId,
  onOpenResumePanel,
}: {
  jobId: number | null;
  resumeId: number | null;
  onOpenResumePanel: () => void;
}) {
  const email = useIdentityStore((s) => s.email);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const seededJobRef = useRef<number | null>(null);

  const { data: contextJob } = useQuery({
    queryKey: ["job", jobId],
    queryFn: () => getJobById(jobId as number),
    enabled: jobId !== null,
  });

  const mutation = useMutation({
    mutationFn: sendChatMessage,
    onSuccess: (response) => {
      setTurns((prev) => [
        ...prev,
        { role: "assistant", content: response.reply, jobs: response.jobs, companies: response.companies },
      ]);
    },
    onError: () => {
      setTurns((prev) => [
        ...prev,
        { role: "assistant", content: "Something went wrong reaching the assistant — please try again." },
      ]);
    },
  });

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || mutation.isPending) return;

    const nextTurns: Turn[] = [...turns, { role: "user", content: trimmed }];
    setTurns(nextTurns);
    setInput("");

    const history: ChatMessage[] = nextTurns.map((t) => ({ role: t.role, content: t.content }));
    mutation.mutate({ messages: history, resumeId, jobId, userEmail: email });
  };

  // Auto-seed a prep conversation when arriving via "Prep for this role."
  useEffect(() => {
    if (contextJob && seededJobRef.current !== contextJob.id && turns.length === 0) {
      seededJobRef.current = contextJob.id;
      send(`Help me prepare for the ${contextJob.title} role at ${contextJob.company.name}.`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextJob]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [turns, mutation.isPending]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <style jsx global>{`
        @keyframes turnFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes typingBounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-4px); }
        }
      `}</style>

      {/* Header */}
      <div className="flex shrink-0 items-center gap-2.5 border-b border-emerald-100 bg-gradient-to-r from-white to-green-50/40 px-5 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 shadow-md shadow-green-500/20">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-gray-900">AI Job Search Assistant</p>
          {contextJob ? (
            <p className="truncate text-[11px] text-green-600">
              Prepping for {contextJob.title} @ {contextJob.company.name}
            </p>
          ) : (
            <p className="text-[11px] text-gray-400">Ask about real jobs, companies, or interview prep</p>
          )}
        </div>
        {turns.length > 0 && (
          <button
            type="button"
            onClick={() => setTurns([])}
            title="Start a new chat"
            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-600 shadow-sm transition-all hover:bg-green-50 hover:text-green-700"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">New chat</span>
          </button>
        )}
        <button
          type="button"
          onClick={onOpenResumePanel}
          className="flex shrink-0 items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-600 shadow-sm transition-all hover:bg-green-50 hover:text-green-700 lg:hidden"
        >
          <FileText className="h-3.5 w-3.5" />
          Resume
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="scroll-thin min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {turns.length === 0 && (
          <div className="mx-auto flex max-w-md flex-col items-center gap-4 pt-10 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-green-50 to-emerald-50 shadow-inner">
              <Bot className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">What are you looking for?</p>
              <p className="mt-1 text-xs text-gray-400">
                I search real jobs and companies from the map — tell me a role, a city, or ask for interview prep.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {STARTER_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => send(prompt)}
                  className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-all hover:border-green-200 hover:bg-green-50 hover:text-green-700"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mx-auto flex max-w-2xl flex-col gap-4">
          {turns.map((turn, i) => (
            <div
              key={i}
              className={cn("flex gap-2.5", turn.role === "user" ? "flex-row-reverse" : "flex-row")}
              style={{ animation: "turnFadeIn 0.25s ease-out both" }}
            >
              <div
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                  turn.role === "user" ? "bg-gray-100 text-gray-500" : "bg-gradient-to-br from-green-500 to-emerald-600 text-white"
                )}
              >
                {turn.role === "user" ? <User className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
              </div>
              <div className={cn("flex max-w-[85%] flex-col gap-2", turn.role === "user" && "items-end")}>
                <div
                  className={cn(
                    "whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed shadow-sm",
                    turn.role === "user"
                      ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white"
                      : "border border-gray-100 bg-white text-gray-700"
                  )}
                >
                  {turn.content}
                </div>
                {turn.jobs && turn.jobs.length > 0 && (
                  <div className="flex w-full flex-col gap-1.5">
                    {turn.jobs.map((job) => (
                      <JobResultCard key={job.id} job={job} />
                    ))}
                  </div>
                )}
                {turn.companies && turn.companies.length > 0 && (
                  <div className="flex w-full flex-col gap-1.5">
                    {turn.companies.map((company) => (
                      <CompanyResultCard key={company.id} company={company} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {mutation.isPending && (
            <div className="flex gap-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 text-white">
                <Sparkles className="h-3.5 w-3.5" />
              </div>
              <div className="flex items-center gap-1 rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="h-1.5 w-1.5 rounded-full bg-green-400"
                    style={{ animation: `typingBounce 1.2s ease-in-out ${i * 0.15}s infinite` }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-gray-100 bg-white p-3">
        <form
          className="mx-auto flex max-w-2xl items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about jobs, companies, or interview prep…"
            className="h-11 flex-1 rounded-2xl border border-gray-200 bg-gray-50/60 px-4 text-sm outline-none transition-all focus:border-green-300 focus:bg-white focus:ring-4 focus:ring-green-400/15"
          />
          <button
            type="submit"
            disabled={mutation.isPending || !input.trim()}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-md shadow-green-500/20 transition-all hover:shadow-lg active:scale-95 disabled:opacity-40"
          >
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </form>
      </div>
    </div>
  );
}
