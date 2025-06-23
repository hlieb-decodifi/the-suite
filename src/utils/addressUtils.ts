import type { AddressData } from '@/api/places/types';

/**
 * Transform Google Places AddressData to legacy format for backward compatibility
 */
export function addressDataToLegacyFormat(addressData: AddressData) {
  return {
    country: addressData.country || '',
    state: addressData.state || addressData.administrative_area_level_1 || '',
    city: addressData.city || addressData.locality || '',
    street_address: addressData.street_address || 
      [addressData.street_number, addressData.route].filter(Boolean).join(' ') || '',
  };
}

/**
 * Create a display string for an address
 */
export function formatAddressDisplay(
  addressData: AddressData,
  format: 'short' | 'medium' | 'full' = 'medium'
): string {
  switch (format) {
    case 'short':
      return [addressData.locality || addressData.city, addressData.administrative_area_level_1 || addressData.state]
        .filter(Boolean)
        .join(', ');
    
    case 'full':
      return addressData.formatted_address;
    
    case 'medium':
    default:
      return [
        addressData.street_address,
        addressData.locality || addressData.city,
        addressData.administrative_area_level_1 || addressData.state,
      ].filter(Boolean).join(', ');
  }
}

/**
 * Validate that address data has required fields
 */
export function validateAddressData(
  addressData: AddressData,
  requiredFields: (keyof AddressData)[] = ['formatted_address', 'country']
): { isValid: boolean; missingFields: string[] } {
  const missingFields: string[] = [];
  
  for (const field of requiredFields) {
    if (!addressData[field]) {
      missingFields.push(field);
    }
  }
  
  return {
    isValid: missingFields.length === 0,
    missingFields,
  };
}

/**
 * Extract geographic coordinates from address data
 */
export function getAddressCoordinates(addressData: AddressData): {
  latitude: number;
  longitude: number;
} | null {
  if (addressData.latitude && addressData.longitude) {
    return {
      latitude: addressData.latitude,
      longitude: addressData.longitude,
    };
  }
  return null;
}

/**
 * Calculate distance between two coordinates using Haversine formula
 */
export function calculateDistance(
  coord1: { latitude: number; longitude: number },
  coord2: { latitude: number; longitude: number }
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (coord2.latitude - coord1.latitude) * Math.PI / 180;
  const dLon = (coord2.longitude - coord1.longitude) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(coord1.latitude * Math.PI / 180) * Math.cos(coord2.latitude * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c; // Distance in kilometers
  return distance;
}

/**
 * Check if address is within a specific geographic boundary
 */
export function isAddressInBounds(
  addressData: AddressData,
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  }
): boolean {
  const coords = getAddressCoordinates(addressData);
  if (!coords) return false;
  
  return (
    coords.latitude >= bounds.south &&
    coords.latitude <= bounds.north &&
    coords.longitude >= bounds.west &&
    coords.longitude <= bounds.east
  );
}

/**
 * Normalize address components for consistent formatting
 */
export function normalizeAddressComponents(addressData: AddressData): AddressData {
  const normalized = {
    ...addressData,
    // Ensure legacy fields are populated from Google Places data
    city: addressData.city || addressData.locality || '',
    state: addressData.state || addressData.administrative_area_level_1 || '',
    street_address: addressData.street_address || 
      [addressData.street_number, addressData.route].filter(Boolean).join(' ') || '',
  };

  // Ensure country code is uppercase if it exists
  if (addressData.country_code) {
    normalized.country_code = addressData.country_code.toUpperCase();
  }

  return normalized;
}

/**
 * Create a location bias object for Google Places API from an address
 */
export function createLocationBiasFromAddress(
  addressData: AddressData,
  radiusKm: number = 50
): { latitude: number; longitude: number; radius: number } | null {
  const coords = getAddressCoordinates(addressData);
  if (!coords) return null;
  
  return {
    latitude: coords.latitude,
    longitude: coords.longitude,
    radius: radiusKm * 1000, // Convert to meters
  };
}

/**
 * Extract place types that indicate this is a business location
 */
export function isBusinessLocation(addressData: AddressData): boolean {
  const businessTypes = [
    'establishment',
    'point_of_interest',
    'store',
    'restaurant',
    'shopping_mall',
    'hospital',
    'school',
    'university',
    'gym',
    'beauty_salon',
    'spa',
    'lodging',
  ];
  
  return addressData.place_types?.some(type => 
    businessTypes.some(businessType => type.includes(businessType))
  ) || false;
}

/**
 * Check if address appears to be residential
 */
export function isResidentialLocation(addressData: AddressData): boolean {
  const residentialTypes = [
    'street_address',
    'premise',
    'subpremise',
    'residential',
  ];
  
  return addressData.place_types?.some(type => 
    residentialTypes.some(residentialType => type.includes(residentialType))
  ) || false;
}

/**
 * Format address for different contexts (forms, display, etc.)
 */
export function formatAddressForContext(
  addressData: AddressData,
  context: 'form' | 'profile' | 'booking' | 'search'
): string {
  switch (context) {
    case 'form':
      // Simple format for form display
      return formatAddressDisplay(addressData, 'medium');
    
    case 'profile':
      // Professional profile format
      return [
        addressData.locality || addressData.city,
        addressData.administrative_area_level_1 || addressData.state,
        addressData.country,
      ].filter(Boolean).join(', ');
    
    case 'booking':
      // Full address for bookings
      return addressData.formatted_address;
    
    case 'search':
      // Short format for search results
      return formatAddressDisplay(addressData, 'short');
    
    default:
      return addressData.formatted_address;
  }
}

/**
 * Validates if the current form fields match the stored lat/lng coordinates
 * Returns true if coordinates are still valid, false if manual changes invalidate them
 */
export function validateAddressCoordinates(
  formValues: {
    country?: string;
    state?: string;
    city?: string;
    streetAddress?: string;
    apartment?: string;
    latitude?: number;
    longitude?: number;
    googlePlaceId?: string;
  }
): { isValid: boolean; shouldClearCoordinates: boolean; reason?: string } {
  // If no coordinates exist, validation passes (no coordinates to validate)
  if (!formValues.latitude || !formValues.longitude) {
    return { isValid: true, shouldClearCoordinates: false };
  }

  // If no Google Place ID exists, coordinates might be manually entered - keep them
  if (!formValues.googlePlaceId) {
    return { isValid: true, shouldClearCoordinates: false };
  }

  // If we have coordinates and Google Place ID, we assume they were set by Google Places
  // In this case, we should validate if manual changes warrant clearing coordinates
  
  // For now, we'll be conservative and keep coordinates unless major address components change
  // A more sophisticated approach would geocode the current address to verify coordinates
  
  // Check if major address components are empty (suggests significant manual changes)
  const hasEmptyMajorComponents = !formValues.country || !formValues.city || !formValues.streetAddress;
  
  if (hasEmptyMajorComponents) {
    return { 
      isValid: false, 
      shouldClearCoordinates: true, 
      reason: 'Major address components are missing' 
    };
  }

  // For now, assume coordinates are still valid
  // In a production app, you might want to implement reverse geocoding validation
  return { isValid: true, shouldClearCoordinates: false };
}

/**
 * Debounced function to validate address changes and clear coordinates if needed
 */
export function createAddressValidator(
  setValue: (field: string, value: unknown) => void,
  debounceMs: number = 2000
) {
  let timeoutId: ReturnType<typeof setTimeout>;

  return function validateAddressChange(formValues: {
    country?: string;
    state?: string;
    city?: string;
    streetAddress?: string;
    apartment?: string;
    latitude?: number;
    longitude?: number;
    googlePlaceId?: string;
  }) {
    clearTimeout(timeoutId);
    
    timeoutId = setTimeout(() => {
      const validation = validateAddressCoordinates(formValues);
      
      if (validation.shouldClearCoordinates) {
        console.log('Address validation: Clearing coordinates due to manual changes:', validation.reason);
        setValue('latitude', undefined);
        setValue('longitude', undefined);
        setValue('googlePlaceId', '');
      }
    }, debounceMs);
  };
} 