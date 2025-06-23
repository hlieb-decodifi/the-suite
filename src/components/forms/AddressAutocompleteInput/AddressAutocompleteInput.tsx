'use client';

import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/utils/cn';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2, MapPin, X } from 'lucide-react';
import type { AddressData, AutocompletePrediction } from '@/api/places/types';
import { useAddressAutocomplete, useAddressDetails } from '@/api/places/hooks';

type AddressAutocompleteInputProps = {
  value?: AddressData | null;
  onChange?: (address: AddressData | null) => void;
  onError?: (error: Error) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  inputClassName?: string;
  // Google Places API options
  bias?: { latitude: number; longitude: number; radius?: number };
  restriction?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  countries?: string[];
  language?: string;
  region?: string;
  showIcon?: boolean;
};

export function AddressAutocompleteInput({
  value,
  onChange,
  onError,
  placeholder = 'Enter address...',
  label,
  required = false,
  disabled = false,
  className,
  inputClassName,
  bias,
  restriction,
  countries,
  language = 'en',
  region,
  showIcon = true,
}: AddressAutocompleteInputProps) {
  const [input, setInput] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isSelecting, setIsSelecting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Initialize input with selected address
  useEffect(() => {
    if (value?.formatted_address) {
      setInput(value.formatted_address);
      setIsSelecting(false); // Ensure we're not in selecting state
    } else {
      setInput('');
    }
  }, [value?.formatted_address]);

  // Google Places autocomplete
  // Disable autocomplete when an address is already selected, input matches it, or we're in the process of selecting
  const shouldEnableAutocomplete =
    !disabled &&
    !isSelecting &&
    input.length > 2 &&
    (!value || input !== value.formatted_address);

  const autocomplete = useAddressAutocomplete(
    // Only pass input if we should enable autocomplete
    shouldEnableAutocomplete ? input : '',
    {
      enabled: shouldEnableAutocomplete,
      ...(bias && { bias }),
      ...(restriction && { restriction }),
      ...(countries && { countries }),
      language,
      ...(region && { region }),
    },
  );

  // Place details fetcher
  const placeDetails = useAddressDetails({
    language,
    ...(region && { region }),
    sessionToken: autocomplete.sessionToken,
  });

  // Get place predictions from suggestions
  // Only show predictions if autocomplete should be enabled
  const predictions = shouldEnableAutocomplete
    ? autocomplete.suggestions
        ?.map((suggestion) => suggestion.placePrediction)
        .filter(
          (prediction): prediction is AutocompletePrediction => !!prediction,
        ) || []
    : [];

  // Log when dropdown should be visible
  if (isOpen && predictions.length > 0) {
    console.log(
      '🔽 Dropdown should be visible with',
      predictions.length,
      'predictions',
    );
    console.log('First prediction:', predictions[0]);
  }

  // Close dropdown if autocomplete is disabled
  useEffect(() => {
    if (!shouldEnableAutocomplete && isOpen) {
      setIsOpen(false);
    }
  }, [shouldEnableAutocomplete, isOpen]);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInput(newValue);
    setIsOpen(true);
    setSelectedIndex(-1);
    setIsSelecting(false); // Reset selecting state when user manually types

    // Clear selection if input is manually changed
    if (value && newValue !== value.formatted_address) {
      onChange?.(null);
    }
  };

  // Handle address selection
  const handleSelectAddress = async (prediction: AutocompletePrediction) => {
    try {
      setIsSelecting(true);
      setIsOpen(false);

      console.log('Starting address selection for:', prediction.placeId);

      // Get full place details first
      const addressData = await placeDetails.mutateAsync(prediction.placeId);

      console.log('Place details received:', addressData);

      // Set input to the formatted address from the API response
      setInput(addressData.formatted_address);

      // Reset session for billing optimization
      autocomplete.resetSession();

      // Call onChange with the selected address
      onChange?.(addressData);

      console.log('Address selection completed successfully');
    } catch (error) {
      console.error('Error selecting address:', error);
      onError?.(
        error instanceof Error ? error : new Error('Failed to select address'),
      );
    } finally {
      setIsSelecting(false);
    }
  };

  // Handle clear selection
  const handleClear = () => {
    setInput('');
    setIsOpen(false);
    setSelectedIndex(-1);
    onChange?.(null);
    inputRef.current?.focus();
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || predictions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < predictions.length - 1 ? prev + 1 : prev,
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && predictions[selectedIndex]) {
          handleSelectAddress(predictions[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle focus
  const handleFocus = () => {
    if (predictions.length > 0 && shouldEnableAutocomplete) {
      setIsOpen(true);
    }
  };

  const isLoading = autocomplete.isLoading || placeDetails.isPending;
  const hasError = autocomplete.error || placeDetails.error;

  return (
    <div className={cn('relative w-full', className)}>
      {label && (
        <Label htmlFor="address-input" className="mb-2 block">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}

      <div className="relative">
        <Input
          ref={inputRef}
          id="address-input"
          type="text"
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            'pr-20', // Space for icons
            !showIcon && 'pr-10',
            hasError && 'border-red-500',
            inputClassName,
          )}
          autoComplete="off"
        />

        {/* Right side icons */}
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
          {isLoading && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
          {value && !isLoading && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="h-6 w-6 p-0 hover:bg-gray-100"
              disabled={disabled}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
          {showIcon && <MapPin className="h-4 w-4 text-muted-foreground" />}
        </div>
      </div>

      {/* Autocomplete dropdown */}
      {isOpen && predictions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto"
        >
          {predictions.map((prediction, index) => (
            <button
              key={prediction.placeId}
              type="button"
              className={cn(
                'w-full px-4 py-3 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none',
                'border-b border-gray-100 last:border-b-0',
                selectedIndex === index && 'bg-blue-50 hover:bg-blue-50',
              )}
              onClick={() => {
                console.log(
                  '🔴 BUTTON CLICKED for prediction:',
                  prediction.placeId,
                );
                handleSelectAddress(prediction);
              }}
              disabled={disabled}
            >
              <div className="flex items-start space-x-3">
                <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {prediction.structuredFormat?.mainText?.text ||
                      prediction.text.text}
                  </div>
                  {prediction.structuredFormat?.secondaryText && (
                    <div className="text-sm text-gray-500 truncate">
                      {prediction.structuredFormat.secondaryText.text}
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Error message */}
      {hasError && (
        <p className="mt-2 text-sm text-red-600">
          {hasError instanceof Error
            ? hasError.message
            : 'Error loading addresses'}
        </p>
      )}

      {/* Selected address display (optional) */}
      {value && (
        <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-md">
          <div className="flex items-start space-x-2">
            <MapPin className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1 text-sm text-green-800">
              <div className="font-medium">{value.formatted_address}</div>
              {(value.place_name || value.locality) && (
                <div className="text-green-600 mt-1">
                  {value.place_name && value.place_name !== value.locality
                    ? `${value.place_name}, ${value.locality || value.city}`
                    : value.locality || value.city}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
