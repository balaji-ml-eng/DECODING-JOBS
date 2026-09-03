import { create } from "zustand";

interface LiveUpdatesStore {
  enabled: boolean;
  toggle: (enabled: boolean) => void;
}

/**
 * Backs the TopNav "live updates" switch — when on, board queries poll on an
 * interval instead of only refetching on navigation/mutation. Session-only
 * (not persisted): a real toggle, not decoration, but no need to remember it
 * across visits.
 */
export const useLiveUpdatesStore = create<LiveUpdatesStore>((set) => ({
  enabled: true,
  toggle: (enabled) => set({ enabled }),
}));
