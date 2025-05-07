'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Typography } from '@/components/ui/typography';
import { useSearch } from '@/stores/searchStore';
import { MapPin, Search } from 'lucide-react';
import { useState } from 'react';
import { ServicesFilters } from '../../types';
import { ServicesTemplateFiltersSectionProps } from './types';

// Custom hook to manage filter state and sync with global search
function useFilterState(
  initialFilters: ServicesFilters,
  handleServerSearch: (searchTerm: string, page?: number) => Promise<void>,
) {
  const params = new URLSearchParams();

  // Get global search state from store
  const { searchTerm, resetSearch, handleSearch } = useSearch();

  // Initialize local filters with global search term
  const [localFilters, setLocalFilters] = useState({
    ...initialFilters,
    searchTerm: searchTerm || initialFilters.searchTerm,
  });

  const hasActiveFilters =
    localFilters.location !== '' || localFilters.searchTerm !== '';

  // Handle changes and actions
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setLocalFilters((prev: ServicesFilters) => ({
      ...prev,
      searchTerm: e.target.value,
    }));

  const handleLocationChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setLocalFilters((prev: ServicesFilters) => ({
      ...prev,
      location: e.target.value,
    }));

  const handleApplyFilters = () => {
    // Use the store's search handler
    handleSearch(localFilters.searchTerm);
  };

  const handleClearFilters = () => {
    setLocalFilters({ searchTerm: '', location: '' });
    resetSearch();
    window.location.href = `/services?${params.toString()}`;
    handleServerSearch('', 1);
  };

  // Handle search on Enter key
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch(localFilters.searchTerm);
    }
  };

  return {
    localFilters,
    hasActiveFilters,
    handleSearchChange,
    handleLocationChange,
    handleApplyFilters,
    handleClearFilters,
    handleSearchKeyDown,
  };
}

// Extract filter header to separate component
function FilterHeader({
  hasActiveFilters,
  onClear,
}: {
  hasActiveFilters: boolean;
  onClear: () => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <Typography variant="h4" className="text-base font-medium">
        Filters
      </Typography>
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="h-8 px-2 text-sm text-muted-foreground hover:text-foreground"
        >
          Clear all
        </Button>
      )}
    </div>
  );
}

// Extract search input to separate component
function SearchInput({
  value,
  onChange,
  onKeyDown,
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}) {
  return (
    <div>
      <Typography
        variant="small"
        className="text-muted-foreground mb-1.5 block"
      >
        Search
      </Typography>
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search services..."
          value={value}
          onChange={onChange}
          onKeyDown={onKeyDown}
          className="pl-9"
        />
      </div>
    </div>
  );
}

// Extract location input to separate component
function LocationInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div>
      <Typography
        variant="small"
        className="text-muted-foreground mb-1.5 block"
      >
        Location
      </Typography>
      <div className="relative">
        <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Enter location..."
          disabled
          value={value}
          onChange={onChange}
          className="pl-9"
        />
      </div>
    </div>
  );
}

// Extract filter actions to a separate component
function FilterActions({
  hasActiveFilters,
  onApply,
}: {
  hasActiveFilters: boolean;
  onApply: () => void;
}) {
  return (
    <Button onClick={onApply} className="w-full" disabled={!hasActiveFilters}>
      Apply Filters
    </Button>
  );
}

export function ServicesTemplateFiltersSection({
  filters,
  handleServerSearch,
}: ServicesTemplateFiltersSectionProps) {
  // Use the custom hook for filter state management
  const {
    localFilters,
    hasActiveFilters,
    handleSearchChange,
    handleLocationChange,
    handleApplyFilters,
    handleClearFilters,
    handleSearchKeyDown,
  } = useFilterState(filters, handleServerSearch);

  return (
    <Card className="bg-white shadow-sm">
      <CardContent className="p-4">
        <div className="space-y-4">
          <FilterHeader
            hasActiveFilters={hasActiveFilters}
            onClear={handleClearFilters}
          />

          <SearchInput
            value={localFilters.searchTerm}
            onChange={handleSearchChange}
            onKeyDown={handleSearchKeyDown}
          />

          <LocationInput
            value={localFilters.location}
            onChange={handleLocationChange}
          />

          <FilterActions
            hasActiveFilters={hasActiveFilters}
            onApply={handleApplyFilters}
          />
        </div>
      </CardContent>
    </Card>
  );
}
