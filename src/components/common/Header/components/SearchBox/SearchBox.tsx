'use client';

import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

export type SearchBoxProps = {
  className?: string;
  placeholder?: string;
  onSearch?: (term: string) => void;
  autoFocus?: boolean;
};

export function SearchBox({
  className = '',
  placeholder = 'Search services',
  onSearch,
  autoFocus = false,
}: SearchBoxProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const pathname = usePathname();
  const inputRef = useRef<HTMLInputElement>(null);

  // Check if we're on the services page
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

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && onSearch) {
      onSearch(searchTerm);
    }
  };

  return (
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
        onKeyDown={handleSearch}
      />
    </div>
  );
}
