import { create } from "zustand";
import { persist } from "zustand/middleware";

interface IdentityStore {
  email: string | null;
  userId: number | null;
  /** u-{token}@{domain} to forward interview emails to, or null if not configured yet. */
  forwardingAddress: string | null;
  setIdentity: (email: string, userId: number, forwardingAddress: string | null) => void;
  clearIdentity: () => void;
}

/**
 * Phase 1 has no login — a stored email is the whole identity, shared by the
 * Application Tracker board and the map's 1-Click Apply flow. Persisted to
 * localStorage so it survives a refresh/reopen.
 */
export const useIdentityStore = create<IdentityStore>()(
  persist(
    (set) => ({
      email: null,
      userId: null,
      forwardingAddress: null,
      setIdentity: (email, userId, forwardingAddress) => set({ email, userId, forwardingAddress }),
      clearIdentity: () => set({ email: null, userId: null, forwardingAddress: null }),
    }),
    { name: "decoding-jobs-identity" }
  )
);
