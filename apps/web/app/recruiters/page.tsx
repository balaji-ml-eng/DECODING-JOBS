import type { Metadata } from "next";

import { TopNav } from "@/components/TopNav";
import { PhoneTabBar } from "@/components/PhoneTabBar";
import { RecruiterWorkspace } from "@/components/RecruiterWorkspace";

export const metadata: Metadata = {
  title: "For Recruiters — DECODING JOBS",
  description: "Search job seekers by role, experience, and work-mode fit, then unlock full profiles and resumes.",
};

export default function RecruitersPage() {
  return (
    <div className="flex h-dvh w-screen flex-col overflow-hidden bg-white">
      <TopNav />
      <RecruiterWorkspace />
      <PhoneTabBar />
    </div>
  );
}
