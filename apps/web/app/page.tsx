import { TopNav } from "@/components/TopNav";
import { ResponsiveShell } from "@/components/ResponsiveShell";

export default function Home() {
  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-white">
      <TopNav />
      <ResponsiveShell />
    </div>
  );
}
