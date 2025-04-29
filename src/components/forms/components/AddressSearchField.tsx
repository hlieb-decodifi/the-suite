'use client';

import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { MapPin, Loader2 } from 'lucide-react';
import {
  // searchAddresses,
  OSMSearchResult,
  parseAddressComponents,
} from '@/lib/osm';
import { useDebounce } from '@/hooks/useDebounce';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

type AddressSearchFieldProps = {
  value: string;
  onChange: (value: string) => void;
  onAddressSelect: (
    address: string,
    country: string,
    state: string,
    city: string,
    streetAddress: string,
  ) => void;
};

type SearchResultsListProps = {
  isSearching: boolean;
  searchResults: OSMSearchResult[];
  onResultSelect: (result: OSMSearchResult) => void;
};

type UseAddressSearchReturn = {
  searchResults: OSMSearchResult[];
  isSearching: boolean;
  open: boolean;
  setOpen: (open: boolean) => void;
  hasQuery: boolean;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleResultSelect: (result: OSMSearchResult) => void;
};

// Hook to handle address search logic
function useAddressSearch(
  value: string,
  onChange: (value: string) => void,
  onAddressSelect: AddressSearchFieldProps['onAddressSelect'],
): UseAddressSearchReturn {
  const [searchResults, setSearchResults] = useState<OSMSearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const debouncedAddress = useDebounce(value, 500);
  const hasQuery = debouncedAddress.length >= 3;

  // Search for addresses when input changes
  useEffect(() => {
    const fetchAddresses = async () => {
      if (!hasQuery) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        // const results = await searchAddresses(debouncedAddress);
        const results: OSMSearchResult[] = [];
        setSearchResults(results);
        // Only open the popover when we have results or are searching
        if (!open && (results.length > 0 || isSearching)) {
          setOpen(true);
        }
      } catch (error) {
        console.error('Error searching addresses:', error);
      } finally {
        setIsSearching(false);
      }
    };

    fetchAddresses();
  }, [debouncedAddress, hasQuery, open, isSearching]);

  const handleResultSelect = (result: OSMSearchResult) => {
    const components = parseAddressComponents(result);

    onAddressSelect(
      components.fullAddress,
      components.country,
      components.state,
      components.city,
      `${components.houseNumber} ${components.street}`.trim(),
    );

    setOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);

    // Close the popover if the input is cleared
    if (newValue.length < 3 && open) {
      setOpen(false);
    }
  };

  return {
    searchResults,
    isSearching,
    open,
    setOpen,
    hasQuery,
    handleInputChange,
    handleResultSelect,
  };
}

// Component for displaying search results
function SearchResultsList({
  isSearching,
  searchResults,
  onResultSelect,
}: SearchResultsListProps) {
  return (
    <CommandList>
      {isSearching ? (
        <div className="flex items-center justify-center p-4">
          <Loader2 className="h-4 w-4 animate-spin text-[#DEA85B]" />
        </div>
      ) : (
        <>
          <CommandEmpty className="py-6 text-center text-[#5D6C6F]">
            No address found
          </CommandEmpty>
          <CommandGroup>
            {searchResults.map((result) => (
              <CommandItem
                key={result.place_id}
                onSelect={() => onResultSelect(result)}
                className="flex items-center py-3 px-2 cursor-pointer hover:bg-[#F5F5F5] hover:text-[#DEA85B]"
              >
                <MapPin className="mr-2 h-4 w-4 text-[#DEA85B] flex-shrink-0" />
                <span className="text-sm truncate">{result.display_name}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </>
      )}
    </CommandList>
  );
}

// Component for address search with autocomplete
export function AddressSearchField({
  value,
  onChange,
  onAddressSelect,
}: AddressSearchFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const {
    searchResults,
    isSearching,
    open,
    setOpen,
    hasQuery,
    handleInputChange,
    handleResultSelect,
  } = useAddressSearch(value, onChange, onAddressSelect);

  return (
    <Popover
      open={open && (hasQuery || isSearching)}
      onOpenChange={(newOpen) => {
        // Only allow closing the popover, not opening it directly
        if (!newOpen) setOpen(newOpen);
      }}
    >
      <PopoverTrigger
        // TODO: Enable this when we have a way to create addresses
        disabled
        asChild
      >
        <div className="relative">
          <MapPin className="absolute left-2 top-2.5 h-4 w-4 text-[#DEA85B]" />
          <Input
            // TODO: Enable this when we have a way to create addresses
            disabled
            ref={inputRef}
            placeholder="Search for your address"
            className="pl-8 border-[#ECECEC] focus:border-[#DEA85B] focus:ring-[#DEA85B]"
            value={value}
            onChange={handleInputChange}
          />
        </div>
      </PopoverTrigger>
      {hasQuery && (
        <PopoverContent
          className="p-0 border-[#ECECEC] w-full max-w-[300px] sm:max-w-[450px]"
          align="start"
        >
          <Command className="rounded-lg">
            <CommandInput
              placeholder="Search address..."
              value={value}
              onValueChange={onChange}
            />
            <SearchResultsList
              isSearching={isSearching}
              searchResults={searchResults}
              onResultSelect={handleResultSelect}
            />
          </Command>
        </PopoverContent>
      )}
    </Popover>
  );
}
