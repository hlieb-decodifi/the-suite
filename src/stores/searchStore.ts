'use client';

import { create } from 'zustand';

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

// Function to get initial search term from URL if in browser
function getInitialSearchTerm(): string {
  if (!isBrowser) return '';

  const params = new URLSearchParams(window.location.search);
  return params.get('search') || '';
}

export type SearchState = {
  searchTerm: string;
  setSearchTerm: (searchTerm: string) => void;
  submitSearch: (searchTerm: string) => void;
  resetSearch: () => void;
};

export const useSearchStore = create<SearchState>((set) => ({
  // Initialize with value from URL if available
  searchTerm: getInitialSearchTerm(),

  setSearchTerm: (searchTerm: string) => set({ searchTerm }),

  submitSearch: (searchTerm: string) => {
    set({ searchTerm });

    // Only update URL in browser environment
    if (isBrowser) {
      // Update URL without page reload
      const params = new URLSearchParams();
      if (searchTerm.trim()) {
        params.set('search', searchTerm.trim());
      }
      params.set('page', '1');

      // Navigate to services page
      window.location.href = `/services?${params.toString()}`;
    }
  },

  resetSearch: () => set({ searchTerm: '' }),
}));

/**
 * Custom hook that combines the search store with URL params
 * Returns store methods with no additional logic, as the store is already
 * initialized with URL values and updated via form submissions
 */
export function useSearch() {
  const { searchTerm, setSearchTerm, submitSearch, resetSearch } =
    useSearchStore();

  return {
    searchTerm,
    setSearchTerm,
    handleSearch: submitSearch,
    resetSearch,
  };
}
