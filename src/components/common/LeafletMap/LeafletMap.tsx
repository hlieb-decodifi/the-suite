'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { MapPin } from 'lucide-react';
import { Typography } from '@/components/ui/typography';

// Dynamically import the actual map component to avoid SSR issues
const DynamicMapComponent = dynamic(() => import('./LeafletMapClient'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-48 bg-gray-100 rounded-md flex items-center justify-center">
      <div className="text-center">
        <MapPin className="h-8 w-8 text-gray-400 mx-auto mb-2 animate-pulse" />
        <Typography className="text-gray-500 text-sm">
          Loading map...
        </Typography>
      </div>
    </div>
  ),
});

export type LeafletMapProps = {
  latitude: number;
  longitude: number;
  address: string;
  className?: string;
  height?: string;
  showAreaOnly?: boolean; // When true, shows general area instead of exact location
  city?: string;
  state?: string;
  country?: string;
};

export function LeafletMap({
  latitude,
  longitude,
  address,
  className = '',
  height = 'h-48',
  showAreaOnly = false,
  city,
  state,
  country,
}: LeafletMapProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Don't render anything on server side
  if (!isClient) {
    return (
      <div
        className={`w-full ${height} bg-gray-100 rounded-md flex items-center justify-center ${className}`}
      >
        <div className="text-center">
          <MapPin className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <Typography className="text-gray-500 text-sm">
            Loading map...
          </Typography>
        </div>
      </div>
    );
  }

  // Validate coordinates
  if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
    return (
      <div
        className={`w-full ${height} bg-gray-100 rounded-md flex items-center justify-center ${className}`}
      >
        <div className="text-center">
          <MapPin className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <Typography className="text-gray-500 text-sm">
            Invalid coordinates for map display
          </Typography>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full ${height} rounded-md overflow-hidden ${className}`}>
      <DynamicMapComponent
        latitude={latitude}
        longitude={longitude}
        address={address}
        height={height}
        showAreaOnly={showAreaOnly}
        {...(city !== undefined && { city })}
        {...(state !== undefined && { state })}
        {...(country !== undefined && { country })}
      />
    </div>
  );
}
