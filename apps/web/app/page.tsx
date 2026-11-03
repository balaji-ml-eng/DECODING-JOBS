import { TopNav } from "@/components/TopNav";
import { PhoneTabBar } from "@/components/PhoneTabBar";
import { ResponsiveShell } from "@/components/ResponsiveShell";

export default function Home() {
  return (
    <div className="flex h-dvh w-screen flex-col overflow-hidden bg-white">
      <TopNav />
      <ResponsiveShell />
      <PhoneTabBar />
    </div>
  );
}
