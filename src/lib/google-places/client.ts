import type {
  AutocompleteRequest,
  AutocompleteResponse,
  PlaceDetailsRequest,
  PlaceDetailsResponse,
  TextSearchRequest,
  TextSearchResponse,
  NearbySearchRequest,
  NearbySearchResponse,
  PlacePhotoRequest,
  PlacesApiError,
  SessionToken,
  PlaceField,
  AutocompleteField,
} from '@/api/places/types';

class GooglePlacesClient {
  private apiKey: string;
  private baseUrl = 'https://places.googleapis.com/v1';
  private sessionTokens = new Map<string, SessionToken>();

  constructor() {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      throw new Error(
        'Missing NEXT_PUBLIC_GOOGLE_PLACES_API_KEY environment variable',
      );
    }
    this.apiKey = apiKey;
  }

  /**
   * Generate a session token for Autocomplete billing optimization
   * Session tokens group autocomplete requests for billing purposes
   */
  generateSessionToken(sessionId?: string): string {
    const token =
      sessionId ||
      `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.sessionTokens.set(token, {
      token,
      createdAt: new Date(),
    });
    return token;
  }

  /**
   * Clean up expired session tokens (older than 3 minutes)
   */
  private cleanupExpiredTokens(): void {
    const now = new Date();
    const threeMinutesAgo = new Date(now.getTime() - 3 * 60 * 1000);

    for (const [token, sessionToken] of this.sessionTokens.entries()) {
      if (sessionToken.createdAt < threeMinutesAgo) {
        this.sessionTokens.delete(token);
      }
    }
  }

  /**
   * Make authenticated request to Google Places API
   */
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    this.cleanupExpiredTokens();

    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': this.apiKey,
      'X-Goog-FieldMask': '*', // Default to all fields, can be overridden
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const errorData: PlacesApiError = await response.json();
        throw new Error(
          `Google Places API Error: ${errorData.error.message} (${errorData.error.status})`,
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to make request to Google Places API');
    }
  }

  /**
   * Autocomplete (New) - Get place predictions as user types
   * https://developers.google.com/maps/documentation/places/web-service/autocomplete
   */
  async autocomplete(
    request: AutocompleteRequest,
    fieldMask?: AutocompleteField[],
  ): Promise<AutocompleteResponse> {
    const endpoint = '/places:autocomplete';
    const headers: Record<string, string> = {};

    if (fieldMask) {
      headers['X-Goog-FieldMask'] = fieldMask.join(',');
    }

    return this.makeRequest<AutocompleteResponse>(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
    });
  }

  /**
   * Place Details (New) - Get detailed information about a specific place
   * https://developers.google.com/maps/documentation/places/web-service/place-details
   */
  async getPlaceDetails(
    request: PlaceDetailsRequest,
    fieldMask?: string[],
  ): Promise<PlaceDetailsResponse> {
    const endpoint = `/${request.name}`;
    const params = new URLSearchParams();

    if (request.languageCode) {
      params.append('languageCode', request.languageCode);
    }
    if (request.regionCode) {
      params.append('regionCode', request.regionCode);
    }
    if (request.sessionToken) {
      params.append('sessionToken', request.sessionToken);
    }

    const queryString = params.toString();
    const fullEndpoint = queryString ? `${endpoint}?${queryString}` : endpoint;

    const headers: Record<string, string> = {};
    if (fieldMask) {
      headers['X-Goog-FieldMask'] = fieldMask.join(',');
    }

    return this.makeRequest<PlaceDetailsResponse>(fullEndpoint, {
      method: 'GET',
      headers,
    });
  }

  /**
   * Text Search (New) - Search for places using text queries
   * https://developers.google.com/maps/documentation/places/web-service/text-search
   */
  async textSearch(
    request: TextSearchRequest,
    fieldMask?: PlaceField[],
  ): Promise<TextSearchResponse> {
    const endpoint = '/places:searchText';
    const headers: Record<string, string> = {};

    if (fieldMask) {
      headers['X-Goog-FieldMask'] = fieldMask.join(',');
    }

    return this.makeRequest<TextSearchResponse>(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
    });
  }

  /**
   * Nearby Search (New) - Search for places within a geographic area
   * https://developers.google.com/maps/documentation/places/web-service/nearby-search
   */
  async nearbySearch(
    request: NearbySearchRequest,
    fieldMask?: PlaceField[],
  ): Promise<NearbySearchResponse> {
    const endpoint = '/places:searchNearby';
    const headers: Record<string, string> = {};

    if (fieldMask) {
      headers['X-Goog-FieldMask'] = fieldMask.join(',');
    }

    return this.makeRequest<NearbySearchResponse>(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
    });
  }

  /**
   * Place Photos (New) - Get photos of a place
   * https://developers.google.com/maps/documentation/places/web-service/place-photos
   */
  async getPlacePhoto(request: PlacePhotoRequest): Promise<Blob> {
    const endpoint = `/${request.name}/media`;
    const params = new URLSearchParams();

    if (request.maxHeightPx) {
      params.append('maxHeightPx', request.maxHeightPx.toString());
    }
    if (request.maxWidthPx) {
      params.append('maxWidthPx', request.maxWidthPx.toString());
    }
    if (request.skipHttpRedirect) {
      params.append('skipHttpRedirect', request.skipHttpRedirect.toString());
    }

    const queryString = params.toString();
    const fullEndpoint = queryString ? `${endpoint}?${queryString}` : endpoint;

    const response = await fetch(`${this.baseUrl}${fullEndpoint}`, {
      method: 'GET',
      headers: {
        'X-Goog-Api-Key': this.apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch photo: ${response.statusText}`);
    }

    return response.blob();
  }

  /**
   * Get photo URL for displaying images
   */
  getPlacePhotoUrl(
    photoName: string,
    maxHeightPx?: number,
    maxWidthPx?: number,
  ): string {
    const params = new URLSearchParams();
    params.append('key', this.apiKey);

    if (maxHeightPx) {
      params.append('maxHeightPx', maxHeightPx.toString());
    }
    if (maxWidthPx) {
      params.append('maxWidthPx', maxWidthPx.toString());
    }

    return `${this.baseUrl}/${photoName}/media?${params.toString()}`;
  }
}

// Export singleton instance
export const googlePlacesClient = new GooglePlacesClient();

// Also export the class for testing
export { GooglePlacesClient };
