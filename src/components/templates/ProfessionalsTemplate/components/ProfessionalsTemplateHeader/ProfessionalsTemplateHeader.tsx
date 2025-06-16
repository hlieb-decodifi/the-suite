'use client';

import { Input } from '@/components/ui/input';
import { Typography } from '@/components/ui/typography';
import { Search } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export type ProfessionalsTemplateHeaderProps = {
  searchTerm?: string;
};

export function ProfessionalsTemplateHeader({
  searchTerm = '',
}: ProfessionalsTemplateHeaderProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm);

  // Update local state when searchTerm prop changes
  useEffect(() => {
    setLocalSearchTerm(searchTerm);
  }, [searchTerm]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams);

    if (localSearchTerm.trim()) {
      params.set('q', localSearchTerm.trim());
    } else {
      params.delete('q');
    }

    // Reset to page 1 when searching
    params.delete('page');

    router.push(`/professionals?${params.toString()}`);
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
          className="text-muted-foreground font-caslon text-lg italic"
        >
          Discover talented professionals
        </Typography>

        <Typography
          variant="h1"
          className="font-futura text-4xl md:text-5xl lg:text-6xl font-bold text-foreground"
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
      <div className="max-w-md mx-auto">
        <form onSubmit={handleSearchSubmit} className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search professionals..."
            value={localSearchTerm}
            onChange={handleSearchChange}
            className="pl-10"
          />
        </form>
      </div>
    </div>
  );
}
