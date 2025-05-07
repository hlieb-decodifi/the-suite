/* eslint-disable max-lines-per-function */
'use client';

import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useSearch } from '@/stores/searchStore';

export type SearchBoxProps = {
  className?: string;
  placeholder?: string;
  onSearch?: ((term: string) => void) | undefined;
  autoFocus?: boolean;
};

export function SearchBox({
  className = '',
  placeholder = 'Search services',
  onSearch,
  autoFocus = false,
}: SearchBoxProps) {
  const pathname = usePathname();
  const inputRef = useRef<HTMLInputElement>(null);

  // Get search state from store
  const { searchTerm, setSearchTerm, handleSearch } = useSearch();

  // Determine if we're on the services page
  const isServicesPage =
    pathname === '/services' || pathname?.startsWith('/services?');

  // Focus the input when autoFocus is true
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      // Short delay to ensure the sidebar is fully opened
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
    }
  }, [autoFocus]);

  // Handle form submission
  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (onSearch) {
      // If a custom search handler is provided, use it
      onSearch(searchTerm);
    } else {
      // Otherwise, use the store's handler
      handleSearch(searchTerm);
    }
  };

  // Handle key press events
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div
        className={`relative rounded-md border ${isServicesPage ? 'border-primary/30 shadow-sm' : 'border-[#ECECEC]'} bg-[#F5F5F5] focus-within:border-[#DEA85B] ${className}`}
      >
        <div className="absolute inset-y-0 left-2 flex items-center pointer-events-none">
          <Search
            size={18}
            className={`${isServicesPage ? 'text-primary' : 'text-[#5D6C6F]'}`}
          />
        </div>
        <Input
          ref={inputRef}
          type="text"
          placeholder={
            isServicesPage ? 'Search available services...' : placeholder
          }
          className="border-0 bg-transparent pl-8 focus-visible:ring-0 font-futura text-[#313131] placeholder:text-[#5D6C6F]"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={handleKeyDown}
        />
      </div>
    </form>
  );
}
