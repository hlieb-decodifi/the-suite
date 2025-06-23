'use client';

import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import { Icon } from 'leaflet';

// Create a custom marker icon
const createCustomIcon = () => {
  return new Icon({
    iconUrl:
      'data:image/svg+xml;base64,' +
      btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24">
        <!-- Animated pulse ring -->
        <circle cx="12" cy="10" r="8" fill="none" stroke="#1E40AF" stroke-width="2" opacity="0.7">
          <animate attributeName="r" values="8;12;8" dur="2s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.7;0;0.7" dur="2s" repeatCount="indefinite"/>
        </circle>
        
        <!-- Shadow -->
        <ellipse cx="12" cy="22" rx="6" ry="2" fill="rgba(0,0,0,0.4)"/>
        
        <!-- White outline for contrast -->
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" 
              fill="white" stroke="none"/>
        
        <!-- Main marker -->
        <path d="M20 10c0 6.5-8 12-8 12s-8-5.5-8-12a8 8 0 0 1 16 0z" 
              fill="#1E40AF" stroke="white" stroke-width="3"/>
        
        <!-- Inner circle -->
        <circle cx="12" cy="10" r="3.5" fill="white" stroke="#1E40AF" stroke-width="2"/>
        
        <!-- Center dot -->
        <circle cx="12" cy="10" r="2" fill="#1E40AF"/>
      </svg>
    `),
    iconSize: [48, 48],
    iconAnchor: [24, 48],
    popupAnchor: [0, -48],
  });
};

export type LeafletMapClientProps = {
  latitude: number;
  longitude: number;
  address: string;
  height: string;
  showAreaOnly?: boolean;
  city?: string;
  state?: string;
  country?: string;
};

export default function LeafletMapClient({
  latitude,
  longitude,
  address,
  height,
  showAreaOnly = false,
  city,
  state,
  country,
}: LeafletMapClientProps) {
  const customIcon = createCustomIcon();

  // Calculate optimal zoom level for circle visibility
  const circleRadius = 3000; // 3km in meters

  // For area view, calculate zoom to fit circle with some padding
  // At zoom 10: Ensures 3km circle is fully visible with good margin
  // At zoom 11: Circle might touch edges on smaller screens
  // At zoom 12: Circle would likely be cut off
  const zoomLevel = showAreaOnly ? 10 : 16;
  const displayText = showAreaOnly
    ? `${city}, ${state}, ${country}`
        .replace(/^,\s*|,\s*$|(?:,\s*){2,}/g, '')
        .trim()
    : address;

  return (
    <div className={`w-full ${height} z-0 relative`}>
      <MapContainer
        center={[latitude, longitude]}
        zoom={zoomLevel}
        style={{ height: '100%', width: '100%' }}
        className="rounded-md"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {showAreaOnly ? (
          // Show a general area circle instead of exact location
          <>
            <Circle
              center={[latitude, longitude]}
              radius={circleRadius} // 3km radius to show general area
              pathOptions={{
                color: '#1E40AF',
                fillColor: '#1E40AF',
                fillOpacity: 0.2,
                weight: 3,
              }}
            >
              <Popup>
                <div className="text-sm">
                  <div className="font-medium mb-1">Service Area</div>
                  <div className="text-gray-600">{displayText}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Approximate service area for privacy
                  </div>
                </div>
              </Popup>
            </Circle>
          </>
        ) : (
          // Show exact location marker
          <Marker position={[latitude, longitude]} icon={customIcon}>
            <Popup>
              <div className="text-sm">
                <div className="font-medium mb-1">Location</div>
                <div className="text-gray-600">{displayText}</div>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}
