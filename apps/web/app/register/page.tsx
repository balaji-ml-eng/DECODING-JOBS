import type { Metadata } from "next";

import { TopNav } from "@/components/TopNav";
import { RegisterCompanyForm } from "@/components/RegisterCompanyForm";

export const metadata: Metadata = {
  title: "List your startup — DECODING JOBS",
  description: "Add your company to the map and post open roles, verified by your work email.",
};

export default function RegisterPage() {
  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-white">
      <TopNav />
      <main className="scroll-thin flex-1 overflow-y-auto bg-gradient-to-b from-green-50/40 to-white">
        <RegisterCompanyForm />
      </main>
    </div>
  );
}
