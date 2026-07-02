import { create } from 'zustand'
import type { FilterState } from '@/types/models'

interface SavedFilter {
  id: string
  name: string
  filters: FilterState
}

interface FilterStore {
  filters: Record<string, FilterState>
  savedFilters: SavedFilter[]
  setFilter: (key: string, filter: Partial<FilterState>) => void
  resetFilter: (key: string) => void
  saveFilter: (name: string, filters: FilterState) => void
  deleteSavedFilter: (id: string) => void
  loadSavedFilter: (id: string) => FilterState | undefined
}

const defaultFilter: FilterState = {
  search: '',
  sortBy: 'createdAt',
  sortOrder: 'desc',
}

export const useFilterStore = create<FilterStore>((set, get) => ({
  filters: {},
  savedFilters: JSON.parse(localStorage.getItem('saved_filters') || '[]'),

  setFilter: (key, filter) =>
    set((s) => ({
      filters: {
        ...s.filters,
        [key]: { ...(s.filters[key] || defaultFilter), ...filter },
      },
    })),

  resetFilter: (key) =>
    set((s) => ({
      filters: { ...s.filters, [key]: { ...defaultFilter } },
    })),

  saveFilter: (name, filters) => {
    const saved: SavedFilter = { id: crypto.randomUUID(), name, filters }
    set((s) => {
      const updated = [...s.savedFilters, saved]
      localStorage.setItem('saved_filters', JSON.stringify(updated))
      return { savedFilters: updated }
    })
  },

  deleteSavedFilter: (id) =>
    set((s) => {
      const updated = s.savedFilters.filter((f) => f.id !== id)
      localStorage.setItem('saved_filters', JSON.stringify(updated))
      return { savedFilters: updated }
    }),

  loadSavedFilter: (id) => get().savedFilters.find((f) => f.id === id)?.filters,
}))
