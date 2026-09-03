"use client";

import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Upload,
  FileText,
  Sparkles,
  Loader2,
  CheckCircle2,
  XCircle,
  Lightbulb,
  Tag,
  AlertTriangle,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useIdentityStore } from "@/lib/identityStore";
import { uploadResume, analyzeResume, type Resume } from "@/lib/api";

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const ACCEPTED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

function ScoreGauge({ score }: { score: number }) {
  const color = score >= 75 ? "#16a34a" : score >= 50 ? "#eab308" : "#ef4444";
  return (
    <div
      className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-full transition-all duration-700"
      style={{
        background: `conic-gradient(${color} ${score * 3.6}deg, #f1f5f9 0deg)`,
        animation: "gaugeSpinIn 0.6s ease-out both",
      }}
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-inner">
        <span className="text-lg font-extrabold text-gray-800">{score}</span>
      </div>
    </div>
  );
}

function SuggestionSection({
  icon: Icon,
  label,
  labelClassName,
  items,
  itemClassName,
  delay,
}: {
  icon: React.ElementType;
  label: string;
  labelClassName: string;
  items: string[];
  itemClassName: string;
  delay: number;
}) {
  if (items.length === 0) return null;
  return (
    <div style={{ animation: `panelFadeIn 0.3s ease-out ${delay}s both` }}>
      <p className={cn("mb-1.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider", labelClassName)}>
        <Icon className="h-3 w-3" /> {label}
      </p>
      <ul className="flex flex-col gap-1">
        {items.map((s, i) => (
          <li key={i} className={cn("rounded-lg px-2.5 py-1.5 text-[11px] leading-relaxed text-gray-700", itemClassName)}>
            {s}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ResumePanel({
  resumes,
  selectedResumeId,
  onSelectResume,
  jobId,
}: {
  resumes: Resume[];
  selectedResumeId: number | null;
  onSelectResume: (id: number) => void;
  jobId?: number | null;
}) {
  const email = useIdentityStore((s) => s.email);
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const uploadMutation = useMutation({
    mutationFn: uploadResume,
    onSuccess: (resume) => {
      queryClient.invalidateQueries({ queryKey: ["resumes", email] });
      onSelectResume(resume.id);
    },
    onError: (err: Error) => setUploadError(err.message || "Upload failed — please try again."),
  });

  const analyzeMutation = useMutation({
    mutationFn: analyzeResume,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["resumes", email] }),
  });

  const selectedResume = resumes.find((r) => r.id === selectedResumeId) ?? null;

  const handleFile = (file: File | undefined) => {
    if (!file || !email) return;
    setUploadError(null);
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setUploadError("Only PDF and DOCX resumes are supported.");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setUploadError("Resume must be 5MB or smaller.");
      return;
    }
    uploadMutation.mutate({ file, userEmail: email });
  };

  return (
    <div className="scroll-thin flex h-full flex-col overflow-y-auto p-4">
      <style jsx global>{`
        @keyframes panelFadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes gaugeSpinIn {
          from { filter: opacity(0); transform: scale(0.85) rotate(-30deg); }
          to { filter: opacity(1); transform: scale(1) rotate(0deg); }
        }
        @keyframes shakeError {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
      `}</style>

      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-green-100 to-emerald-100">
          <FileText className="h-3.5 w-3.5 text-green-600" />
        </div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Resume Coach</h3>
      </div>

      {/* Upload — real drag & drop, not just a styled button */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleFile(e.dataTransfer.files?.[0]);
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
        className={cn(
          "flex w-full cursor-pointer flex-col items-center gap-1.5 rounded-2xl border-2 border-dashed px-4 py-6 text-center transition-all",
          uploadMutation.isPending && "pointer-events-none opacity-60",
          isDragging ? "scale-[1.02] border-green-400 bg-green-50" : "border-gray-200 bg-gray-50/60 hover:border-green-300 hover:bg-green-50/50"
        )}
      >
        {uploadMutation.isPending ? (
          <Loader2 className="h-5 w-5 animate-spin text-green-500" />
        ) : (
          <Upload className={cn("h-5 w-5 transition-transform", isDragging ? "scale-110 text-green-500" : "text-green-400")} />
        )}
        <span className="text-xs font-semibold text-gray-600">
          {uploadMutation.isPending ? "Uploading…" : isDragging ? "Drop to upload" : "Drop your resume here, or click to browse"}
        </span>
        <span className="text-[10px] text-gray-400">PDF or DOCX, up to 5MB</span>
      </div>

      {uploadError && (
        <div
          className="mt-2 flex items-center gap-1.5 rounded-lg bg-red-50 px-2.5 py-1.5 text-[11px] font-medium text-red-500"
          style={{ animation: "shakeError 0.4s ease-in-out" }}
        >
          <AlertTriangle className="h-3 w-3 shrink-0" />
          {uploadError}
        </div>
      )}

      {resumes.length > 1 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {resumes.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => onSelectResume(r.id)}
              className={cn(
                "truncate rounded-full px-2.5 py-1 text-[10px] font-semibold transition-all",
                r.id === selectedResumeId
                  ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-sm shadow-green-500/20"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              )}
            >
              {r.filename}
            </button>
          ))}
        </div>
      )}

      {/* Selected resume detail */}
      {selectedResume && (
        <div className="mt-4 flex flex-col gap-3" style={{ animation: "panelFadeIn 0.25s ease-out both" }}>
          <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-white p-2.5 shadow-sm">
            <span className="truncate text-xs font-semibold text-gray-700">{selectedResume.filename}</span>
            <button
              type="button"
              onClick={() => analyzeMutation.mutate({ resumeId: selectedResume.id, jobId: jobId ?? undefined })}
              disabled={analyzeMutation.isPending}
              className="flex shrink-0 items-center gap-1 rounded-lg bg-green-50 px-2 py-1 text-[10px] font-bold text-green-700 transition-all hover:bg-green-100 active:scale-95 disabled:opacity-50"
            >
              {analyzeMutation.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Sparkles className="h-3 w-3" />
              )}
              {analyzeMutation.isPending ? "Analyzing…" : selectedResume.ats_score !== null ? "Re-analyze" : "Analyze"}
            </button>
          </div>

          {selectedResume.ats_score !== null && (
            <div
              className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm"
              style={{ animation: "panelFadeIn 0.3s ease-out 0.05s both" }}
            >
              <ScoreGauge score={selectedResume.ats_score} />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">ATS Score</p>
                <p className="mt-0.5 text-[12px] leading-snug text-gray-600">{selectedResume.ats_summary}</p>
              </div>
            </div>
          )}

          {selectedResume.ats_suggestions && (
            <div className="flex flex-col gap-3">
              <SuggestionSection
                icon={CheckCircle2}
                label="Strengths"
                labelClassName="text-green-600"
                items={selectedResume.ats_suggestions.strengths}
                itemClassName="bg-green-50/60"
                delay={0.1}
              />
              <SuggestionSection
                icon={XCircle}
                label="Weaknesses"
                labelClassName="text-red-400"
                items={selectedResume.ats_suggestions.weaknesses}
                itemClassName="bg-red-50/60"
                delay={0.15}
              />
              <SuggestionSection
                icon={Lightbulb}
                label="Suggestions"
                labelClassName="text-green-600"
                items={selectedResume.ats_suggestions.suggestions}
                itemClassName="bg-gray-50"
                delay={0.2}
              />
              {selectedResume.ats_suggestions.missing_keywords.length > 0 && (
                <div style={{ animation: "panelFadeIn 0.3s ease-out 0.25s both" }}>
                  <p className="mb-1.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                    <Tag className="h-3 w-3" /> Missing Keywords
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {selectedResume.ats_suggestions.missing_keywords.map((k, i) => (
                      <span key={i} className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
                        {k}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {resumes.length === 0 && (
        <p className="mt-4 text-center text-[11px] text-gray-300">
          Upload a resume to get an ATS score and rewrite suggestions.
        </p>
      )}
    </div>
  );
}
