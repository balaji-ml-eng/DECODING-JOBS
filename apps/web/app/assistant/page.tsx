import { Suspense } from "react";
import type { Metadata, Viewport } from "next";

import { TopNav } from "@/components/TopNav";
import { PhoneTabBar } from "@/components/PhoneTabBar";
import { AssistantWorkspace } from "@/components/AssistantWorkspace";

export const metadata: Metadata = {
  title: "AI Assistant — DECODING JOBS",
  description: "Chat about real jobs and companies, and get resume ATS feedback.",
};

// Android Chrome: the keyboard resizes the page, so the composer stays above it.
export const viewport: Viewport = { interactiveWidget: "resizes-content" };

export default function AssistantPage() {
  return (
    // 100dvh, not 100vh. On mobile browsers 100vh is measured *with the URL bar
    // hidden*, so the real visible height is smaller and the composer and the
    // last message end up underneath the browser chrome. The h-screen class
    // stays on as the fallback for anything without dvh support. w-full, not
    // w-screen: w-screen ignores the scrollbar and can add a horizontal scroll.
    <div
      className="flex h-screen w-full flex-col overflow-hidden bg-white"
      style={{ height: "var(--chat-height, 100dvh)" }}
    >
      <TopNav />
      <Suspense fallback={null}>
        <AssistantWorkspace />
      </Suspense>
      <PhoneTabBar />
    </div>
  );
}
