"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ListChecks, Map as MapIcon, Sparkles, UserCog } from "lucide-react";

import { cn } from "@/lib/utils";
import { useIdentityStore } from "@/lib/identityStore";
import { getApplicationBoard } from "@/lib/api";

const TABS = [
  { href: "/", label: "Map", icon: MapIcon },
  { href: "/assistant", label: "AI Assistant", icon: Sparkles },
  { href: "/tracker", label: "Tracker", icon: ListChecks },
  { href: "/profile", label: "Preferences", icon: UserCog },
];

const SHOW_AFTER_TYPING_MS = 300;
const TEXT_FIELD = "textarea, input:not([type=checkbox], [type=radio], [type=file], [type=range]), [contenteditable]";

/**
 * Main navigation on phones, in thumb reach and with text labels. It sits in the
 * page's flex column, so each page's content ends above it. Hidden while typing,
 * when it would only take space from above the keyboard.
 */
export function PhoneTabBar() {
  const pathname = usePathname();
  const email = useIdentityStore((s) => s.email);
  const [typing, setTyping] = useState(false);

  const { data: board } = useQuery({
    queryKey: ["applicationBoard", email],
    queryFn: () => getApplicationBoard(),
    enabled: !!email,
  });

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    // Delayed so a tap that takes focus off the field finishes first. Showing the
    // bar straight away moves everything up mid-tap, so the tap misses its button.
    const onFocusOut = () => {
      clearTimeout(timer);
      timer = setTimeout(() => setTyping(false), SHOW_AFTER_TYPING_MS);
    };
    const onFocusIn = (e: FocusEvent) => {
      if ((e.target as Element).matches?.(TEXT_FIELD)) {
        clearTimeout(timer);
        setTyping(true);
      } else {
        onFocusOut();
      }
    };
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
    };
  }, []);

  if (typing) return null;

  return (
    <nav
      aria-label="Main"
      className="grid shrink-0 grid-cols-4 border-t border-gray-200 bg-white md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {TABS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        const badge = href === "/tracker" ? board?.length : 0;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex h-14 min-w-0 flex-col items-center justify-center gap-0.5 text-xs transition-colors",
              active ? "font-semibold text-green-700" : "font-medium text-gray-500"
            )}
          >
            <span className="relative">
              <Icon className="h-5 w-5" aria-hidden="true" />
              {!!badge && (
                <span className="absolute -right-2.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-green-600 px-1 text-[10px] font-bold text-white">
                  {badge}
                </span>
              )}
            </span>
            <span className="max-w-full truncate px-0.5">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
