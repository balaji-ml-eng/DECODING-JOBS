import type { Metadata } from "next";

import { TopNav } from "@/components/TopNav";
import { KanbanBoard } from "@/components/KanbanBoard";

export const metadata: Metadata = {
  title: "Application Tracker — DECODING JOBS",
  description: "Track your job applications from Saved to Offered.",
};

export default function TrackerPage() {
  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-white">
      <TopNav />
      <main className="min-h-0 flex-1">
        <KanbanBoard />
      </main>
    </div>
  );
}
