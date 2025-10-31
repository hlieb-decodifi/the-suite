// Export types
export type * from './types';

// Export API functions
export {
  autocompleteAddresses,
  getPlaceDetails,
  searchPlacesByText,
  searchPlacesNearby,
  generateSessionToken,
  getPlacePhotoUrl,
} from './api';

// Export React hooks
export {
  placesKeys,
  useAddressAutocomplete,
  useAddressDetails,
  useAddressSearch,
  useNearbyPlaces,
  useAddressSelector,
  useCurrentLocation,
} from './hooks';

// Export Google Places client
export { googlePlacesClient } from '@/lib/google-places/client';

// Export address utilities
export {
  addressDataToLegacyFormat,
  formatAddressDisplay,
  validateAddressData,
  getAddressCoordinates,
  calculateDistance,
  isAddressInBounds,
  normalizeAddressComponents,
  createLocationBiasFromAddress,
  isBusinessLocation,
  isResidentialLocation,
  formatAddressForContext,
} from '@/utils/addressUtils';

// Export UI components
export { AddressAutocompleteInput } from '@/components/forms/AddressAutocompleteInput';
