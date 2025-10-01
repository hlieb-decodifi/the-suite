'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Typography } from '@/components/ui/typography';
import { useSearch } from '@/stores/searchStore';
import { Search, MapPin } from 'lucide-react';
import { useState, useEffect } from 'react';
import { ServicesFilters } from '../../types';
import { ServicesTemplateFiltersSectionProps } from './types';
import { AddressAutocompleteInput } from '@/components/forms/AddressAutocompleteInput';
import type { AddressData, Place } from '@/api/places/types';

// Custom hook to manage filter state and sync with global search
function useFilterState(initialFilters: ServicesFilters) {
  // Get global search state from store
  const { resetSearch } = useSearch();

  // Initialize local filters with both search term and location from initial filters
  const [localFilters, setLocalFilters] = useState({
    searchTerm: initialFilters.searchTerm,
    location: initialFilters.location,
    sortBy: initialFilters.sortBy || 'name-asc',
  });

  // Store selected address data separately for autocomplete
  // Initialize with a mock address object if we have location from URL
  const [selectedAddress, setSelectedAddress] = useState<AddressData | null>(
    () => {
      if (!initialFilters.location) return null;
      return {
        google_place_id: '',
        formatted_address: initialFilters.location,
        country: '',
        latitude: 0,
        longitude: 0,
        place_types: [],
        google_data_raw: {} as Place,
        city: '',
        state: '',
        street_address: '',
      };
    },
  );

  // Sync selectedAddress when URL location changes
  useEffect(() => {
    if (initialFilters.location) {
      // If there's a location from URL, always update the selectedAddress
      setSelectedAddress({
        google_place_id: '',
        formatted_address: initialFilters.location,
        country: '',
        latitude: 0,
        longitude: 0,
        place_types: [],
        google_data_raw: {} as Place,
        city: '',
        state: '',
        street_address: '',
      });
    } else {
      // If no location in URL, clear the selectedAddress
      setSelectedAddress(null);
    }
  }, [initialFilters.location]); // Only depend on location changes

  // Determine if there are active filters in local state or URL params
  function urlHasActiveFilters(): boolean {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    const hasSearch = !!(params.get('search') && params.get('search')!.trim() !== '');
    const hasLocation = !!(params.get('location') && params.get('location')!.trim() !== '');
    return hasSearch || hasLocation;
  }

  const hasActiveFilters: boolean =
    Boolean(localFilters.location && localFilters.location !== '') ||
    Boolean(localFilters.searchTerm && localFilters.searchTerm !== '') ||
    urlHasActiveFilters();

  // Handle changes and actions
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setLocalFilters((prev: ServicesFilters) => ({
      ...prev,
      searchTerm: e.target.value,
    }));

  const handleAddressChange = (address: AddressData | null) => {
    setSelectedAddress(address);
    // Extract a location string for filtering - use formatted_address for broader matching
    if (address) {
      // Use the formatted address for the most comprehensive search
      // This will include all address components that Google recognizes
      setLocalFilters((prev: ServicesFilters) => ({
        ...prev,
        location: address.formatted_address,
      }));
    } else {
      setLocalFilters((prev: ServicesFilters) => ({
        ...prev,
        location: '',
      }));
    }
  };

  const handleApplyFilters = () => {
    // Build URL with both search and location parameters
    const params = new URLSearchParams();

    if (localFilters.searchTerm.trim()) {
      params.set('search', localFilters.searchTerm.trim());
    }

    if (localFilters.location.trim()) {
      params.set('location', localFilters.location.trim());
    }

    // Reset to first page when applying filters
    params.delete('page');

    // Navigate to the new URL which will trigger server-side filtering
    window.location.href = `/services?${params.toString()}`;
  };

  const handleClearFilters = () => {
    setLocalFilters({ searchTerm: '', location: '', sortBy: 'name-asc' });
    setSelectedAddress(null);
    resetSearch();
    // Navigate to services page without any parameters
    window.location.href = '/services';
  };

  // Handle search on Enter key
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleApplyFilters();
    }
  };

  return {
    localFilters,
    selectedAddress,
    hasActiveFilters,
    handleSearchChange,
    handleAddressChange,
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

// Custom LocationAutocompleteInput component that fixes the UI issues
function LocationAutocompleteInput({
  value,
  onChange,
  placeholder = 'Enter city, state, or address...',
}: {
  value: AddressData | null;
  onChange: (address: AddressData | null) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <AddressAutocompleteInput
        showIcon={false}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="w-full [&_.bg-green-50]:!hidden [&_.border-green-200]:!hidden [&_.text-green-800]:!hidden [&_.bg-green-100]:!hidden [&_.text-green-700]:!hidden" // Hide all green styling variants
        inputClassName="pl-10" // Space for our custom icon
      />
      {/* Custom MapPin icon positioned at the start */}
      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none z-10">
        <MapPin className="h-4 w-4 text-muted-foreground" />
      </div>
    </div>
  );
}

// Extract location input to separate component
function LocationInput({
  value,
  onChange,
}: {
  value: AddressData | null;
  onChange: (address: AddressData | null) => void;
}) {
  return (
    <div>
      <Typography
        variant="small"
        className="text-muted-foreground mb-1.5 block"
      >
        Location
      </Typography>
      <LocationAutocompleteInput value={value} onChange={onChange} />
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
}: ServicesTemplateFiltersSectionProps) {
  // Use the custom hook for filter state management
  const {
    localFilters,
    selectedAddress,
    hasActiveFilters,
    handleSearchChange,
    handleAddressChange,
    handleApplyFilters,
    handleClearFilters,
    handleSearchKeyDown,
  } = useFilterState(filters);

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
            value={selectedAddress}
            onChange={handleAddressChange}
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
