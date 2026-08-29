import { TopNav } from "@/components/TopNav";
import { KanbanBoard } from "@/components/KanbanBoard";

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
