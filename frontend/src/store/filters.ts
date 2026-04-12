// Implemented in Task 10
import { create } from 'zustand'

interface FiltersState {
  project: string | null
  featureArea: string | null
  statusGroup: string | null
  search: string
  setProject: (p: string | null) => void
  setFeatureArea: (a: string | null) => void
  setStatusGroup: (s: string | null) => void
  setSearch: (q: string) => void
}

export const useFiltersStore = create<FiltersState>((set) => ({
  project: null,
  featureArea: null,
  statusGroup: null,
  search: '',
  setProject: (project) => set({ project }),
  setFeatureArea: (featureArea) => set({ featureArea }),
  setStatusGroup: (statusGroup) => set({ statusGroup }),
  setSearch: (search) => set({ search }),
}))
