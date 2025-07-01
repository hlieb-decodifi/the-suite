'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown, ArrowUpDown } from 'lucide-react';
import { SortOption, SortConfig } from '../../types';

const SORT_OPTIONS: SortConfig[] = [
  { value: 'name-asc', label: 'Name (A-Z)' },
  { value: 'name-desc', label: 'Name (Z-A)' },
  { value: 'location-asc', label: 'Closest Location' },
];

export type ServicesSortDropdownProps = {
  value: SortOption;
  onSortChange: (sortBy: SortOption) => void;
  disabled?: boolean;
};

export function ServicesSortDropdown({
  value,
  onSortChange,
  disabled = false,
}: ServicesSortDropdownProps) {
  const [open, setOpen] = useState(false);

  const currentSort = SORT_OPTIONS.find((option) => option.value === value);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          className="gap-2 text-sm"
        >
          <ArrowUpDown className="h-4 w-4" />
          Sort: {currentSort?.label || 'Name (A-Z)'}
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {SORT_OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => {
              onSortChange(option.value);
              setOpen(false);
            }}
            className={value === option.value ? 'bg-accent' : ''}
          >
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
