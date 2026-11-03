"use client";

import { useRef } from "react";
import { X } from "lucide-react";

import { useMapSelectionStore } from "@/lib/store";
import { MapWorkspace } from "./MapWorkspace";
import { CompanySidePanel } from "./CompanySidePanel";

/** How far the sheet must be dragged before letting go closes it. */
const SWIPE_CLOSE_PX = 90;

/**
 * Drag the sheet down to close it, the way phone sheets work. The close button
 * sits at the top of a tall sheet, out of a thumb's reach. Only starts when the
 * content is scrolled to the top, so it never fights normal scrolling.
 */
function useSwipeDownToClose(onClose: () => void) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const startY = useRef<number | null>(null);
  const dragY = useRef(0);

  const release = (close: boolean) => {
    const sheet = sheetRef.current;
    startY.current = null;
    dragY.current = 0;
    if (close) return onClose();
    if (sheet) {
      sheet.style.transition = "transform 0.2s ease-out";
      sheet.style.transform = "";
    }
  };

  return {
    sheetRef,
    swipeHandlers: {
      onTouchStart: (e: React.TouchEvent) => {
        let scrolled = false;
        for (let el = e.target as HTMLElement | null; el && el !== sheetRef.current; el = el.parentElement) {
          if (el.scrollTop > 0) scrolled = true;
        }
        startY.current = scrolled ? null : (e.touches[0]?.clientY ?? null);
      },
      onTouchMove: (e: React.TouchEvent) => {
        if (startY.current === null) return;
        const dy = (e.touches[0]?.clientY ?? startY.current) - startY.current;
        // Moving up first means scrolling the content, not closing the sheet.
        if (dy < 0) return release(false);
        dragY.current = dy;
        if (sheetRef.current) {
          sheetRef.current.style.transition = "none";
          sheetRef.current.style.transform = `translateY(${dy}px)`;
        }
      },
      onTouchEnd: () => {
        if (startY.current !== null) release(dragY.current > SWIPE_CLOSE_PX);
      },
      onTouchCancel: () => release(false),
    },
  };
}

/**
 * The map is full-bleed at all times — the company panel only exists when
 * something is selected, sliding in over the map (desktop) or up from the
 * bottom (mobile) rather than permanently reserving a quarter of the screen
 * for an empty "select a company" placeholder.
 */
export function ResponsiveShell() {
  const selectedCompanyId = useMapSelectionStore((s) => s.selectedCompanyId);
  const setSelectedCompanyId = useMapSelectionStore((s) => s.setSelectedCompanyId);
  const isOpen = selectedCompanyId !== null;
  const { sheetRef, swipeHandlers } = useSwipeDownToClose(() => setSelectedCompanyId(null));

  return (
    <main className="relative flex min-h-0 flex-1 overflow-hidden">
      <style jsx global>{`
        @keyframes sheetSlideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes panelSlideIn {
          from { transform: translateX(100%); opacity: 0.6; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes backdropFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>

      {/* The map always fills the whole workspace. */}
      <section className="h-full w-full">
        <MapWorkspace />
      </section>

      {/* Desktop: floating panel, only when a company is selected. */}
      {isOpen && (
        <div
          className="absolute bottom-3 right-3 top-3 z-30 hidden w-[380px] overflow-hidden rounded-xl border border-gray-100 bg-white shadow-2xl lg:block"
          style={{ animation: "panelSlideIn 0.28s cubic-bezier(0.32,0.72,0,1)" }}
        >
          <button
            type="button"
            onClick={() => setSelectedCompanyId(null)}
            aria-label="Close"
            className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-gray-500 shadow-sm backdrop-blur-sm transition-colors hover:bg-gray-100"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          <CompanySidePanel />
        </div>
      )}

      {/* Mobile / tablet: bottom-sheet overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/30"
            style={{ animation: "backdropFadeIn 0.2s ease-out" }}
            onClick={() => setSelectedCompanyId(null)}
          />
          <div
            ref={sheetRef}
            {...swipeHandlers}
            className="absolute inset-x-0 bottom-0 flex max-h-[85dvh] flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl"
            style={{ animation: "sheetSlideUp 0.25s cubic-bezier(0.32,0.72,0,1)" }}
          >
            <div className="relative flex shrink-0 items-center justify-center py-2.5">
              <div className="h-1 w-10 rounded-full bg-gray-200" />
              <button
                type="button"
                onClick={() => setSelectedCompanyId(null)}
                aria-label="Close"
                className="absolute right-1 top-0 flex h-11 w-11 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <CompanySidePanel />
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
