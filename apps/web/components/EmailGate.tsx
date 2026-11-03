"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { useMutation } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, Loader2, Mail } from "lucide-react";

import { Input } from "@/components/ui/input";
import { useIdentityStore } from "@/lib/identityStore";
import { googleAuth, requestMagicLink } from "@/lib/api";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: { theme?: string; size?: string; shape?: string; width?: string }
          ) => void;
        };
      };
    };
  }
}

/**
 * Real sign-in, two ways: Google (a verified ID token) or a magic link
 * emailed to you (click it, land on /auth/verify, get a session). Both
 * issue the same kind of bearer session token — this used to just trust
 * whatever email a client claimed, with nothing proving they owned it.
 */
export function EmailGate({
  title = "Sign in to continue",
  subtitle = "Sign in with Google, or we'll email you a one-time link — no password to set up",
}: {
  title?: string;
  subtitle?: string;
}) {
  const setIdentity = useIdentityStore((s) => s.setIdentity);
  const buttonRef = useRef<HTMLDivElement>(null);
  const [gsiReady, setGsiReady] = useState(false);
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  const [email, setEmail] = useState("");
  const [linkSent, setLinkSent] = useState(false);
  const [devLink, setDevLink] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);

  const googleMutation = useMutation({
    mutationFn: googleAuth,
    onSuccess: (session) =>
      setIdentity(session.user.email, session.user.id, session.session_token, session.user.forwarding_address),
  });

  const linkMutation = useMutation({
    mutationFn: () => requestMagicLink(email.trim()),
    onSuccess: (result) => {
      // The API reports whether the mail actually left (`sent`). In production
      // with no SendGrid key configured it returns sent:false and no dev link —
      // telling the tester "check your inbox" for a mail that was never sent is
      // a dead end, so surface the real state instead.
      if (result.sent || result.dev_magic_link) {
        setLinkError(null);
        setLinkSent(true);
        setDevLink(result.dev_magic_link);
      } else {
        setLinkError(
          "We couldn't email the sign-in link just now — email delivery isn't set up yet. Please try again later."
        );
      }
    },
  });

  useEffect(() => {
    if (!gsiReady || !clientId || !buttonRef.current || !window.google) return;
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: (response) => googleMutation.mutate(response.credential),
    });
    window.google.accounts.id.renderButton(buttonRef.current, {
      theme: "outline",
      size: "large",
      shape: "pill",
      width: "280",
    });
    // mutation is a new object every render; only re-init when the script
    // finishes loading or the client ID changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gsiReady, clientId]);

  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center gap-4 p-6"
      style={{ animation: "cardFadeIn 0.4s ease-out both" }}
    >
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onReady={() => setGsiReady(true)}
      />
      <div className="text-center">
        {/* A real heading, not a styled <p>. On every screen that gates with
            this component the gate *is* the page, so without an h1 those
            pages (tracker, preferences, candidate search) had no heading at
            all — nothing to announce, nothing to navigate by. */}
        <h1 className="text-sm font-semibold text-gray-900">{title}</h1>
        <p className="mt-1 max-w-xs text-xs text-gray-500">{subtitle}</p>
      </div>

      {clientId && (
        <>
          <div ref={buttonRef} className="min-h-[44px]" />
          {googleMutation.isPending && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Signing in…
            </div>
          )}
          {googleMutation.isError && (
            <p className="max-w-xs text-center text-xs text-red-500">{(googleMutation.error as Error).message}</p>
          )}
          <div className="flex w-full max-w-xs items-center gap-2 text-xs text-gray-500">
            <div className="h-px flex-1 bg-gray-100" />
            or
            <div className="h-px flex-1 bg-gray-100" />
          </div>
        </>
      )}

      {linkSent ? (
        <div className="flex max-w-xs flex-col items-center gap-2 text-center">
          <div className="flex items-center gap-1.5 text-sm font-semibold text-green-700">
            <Mail className="h-4 w-4" /> Check your inbox
          </div>
          <p className="text-xs text-gray-500">
            We sent a sign-in link to <span className="font-medium text-gray-600">{email}</span> — it expires in 15 minutes.
          </p>
          {devLink && (
            <div className="mt-1 flex w-full flex-col gap-1.5 rounded-xl bg-amber-50 px-3.5 py-2.5 text-left text-xs text-amber-700">
              <div className="flex items-center gap-1.5 font-semibold">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> Email isn&apos;t configured yet — dev link:
              </div>
              <a href={devLink} className="break-all font-medium underline">
                {devLink}
              </a>
            </div>
          )}
        </div>
      ) : (
        <form
          onSubmit={(e) => { e.preventDefault(); setLinkError(null); linkMutation.mutate(); }}
          className="flex w-full max-w-xs flex-col gap-2"
        >
          <Input
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button
            type="submit"
            disabled={linkMutation.isPending || !email.trim()}
            className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-gray-200 text-sm font-bold text-gray-700 lg:min-h-10 transition-all hover:bg-gray-50 disabled:opacity-60"
          >
            {linkMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
            Email me a sign-in link
          </button>
          {linkMutation.isError && (
            <p className="text-center text-xs text-red-500">{(linkMutation.error as Error).message}</p>
          )}
          {linkError && !linkMutation.isError && (
            <p className="text-center text-xs text-red-500">{linkError}</p>
          )}
        </form>
      )}
    </div>
  );
}
