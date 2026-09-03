"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { FileText, X } from "lucide-react";

import { useIdentityStore } from "@/lib/identityStore";
import { listResumes } from "@/lib/api";
import { EmailGate } from "./EmailGate";
import { ChatAssistant } from "./ChatAssistant";
import { ResumePanel } from "./ResumePanel";

/**
 * Same split-panel shape as the map's ResponsiveShell: chat is the main
 * area, the Resume Coach panel sits alongside it on desktop and becomes a
 * toggled bottom sheet below `lg`.
 */
export function AssistantWorkspace() {
  const email = useIdentityStore((s) => s.email);
  const searchParams = useSearchParams();
  const jobId = searchParams.get("jobId");
  const jobIdNum = jobId ? Number(jobId) : null;
  const [mobileResumeOpen, setMobileResumeOpen] = useState(false);
  const [selectedResumeId, setSelectedResumeId] = useState<number | null>(null);

  const { data: resumes } = useQuery({
    queryKey: ["resumes", email],
    queryFn: () => listResumes(email as string),
    enabled: !!email,
  });

  useEffect(() => {
    if (resumes?.[0] && selectedResumeId === null) {
      setSelectedResumeId(resumes[0].id);
    }
  }, [resumes, selectedResumeId]);

  if (!email) {
    return (
      <EmailGate
        title="AI Job Search Assistant"
        subtitle="Enter your email to chat and get resume feedback"
      />
    );
  }

  return (
    <div className="relative flex min-h-0 flex-1 overflow-hidden bg-gray-50/40">
      <style jsx global>{`
        @keyframes sheetSlideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes backdropFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>

      <section className="flex h-full min-w-0 flex-1 flex-col">
        <ChatAssistant
          jobId={jobIdNum}
          resumeId={selectedResumeId}
          onOpenResumePanel={() => setMobileResumeOpen(true)}
        />
      </section>

      {/* Desktop: always-visible resume panel */}
      <section className="hidden h-full w-[340px] shrink-0 border-l border-emerald-100 bg-white lg:block">
        <ResumePanel
          resumes={resumes ?? []}
          selectedResumeId={selectedResumeId}
          onSelectResume={setSelectedResumeId}
          jobId={jobIdNum}
        />
      </section>

      {/* Mobile / tablet: bottom-sheet overlay */}
      {mobileResumeOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/30"
            style={{ animation: "backdropFadeIn 0.2s ease-out" }}
            onClick={() => setMobileResumeOpen(false)}
          />
          <div
            className="absolute inset-x-0 bottom-0 flex max-h-[82vh] flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl"
            style={{ animation: "sheetSlideUp 0.25s cubic-bezier(0.32,0.72,0,1)" }}
          >
            <div className="relative flex shrink-0 items-center justify-center py-2.5">
              <div className="h-1 w-10 rounded-full bg-gray-200" />
              <button
                type="button"
                onClick={() => setMobileResumeOpen(false)}
                aria-label="Close"
                className="absolute right-3 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <ResumePanel
                resumes={resumes ?? []}
                selectedResumeId={selectedResumeId}
                onSelectResume={setSelectedResumeId}
              />
            </div>
          </div>
        </div>
      )}

      {/* Mobile: floating toggle for the resume panel */}
      <button
        type="button"
        onClick={() => setMobileResumeOpen(true)}
        className="fixed bottom-5 right-5 z-30 flex items-center gap-2 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-green-500/30 lg:hidden"
      >
        <FileText className="h-4 w-4" />
        Resume
      </button>
    </div>
  );
}
