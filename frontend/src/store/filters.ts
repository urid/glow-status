// Implemented in Task 10
import { create } from 'zustand'

interface FiltersState {
  project: string | null
  featureArea: string | null
  statusGroups: string[]
  search: string
  setProject: (p: string | null) => void
  setFeatureArea: (a: string | null) => void
  toggleStatusGroup: (s: string) => void
  clearStatusGroups: () => void
  setSearch: (q: string) => void
}

export const useFiltersStore = create<FiltersState>((set) => ({
  project: null,
  featureArea: null,
  statusGroups: [],
  search: '',
  setProject: (project) => set({ project }),
  setFeatureArea: (featureArea) => set({ featureArea }),
  toggleStatusGroup: (s) => set((state) => ({
    statusGroups: state.statusGroups.includes(s)
      ? state.statusGroups.filter((g) => g !== s)
      : [...state.statusGroups, s],
  })),
  clearStatusGroups: () => set({ statusGroups: [] }),
  setSearch: (search) => set({ search }),
}))
