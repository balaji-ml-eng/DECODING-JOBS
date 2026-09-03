import { Suspense } from "react";
import type { Metadata } from "next";

import { TopNav } from "@/components/TopNav";
import { AssistantWorkspace } from "@/components/AssistantWorkspace";

export const metadata: Metadata = {
  title: "AI Assistant — DECODING JOBS",
  description: "Chat about real jobs and companies, and get resume ATS feedback.",
};

export default function AssistantPage() {
  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-white">
      <TopNav />
      <Suspense fallback={null}>
        <AssistantWorkspace />
      </Suspense>
    </div>
  );
}
