"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Mail, Loader2 } from "lucide-react";

import { useIdentityStore } from "@/lib/identityStore";
import { identify } from "@/lib/api";

/**
 * Phase 1 has no login — a stored email is the whole identity, shared by
 * every page that needs "who is this" (Application Tracker, AI Assistant).
 * Enter once, persisted in localStorage via useIdentityStore.
 */
export function EmailGate({
  title = "Sign in with your email",
  subtitle = "No password needed — just enter your email to continue",
}: {
  title?: string;
  subtitle?: string;
}) {
  const [value, setValue] = useState("");
  const setIdentity = useIdentityStore((s) => s.setIdentity);
  const mutation = useMutation({
    mutationFn: identify,
    onSuccess: (user, email) => setIdentity(email, user.id, user.forwarding_address),
  });

  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center gap-4 p-6"
      style={{ animation: "cardFadeIn 0.4s ease-out both" }}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-green-50 to-emerald-50 shadow-inner">
        <Mail className="h-6 w-6 text-green-500" />
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-gray-900">{title}</p>
        <p className="mt-1 text-xs text-gray-400">{subtitle}</p>
      </div>
      <form
        className="flex w-full max-w-xs gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (value.trim()) mutation.mutate(value.trim());
        }}
      >
        <input
          type="email"
          required
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="you@example.com"
          className="h-10 flex-1 rounded-xl border border-gray-200 px-3 text-sm outline-none transition-all focus:border-green-300 focus:ring-4 focus:ring-green-400/15"
        />
        <button
          type="submit"
          disabled={mutation.isPending}
          className="flex h-10 items-center justify-center rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 px-4 text-sm font-semibold text-white shadow-md shadow-green-500/20 transition-all hover:shadow-lg hover:shadow-green-500/30 active:scale-95 disabled:opacity-50"
        >
          {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continue"}
        </button>
      </form>
    </div>
  );
}
