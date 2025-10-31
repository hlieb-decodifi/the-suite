/**
 * OpenStreetMap API utilities for address search and suggestions
 */

export type OSMSearchResult = {
  place_id: number;
  licence: string;
  osm_type: string;
  osm_id: number;
  boundingbox: string[];
  lat: string;
  lon: string;
  display_name: string;
  class: string;
  type: string;
  importance: number;
  address: {
    house_number?: string;
    road?: string;
    suburb?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
    country_code?: string;
  };
};

/**
 * Search for addresses using the OpenStreetMap Nominatim API
 */
export async function searchAddresses(
  query: string,
): Promise<OSMSearchResult[]> {
  if (!query || query.length < 3) return [];

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        query,
      )}&addressdetails=1&limit=5`,
      {
        headers: {
          'Accept-Language': 'en',
          'User-Agent': 'TheSuite Web App',
        },
      },
    );

    if (!response.ok) {
      throw new Error('Failed to fetch address suggestions');
    }

    return await response.json();
  } catch (error) {
    console.error('Error searching addresses:', error);
    return [];
  }
}

/**
 * Parse OSM address result into separate components
 */
export function parseAddressComponents(result: OSMSearchResult) {
  const address = result.address;

  return {
    country: address.country || '',
    state: address.state || '',
    city: address.city || address.suburb || '',
    street: address.road || '',
    houseNumber: address.house_number || '',
    postcode: address.postcode || '',
    fullAddress: result.display_name,
    latitude: result.lat,
    longitude: result.lon,
  };
}
