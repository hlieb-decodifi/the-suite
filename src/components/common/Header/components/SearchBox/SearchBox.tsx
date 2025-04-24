'use client';

import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { useState } from 'react';

export type SearchBoxProps = {
  className?: string;
  placeholder?: string;
  onSearch?: (term: string) => void;
};

export function SearchBox({
  className = '',
  placeholder = 'Search services',
  onSearch,
}: SearchBoxProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && onSearch) {
      onSearch(searchTerm);
    }
  };

  return (
    <div
      className={`relative rounded-md border border-[#ECECEC] bg-[#F5F5F5] focus-within:border-[#DEA85B] ${className}`}
    >
      <div className="absolute inset-y-0 left-2 flex items-center pointer-events-none">
        <Search size={18} className="text-[#5D6C6F]" />
      </div>
      <Input
        type="text"
        placeholder={placeholder}
        className="border-0 bg-transparent pl-8 focus-visible:ring-0 font-futura text-[#313131] placeholder:text-[#5D6C6F]"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onKeyDown={handleSearch}
      />
    </div>
  );
}
