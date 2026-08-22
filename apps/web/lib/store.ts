import { create } from "zustand";

interface MapSelectionStore {
  selectedCompanyId: number | null;
  setSelectedCompanyId: (id: number | null) => void;
}

/**
 * Holds which company pin is currently selected on the map. The right-hand
 * CompanySidePanel will read from this store to show that company's detail.
 */
export const useMapSelectionStore = create<MapSelectionStore>((set) => ({
  selectedCompanyId: null,
  setSelectedCompanyId: (id) => set({ selectedCompanyId: id }),
}));
