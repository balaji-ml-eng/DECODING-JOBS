"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { FolderOpen, ListChecks, MapPin } from "lucide-react";

import { Switch } from "@/components/ui/switch";
import { useIdentityStore } from "@/lib/identityStore";
import { getApplicationBoard } from "@/lib/api";

export function TopNav() {
  const [trackerEnabled, setTrackerEnabled] = useState(true);
  const email = useIdentityStore((s) => s.email);

  const { data: board } = useQuery({
    queryKey: ["applicationBoard", email],
    queryFn: () => getApplicationBoard(email as string),
    enabled: !!email,
  });

  return (
    <header
      className="flex h-14 shrink-0 items-center border-b border-emerald-100 px-3 sm:px-6"
      style={{
        background: "linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)",
      }}
    >
      {/* Logo / Brand */}
      <Link href="/" className="flex items-center gap-2 mr-4 sm:gap-2.5 sm:mr-8">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 shadow-md shadow-green-500/20">
          <MapPin className="h-4 w-4 text-white" />
        </div>
        <span className="hidden text-sm font-bold tracking-tight text-gray-900 sm:inline">
          DECODING<span className="text-green-600">JOBS</span>
        </span>
      </Link>

      <div className="flex items-center gap-1 ml-auto">
        <button className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm font-medium text-gray-600 transition-all hover:bg-green-50 hover:text-green-700 sm:px-3">
          <FolderOpen className="h-4 w-4" />
          <span className="hidden sm:inline">My Vault</span>
        </button>

        <div className="mx-1 h-5 w-px bg-gray-200 sm:mx-2" />

        <Link
          href="/tracker"
          className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm font-medium text-gray-600 transition-all hover:bg-green-50 hover:text-green-700 sm:px-3"
        >
          <ListChecks className="h-4 w-4" />
          <span className="hidden sm:inline">App Tracker</span>
          {board && board.length > 0 && (
            <span className="rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-bold text-green-700">
              {board.length}
            </span>
          )}
        </Link>

        <div className="mx-1 h-5 w-px bg-gray-200 sm:mx-2" />

        <Switch
          checked={trackerEnabled}
          onCheckedChange={setTrackerEnabled}
          aria-label="Toggle live app tracker updates"
        />
      </div>
    </header>
  );
}
