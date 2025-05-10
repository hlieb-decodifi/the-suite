'use client';

import { useState, useEffect } from 'react';

/**
 * Custom hook that returns a boolean indicating if the current viewport matches the provided media query.
 * @param query The media query to check, e.g. '(max-width: 768px)'
 * @returns A boolean indicating if the media query matches
 */
export function useMediaQuery(query: string): boolean {
  // Initialize with defaultValue=false for SSR
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    // Create a MediaQueryList object
    const mediaQuery = window.matchMedia(query);
    
    // Set initial value
    setMatches(mediaQuery.matches);

    // Create event listener
    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Add event listener
    mediaQuery.addEventListener('change', handleChange);
    
    // Cleanup
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [query]);

  return matches;
} 