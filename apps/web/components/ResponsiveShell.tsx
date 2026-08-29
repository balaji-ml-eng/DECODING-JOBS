"use client";

import { X } from "lucide-react";

import { useMapSelectionStore } from "@/lib/store";
import { MapWorkspace } from "./MapWorkspace";
import { CompanySidePanel } from "./CompanySidePanel";

/**
 * Below the `lg` breakpoint there's no room for a 75/25 side-by-side split —
 * the company panel becomes a slide-up bottom sheet instead, opened by
 * selecting a pin and dismissed by the backdrop or the close button.
 */
export function ResponsiveShell() {
  const selectedCompanyId = useMapSelectionStore((s) => s.selectedCompanyId);
  const setSelectedCompanyId = useMapSelectionStore((s) => s.setSelectedCompanyId);
  const mobileSheetOpen = selectedCompanyId !== null;

  return (
    <main className="relative flex min-h-0 flex-1 overflow-hidden">
      <style jsx global>{`
        @keyframes sheetSlideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes backdropFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>

      <section className="h-full w-full lg:w-[75%] lg:shrink-0">
        <MapWorkspace />
      </section>

      {/* Desktop: always-visible side panel */}
      <section className="hidden h-full w-[25%] shrink-0 border-l border-emerald-100 bg-white lg:block">
        <CompanySidePanel />
      </section>

      {/* Mobile / tablet: bottom-sheet overlay */}
      {mobileSheetOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/30"
            style={{ animation: "backdropFadeIn 0.2s ease-out" }}
            onClick={() => setSelectedCompanyId(null)}
          />
          <div
            className="absolute inset-x-0 bottom-0 flex max-h-[82vh] flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl"
            style={{ animation: "sheetSlideUp 0.25s cubic-bezier(0.32,0.72,0,1)" }}
          >
            <div className="relative flex shrink-0 items-center justify-center py-2.5">
              <div className="h-1 w-10 rounded-full bg-gray-200" />
              <button
                type="button"
                onClick={() => setSelectedCompanyId(null)}
                aria-label="Close"
                className="absolute right-3 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <CompanySidePanel />
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
