import { TopNav } from "@/components/TopNav";
import { MapWorkspace } from "@/components/MapWorkspace";
import { CompanySidePanel } from "@/components/CompanySidePanel";

export default function Home() {
  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-white">
      <TopNav />
      <main className="flex min-h-0 flex-1">
        <section className="h-full w-[75%] shrink-0">
          <MapWorkspace />
        </section>
        <section className="h-full w-[25%] shrink-0 border-l border-emerald-100 bg-white">
          <CompanySidePanel />
        </section>
      </main>
    </div>
  );
}
