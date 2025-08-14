'use client';

import { Input } from '@/components/ui/input';
import { Typography } from '@/components/ui/typography';
import { useDebounce } from '@/hooks/useDebounce';
import { Loader2, Search } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

export type ProfessionalsTemplateHeaderProps = {
  searchTerm?: string;
};

export function ProfessionalsTemplateHeader({
  searchTerm = '',
}: ProfessionalsTemplateHeaderProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm);
  const [isSearching, setIsSearching] = useState(false);

  // Debounce search term for auto-search as user types
  const debouncedSearchTerm = useDebounce(localSearchTerm, 500);

  // Update local state when searchTerm prop changes
  useEffect(() => {
    setLocalSearchTerm(searchTerm);
  }, [searchTerm]);

  const performSearch = useCallback(
    (searchValue: string) => {
      const params = new URLSearchParams(searchParams ?? '');

      if (searchValue.trim()) {
        params.set('q', searchValue.trim());
      } else {
        params.delete('q');
      }

      // Reset to page 1 when searching
      params.delete('page');

      setIsSearching(true);
      router.push(`/professionals?${params.toString()}`);

      // Reset loading state after a short delay
      setTimeout(() => setIsSearching(false), 1000);
    },
    [router, searchParams],
  );

  // Auto-search when debounced term changes (but not on initial load)
  useEffect(() => {
    if (debouncedSearchTerm !== searchTerm) {
      performSearch(debouncedSearchTerm);
    }
  }, [debouncedSearchTerm, searchTerm, performSearch]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(localSearchTerm);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalSearchTerm(e.target.value);
  };

  return (
    <div className="space-y-6">
      {/* Hero Header Section */}
      <div className="text-center space-y-4">
        <Typography
          variant="p"
          className="text-muted-foreground font-caslon text-2xl italic"
        >
          Discover talented professionals
        </Typography>

        <Typography
          variant="h1"
          className="font-futura text-3xl md:text-4xl lg:text-5xl font-bold text-foreground"
        >
          Our Professionals
        </Typography>

        <Typography
          variant="p"
          className="text-muted-foreground max-w-2xl mx-auto"
        >
          Browse through our curated network of skilled professionals ready to
          provide exceptional services. From beauty experts to wellness
          specialists, find the perfect professional for your needs.
        </Typography>
      </div>

      {/* Search Section */}
      <div className="max-w-lg mx-auto">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            {isSearching ? (
              <div className="absolute left-3 top-1/2 -translate-y-1/2">
                <Loader2 className="h-4 w-4 text-primary animate-spin" />
              </div>
            ) : (
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            )}
            <Input
              type="text"
              placeholder="Search professionals by name..."
              value={localSearchTerm}
              onChange={handleSearchChange}
              className="pl-10"
            />
          </div>
        </form>

        {/* Search Hint */}
        <p className="text-sm text-muted-foreground text-center mt-2">
          Search automatically as you type or press Enter
        </p>
      </div>
    </div>
  );
}
