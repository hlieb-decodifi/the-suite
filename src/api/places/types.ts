// Google Places API (New) TypeScript definitions
// Based on: https://developers.google.com/maps/documentation/places/web-service/op-overview

export type LatLng = {
  latitude: number;
  longitude: number;
};

export type Viewport = {
  low: LatLng;
  high: LatLng;
};

export type Circle = {
  center: LatLng;
  radius: number;
};

export type AddressComponent = {
  longText: string;
  shortText: string;
  types: string[];
  languageCode: string;
};

export type LocalizedText = {
  text: string;
  languageCode: string;
};

export type Photo = {
  name: string;
  widthPx: number;
  heightPx: number;
  authorAttributions: AuthorAttribution[];
};

export type AuthorAttribution = {
  displayName: string;
  uri: string;
  photoUri: string;
};

export type PlusCode = {
  globalCode: string;
  compoundCode: string;
};

export type OpeningHours = {
  openNow: boolean;
  periods: Period[];
  weekdayDescriptions: string[];
};

export type Period = {
  open: TimeOfDay;
  close: TimeOfDay;
};

export type TimeOfDay = {
  hour: number;
  minute: number;
  date: {
    year: number;
    month: number;
    day: number;
  };
};

export type Review = {
  name: string;
  relativePublishTimeDescription: string;
  rating: number;
  text: LocalizedText;
  originalText: LocalizedText;
  authorAttribution: AuthorAttribution;
  publishTime: string;
};

export type PaymentOptions = {
  acceptsCreditCards: boolean;
  acceptsDebitCards: boolean;
  acceptsCashOnly: boolean;
  acceptsNfc: boolean;
};

export type ParkingOptions = {
  paidParkingLot: boolean;
  paidStreetParking: boolean;
  freeParkingLot: boolean;
  freeStreetParking: boolean;
  valetParking: boolean;
  paidGarageParking: boolean;
  freeGarageParking: boolean;
};

export type AccessibilityOptions = {
  wheelchairAccessibleParking: boolean;
  wheelchairAccessibleEntrance: boolean;
  wheelchairAccessibleRestroom: boolean;
  wheelchairAccessibleSeating: boolean;
};

export type Place = {
  name: string;
  id: string;
  displayName: LocalizedText;
  types: string[];
  primaryType: string;
  primaryTypeDisplayName: LocalizedText;
  nationalPhoneNumber: string;
  internationalPhoneNumber: string;
  formattedAddress: string;
  shortFormattedAddress: string;
  addressComponents: AddressComponent[];
  plusCode: PlusCode;
  location: LatLng;
  viewport: Viewport;
  rating: number;
  googleMapsUri: string;
  websiteUri: string;
  businessStatus: 'OPERATIONAL' | 'CLOSED_TEMPORARILY' | 'CLOSED_PERMANENTLY';
  userRatingCount: number;
  iconMaskBaseUri: string;
  iconBackgroundColor: string;
  takeout: boolean;
  delivery: boolean;
  dineIn: boolean;
  curbsidePickup: boolean;
  reservable: boolean;
  servesBreakfast: boolean;
  servesLunch: boolean;
  servesDinner: boolean;
  servesBeer: boolean;
  servesWine: boolean;
  servesBrunch: boolean;
  servesVegetarianFood: boolean;
  currentOpeningHours: OpeningHours;
  currentSecondaryOpeningHours: OpeningHours[];
  regularOpeningHours: OpeningHours;
  regularSecondaryOpeningHours: OpeningHours[];
  utcOffsetMinutes: number;
  photos: Photo[];
  adrFormatAddress: string;
  reviews: Review[];
  accessibilityOptions: AccessibilityOptions;
  parkingOptions: ParkingOptions;
  paymentOptions: PaymentOptions;
  evChargeOptions: Record<string, unknown>; // Complex type, can be expanded if needed
  // New attributes from Places API (New)
  outdoorSeating: boolean;
  liveMusic: boolean;
  menuForChildren: boolean;
  servesCocktails: boolean;
  servesDessert: boolean;
  servesCoffee: boolean;
  goodForChildren: boolean;
  allowsDogs: boolean;
  restroom: boolean;
  goodForGroups: boolean;
  goodForWatchingSports: boolean;
  // AI-powered summaries
  placeSummary?: LocalizedText;
  reviewSummary?: LocalizedText;
  areaSummary?: LocalizedText;
};

// Autocomplete API types
export type AutocompletePrediction = {
  place: string; // Place resource name
  placeId: string;
  text: LocalizedText;
  structuredFormat: StructuredFormat;
  types: string[];
};

export type StructuredFormat = {
  mainText: LocalizedText;
  secondaryText: LocalizedText;
};

export type QueryPrediction = {
  text: LocalizedText;
  structuredFormat: StructuredFormat;
};

// Request/Response types
export type AutocompleteRequest = {
  input: string;
  sessionToken?: string;
  locationBias?: LocationBias;
  locationRestriction?: LocationRestriction;
  includedPrimaryTypes?: string[];
  includedRegionCodes?: string[];
  languageCode?: string;
  regionCode?: string;
  origin?: LatLng;
  inputOffset?: number;
  includeQueryPredictions?: boolean;
};

export type AutocompleteResponse = {
  suggestions: Suggestion[];
};

export type Suggestion = {
  placePrediction?: AutocompletePrediction;
  queryPrediction?: QueryPrediction;
};

export type LocationBias = {
  rectangle?: Rectangle;
  circle?: Circle;
};

export type LocationRestriction = {
  rectangle?: Rectangle;
};

export type Rectangle = {
  low: LatLng;
  high: LatLng;
};

// Place Details API types
export type PlaceDetailsRequest = {
  name: string; // Place resource name (e.g., "places/ChIJN1t_tDeuEmsRUsoyG83frY4")
  languageCode?: string;
  regionCode?: string;
  sessionToken?: string;
};

export type PlaceDetailsResponse = {
  place: Place;
};

// Search API types
export type TextSearchRequest = {
  textQuery: string;
  pageSize?: number;
  pageToken?: string;
  languageCode?: string;
  regionCode?: string;
  rankPreference?: 'RELEVANCE' | 'DISTANCE';
  includedType?: string;
  openNow?: boolean;
  minRating?: number;
  maxResultCount?: number;
  priceLevels?: (
    | 'PRICE_LEVEL_INEXPENSIVE'
    | 'PRICE_LEVEL_MODERATE'
    | 'PRICE_LEVEL_EXPENSIVE'
    | 'PRICE_LEVEL_VERY_EXPENSIVE'
  )[];
  strictTypeFiltering?: boolean;
  locationBias?: LocationBias;
  locationRestriction?: LocationRestriction;
  evOptions?: Record<string, unknown>;
};

export type TextSearchResponse = {
  places: Place[];
  nextPageToken?: string;
};

export type NearbySearchRequest = {
  includedTypes?: string[];
  excludedTypes?: string[];
  includedPrimaryTypes?: string[];
  excludedPrimaryTypes?: string[];
  maxResultCount?: number;
  locationRestriction: Circle;
  rankPreference?: 'POPULARITY' | 'DISTANCE';
  languageCode?: string;
  regionCode?: string;
};

export type NearbySearchResponse = {
  places: Place[];
};

// Place Photo API types
export type PlacePhotoRequest = {
  name: string; // Photo resource name
  maxHeightPx?: number;
  maxWidthPx?: number;
  skipHttpRedirect?: boolean;
};

// Error types
export type PlacesApiError = {
  error: {
    code: number;
    message: string;
    status: string;
    details?: Record<string, unknown>[];
  };
};

// Session token for billing optimization
export type SessionToken = {
  token: string;
  createdAt: Date;
};

// Custom types for our application
export type AddressData = {
  google_place_id: string;
  formatted_address: string;
  street_number?: string;
  route?: string;
  locality?: string;
  sublocality?: string;
  administrative_area_level_1?: string;
  administrative_area_level_2?: string;
  country: string;
  country_code?: string;
  postal_code?: string;
  latitude: number;
  longitude: number;
  place_name?: string;
  place_types: string[];
  google_data_raw: Place;
  // Legacy fields for backward compatibility
  city: string;
  state: string;
  street_address: string;
};

// Field masks for controlling response data
export type PlaceField =
  | 'places.id'
  | 'places.name'
  | 'places.displayName'
  | 'places.formattedAddress'
  | 'places.shortFormattedAddress'
  | 'places.addressComponents'
  | 'places.location'
  | 'places.viewport'
  | 'places.plusCode'
  | 'places.types'
  | 'places.primaryType'
  | 'places.primaryTypeDisplayName'
  | 'places.nationalPhoneNumber'
  | 'places.internationalPhoneNumber'
  | 'places.rating'
  | 'places.userRatingCount'
  | 'places.reviews'
  | 'places.photos'
  | 'places.googleMapsUri'
  | 'places.websiteUri'
  | 'places.businessStatus'
  | 'places.currentOpeningHours'
  | 'places.regularOpeningHours'
  | 'places.accessibilityOptions'
  | 'places.parkingOptions'
  | 'places.paymentOptions'
  | 'places.outdoorSeating'
  | 'places.liveMusic'
  | 'places.menuForChildren'
  | 'places.servesCocktails'
  | 'places.servesDessert'
  | 'places.servesCoffee'
  | 'places.goodForChildren'
  | 'places.allowsDogs'
  | 'places.restroom'
  | 'places.goodForGroups'
  | 'places.goodForWatchingSports'
  | 'places.placeSummary'
  | 'places.reviewSummary'
  | 'places.areaSummary';

// Autocomplete field masks use a different structure (suggestions.placePrediction.*)
export type AutocompleteField =
  | 'suggestions.placePrediction.place'
  | 'suggestions.placePrediction.placeId'
  | 'suggestions.placePrediction.text'
  | 'suggestions.placePrediction.structuredFormat'
  | 'suggestions.placePrediction.types'
  | 'suggestions.queryPrediction.text'
  | 'suggestions.queryPrediction.structuredFormat';
