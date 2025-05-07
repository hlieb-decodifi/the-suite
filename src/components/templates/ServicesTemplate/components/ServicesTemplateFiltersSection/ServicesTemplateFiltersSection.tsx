'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Search, MapPin } from 'lucide-react';
import { ServicesTemplateFiltersSectionProps } from './types';

export function ServicesTemplateFiltersSection({
  filters,
  onFiltersChange,
}: ServicesTemplateFiltersSectionProps) {
  // Local state for filters to avoid immediate filtering on every keystroke
  const [localFilters, setLocalFilters] = useState(filters);

  // Sync local filters with props when props change
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  // Update local filters
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalFilters((prev) => ({ ...prev, searchTerm: e.target.value }));
  };

  const handleLocationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalFilters((prev) => ({ ...prev, location: e.target.value }));
  };

  // Apply filters
  const handleApplyFilters = () => onFiltersChange(localFilters);

  // Clear filters
  const handleClearFilters = () => {
    const clearedFilters = { searchTerm: '', location: '' };
    setLocalFilters(clearedFilters);
    onFiltersChange(clearedFilters);
  };

  return (
    <Card className="bg-white shadow-sm">
      <CardContent className="p-4 space-y-4">
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search services..."
              value={localFilters.searchTerm}
              onChange={handleSearchChange}
              className="pl-9"
            />
          </div>

          <div className="relative">
            <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filter by location..."
              value={localFilters.location}
              onChange={handleLocationChange}
              className="pl-9"
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={handleApplyFilters} className="flex-1">
              Apply Filters
            </Button>
            <Button
              variant="outline"
              onClick={handleClearFilters}
              className="flex-1"
              disabled={!localFilters.searchTerm && !localFilters.location}
            >
              Clear
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
