'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin } from 'lucide-react';
import { ServicesTemplateFiltersSectionProps } from './types';
import { Typography } from '@/components/ui/typography';

export function ServicesTemplateFiltersSection({
  filters,
  onFiltersChange,
}: ServicesTemplateFiltersSectionProps) {
  const [localFilters, setLocalFilters] = useState(filters);
  const hasActiveFilters = localFilters.location !== '';

  // Sync local filters with props when props change
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  // Handle changes and actions
  const handleLocationChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setLocalFilters((prev) => ({ ...prev, location: e.target.value }));

  const handleApplyFilters = () => onFiltersChange(localFilters);

  const handleClearFilters = () => {
    const clearedFilters = { searchTerm: '', location: '' };
    setLocalFilters(clearedFilters);
    onFiltersChange(clearedFilters);
  };

  return (
    <Card className="bg-white shadow-sm">
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Header with title and clear button */}
          <div className="flex items-center justify-between">
            <Typography variant="h4" className="text-base font-medium">
              Filters
            </Typography>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="h-8 px-2 text-sm text-muted-foreground hover:text-foreground"
              >
                Clear all
              </Button>
            )}
          </div>

          {/* Filter controls */}
          <div>
            <Typography
              variant="small"
              className="text-muted-foreground mb-1.5 block"
            >
              Location
            </Typography>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Enter location..."
                value={localFilters.location}
                onChange={handleLocationChange}
                className="pl-9"
              />
            </div>
          </div>

          {/* Apply button */}
          <Button
            onClick={handleApplyFilters}
            className="w-full"
            disabled={
              !hasActiveFilters && localFilters.location === filters.location
            }
          >
            Apply Filters
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
