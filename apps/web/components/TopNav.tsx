"use client";

import { useState } from "react";
import { FolderOpen, ListChecks, Zap, MapPin } from "lucide-react";

import { Switch } from "@/components/ui/switch";

export function TopNav() {
  const [trackerEnabled, setTrackerEnabled] = useState(true);

  return (
    <header
      className="flex h-14 shrink-0 items-center border-b border-emerald-100 px-6"
      style={{
        background: "linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)",
      }}
    >
      {/* Logo / Brand */}
      <div className="flex items-center gap-2.5 mr-8">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 shadow-md shadow-green-500/20">
          <MapPin className="h-4 w-4 text-white" />
        </div>
        <span className="text-sm font-bold tracking-tight text-gray-900">
          DECODING<span className="text-green-600">JOBS</span>
        </span>
      </div>

      <div className="flex items-center gap-1 ml-auto">
        <button className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 transition-all hover:bg-green-50 hover:text-green-700">
          <FolderOpen className="h-4 w-4" />
          My Vault
          <span className="rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-bold text-green-700">8</span>
        </button>

        <div className="mx-2 h-5 w-px bg-gray-200" />

        <button className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 transition-all hover:bg-green-50 hover:text-green-700">
          <ListChecks className="h-4 w-4" />
          App Tracker
          <span className="rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-bold text-green-700">5</span>
        </button>

        <div className="mx-2 h-5 w-px bg-gray-200" />

        <Switch
          checked={trackerEnabled}
          onCheckedChange={setTrackerEnabled}
          aria-label="Toggle live app tracker updates"
        />
      </div>
    </header>
  );
}
