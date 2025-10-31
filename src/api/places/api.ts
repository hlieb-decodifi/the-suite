// @ts-nocheck

import { googlePlacesClient } from '@/lib/google-places/client';
import type {
  AutocompleteRequest,
  AutocompleteResponse,
  PlaceDetailsRequest,
  TextSearchRequest,
  NearbySearchRequest,
  Place,
  AddressData,
  AddressComponent,
  PlaceField,
  AutocompleteField,
} from './types';

/**
 * Parse Google Places address components into our standardized format
 */
function parseAddressComponents(
  place: Place,
  addressComponents: AddressComponent[],
): Partial<AddressData> {
  const componentMap: Record<string, string> = {};

  // Create a map of component types to values
  addressComponents.forEach((component) => {
    component.types.forEach((type) => {
      if (type === 'street_number') {
        componentMap.street_number = component.longText;
      } else if (type === 'route') {
        componentMap.route = component.longText;
      } else if (type === 'locality') {
        componentMap.locality = component.longText;
      } else if (type === 'sublocality') {
        componentMap.sublocality = component.longText;
      } else if (type === 'administrative_area_level_1') {
        componentMap.administrative_area_level_1 = component.longText;
      } else if (type === 'administrative_area_level_2') {
        componentMap.administrative_area_level_2 = component.longText;
      } else if (type === 'country') {
        componentMap.country = component.longText;
        componentMap.country_code = component.shortText;
      } else if (type === 'postal_code') {
        componentMap.postal_code = component.longText;
      }
    });
  });

  // Build street address from components
  const streetAddress = [componentMap.street_number, componentMap.route]
    .filter(Boolean)
    .join(' ');

  const result: Partial<AddressData> = {};

  if (componentMap.street_number)
    result.street_number = componentMap.street_number;
  if (componentMap.route) result.route = componentMap.route;
  if (componentMap.locality) result.locality = componentMap.locality;
  if (componentMap.sublocality) result.sublocality = componentMap.sublocality;
  if (componentMap.administrative_area_level_1)
    result.administrative_area_level_1 =
      componentMap.administrative_area_level_1;
  if (componentMap.administrative_area_level_2)
    result.administrative_area_level_2 =
      componentMap.administrative_area_level_2;
  if (componentMap.country) result.country = componentMap.country;
  if (componentMap.country_code)
    result.country_code = componentMap.country_code;
  if (componentMap.postal_code) result.postal_code = componentMap.postal_code;

  // Legacy fields for backward compatibility
  if (componentMap.locality) result.city = componentMap.locality;
  if (componentMap.administrative_area_level_1)
    result.state = componentMap.administrative_area_level_1;
  if (streetAddress) result.street_address = streetAddress;

  return result;
}

/**
 * Convert Google Places Place object to our AddressData format
 */
function placeToAddressData(place: Place): AddressData {
  const parsedComponents = parseAddressComponents(
    place,
    place.addressComponents || [],
  );

  return {
    google_place_id: place.id,
    formatted_address: place.formattedAddress,
    latitude: place.location.latitude,
    longitude: place.location.longitude,
    place_name: place.displayName?.text,
    place_types: place.types || [],
    google_data_raw: place,
    ...parsedComponents,
    // Ensure required fields have fallbacks
    country: parsedComponents.country || '',
    city: parsedComponents.city || '',
    state: parsedComponents.state || '',
    street_address: parsedComponents.street_address || '',
  };
}

/**
 * Autocomplete addresses as user types
 * Optimized for address collection with session tokens
 */
export async function autocompleteAddresses(
  input: string,
  options: {
    sessionToken?: string;
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
  } = {},
): Promise<AutocompleteResponse> {
  const request: AutocompleteRequest = {
    input,
    languageCode: options.language || 'en',
    // Only include valid primary types for autocomplete - Table A types
    // Remove address types as they're not valid for includedPrimaryTypes
  };

  if (options.sessionToken) request.sessionToken = options.sessionToken;
  if (options.region) request.regionCode = options.region;
  if (options.countries) request.includedRegionCodes = options.countries;

  // Add location bias if provided
  if (options.bias) {
    request.locationBias = {
      circle: {
        center: {
          latitude: options.bias.latitude,
          longitude: options.bias.longitude,
        },
        radius: options.bias.radius || 50000, // 50km default
      },
    };
  }

  // Add location restriction if provided
  if (options.restriction) {
    request.locationRestriction = {
      rectangle: {
        low: {
          latitude: options.restriction.south,
          longitude: options.restriction.west,
        },
        high: {
          latitude: options.restriction.north,
          longitude: options.restriction.east,
        },
      },
    };
  }

  // Only request fields needed for autocomplete display
  // Note: Autocomplete API uses 'suggestions' structure, not 'places'
  const fieldMask: AutocompleteField[] = [
    'suggestions.placePrediction.place',
    'suggestions.placePrediction.placeId',
    'suggestions.placePrediction.text',
    'suggestions.placePrediction.types',
  ];

  return googlePlacesClient.autocomplete(request, fieldMask);
}

/**
 * Get full place details for a selected autocomplete result
 * This should be called when user selects an address from autocomplete
 */
export async function getPlaceDetails(
  placeId: string,
  options: {
    sessionToken?: string;
    language?: string;
    region?: string;
  } = {},
): Promise<AddressData> {
  const request: PlaceDetailsRequest = {
    name: `places/${placeId}`,
    languageCode: options.language || 'en',
  };

  if (options.region) request.regionCode = options.region;
  if (options.sessionToken) request.sessionToken = options.sessionToken;

  // Request only essential location fields for optimal session pricing
  // This qualifies for "SKU: Place Details Essentials" billing tier
  const fieldMask: string[] = [
    'id',
    'displayName',
    'formattedAddress',
    'addressComponents',
    'location',
    'types',
    'primaryType',
  ];

  const response = await googlePlacesClient.getPlaceDetails(request, fieldMask);

  console.log(
    '🔍 Place Details API Response:',
    JSON.stringify(response, null, 2),
  );

  if (!response) {
    throw new Error('Place Details API returned empty response');
  }

  return placeToAddressData(response.place || response);
}

/**
 * Search for places using text query
 * Useful for business or landmark searches
 */
export async function searchPlacesByText(
  query: string,
  options: {
    bias?: { latitude: number; longitude: number; radius?: number };
    restriction?: {
      north: number;
      south: number;
      east: number;
      west: number;
    };
    maxResults?: number;
    language?: string;
    region?: string;
    openNow?: boolean;
    priceLevel?: 'INEXPENSIVE' | 'MODERATE' | 'EXPENSIVE' | 'VERY_EXPENSIVE';
  } = {},
): Promise<AddressData[]> {
  const request: TextSearchRequest = {
    textQuery: query,
    languageCode: options.language || 'en',
    regionCode: options.region,
    maxResultCount: options.maxResults || 20,
    openNow: options.openNow,
    priceLevels: options.priceLevel
      ? [`PRICE_LEVEL_${options.priceLevel}`]
      : undefined,
  };

  // Add location bias if provided
  if (options.bias) {
    request.locationBias = {
      circle: {
        center: {
          latitude: options.bias.latitude,
          longitude: options.bias.longitude,
        },
        radius: options.bias.radius || 50000,
      },
    };
  }

  // Add location restriction if provided
  if (options.restriction) {
    request.locationRestriction = {
      rectangle: {
        low: {
          latitude: options.restriction.south,
          longitude: options.restriction.west,
        },
        high: {
          latitude: options.restriction.north,
          longitude: options.restriction.east,
        },
      },
    };
  }

  const fieldMask: PlaceField[] = [
    'places.id',
    'places.name',
    'places.displayName',
    'places.formattedAddress',
    'places.addressComponents',
    'places.location',
    'places.types',
    'places.primaryType',
    'places.rating',
    'places.userRatingCount',
    'places.businessStatus',
  ];

  const response = await googlePlacesClient.textSearch(request, fieldMask);
  return response.places.map(placeToAddressData);
}

/**
 * Search for places near a specific location
 * Useful for finding businesses in an area
 */
export async function searchPlacesNearby(
  center: { latitude: number; longitude: number },
  radius: number,
  options: {
    includedTypes?: string[];
    excludedTypes?: string[];
    maxResults?: number;
    language?: string;
    region?: string;
    rankBy?: 'POPULARITY' | 'DISTANCE';
  } = {},
): Promise<AddressData[]> {
  const request: NearbySearchRequest = {
    locationRestriction: {
      center,
      radius,
    },
    includedPrimaryTypes: options.includedTypes,
    excludedPrimaryTypes: options.excludedTypes,
    maxResultCount: options.maxResults || 20,
    languageCode: options.language || 'en',
    regionCode: options.region,
    rankPreference: options.rankBy || 'POPULARITY',
  };

  const fieldMask: PlaceField[] = [
    'places.id',
    'places.name',
    'places.displayName',
    'places.formattedAddress',
    'places.addressComponents',
    'places.location',
    'places.types',
    'places.primaryType',
    'places.rating',
    'places.userRatingCount',
    'places.businessStatus',
  ];

  const response = await googlePlacesClient.nearbySearch(request, fieldMask);
  return response.places.map(placeToAddressData);
}

/**
 * Generate a session token for autocomplete billing optimization
 */
export function generateSessionToken(sessionId?: string): string {
  return googlePlacesClient.generateSessionToken(sessionId);
}

/**
 * Get a photo URL for a place photo
 */
export function getPlacePhotoUrl(
  photoName: string,
  options: {
    maxHeight?: number;
    maxWidth?: number;
  } = {},
): string {
  return googlePlacesClient.getPlacePhotoUrl(
    photoName,
    options.maxHeight,
    options.maxWidth,
  );
}
