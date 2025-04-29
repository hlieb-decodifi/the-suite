import { Address } from '@/api/profiles';
import { LocationFormValues } from '@/components/forms/LocationForm';
import { useMemo } from 'react';

// Define a type for the user metadata
type UserMetadata = {
  address?: {
    fullAddress?: string;
    country?: string;
    state?: string;
    city?: string;
    houseNumber?: string;
    street?: string;
  };
};

export function useAddressFormatter() {
  // Helper function to format address display
  const formatAddress = useMemo(() => (
    (address: Address | null, userMetadata: UserMetadata | null): LocationFormValues => {
      if (address) {
        // Format from database address
        return {
          address: `${address.street_address || ''}, ${address.city || ''}, ${address.state || ''}, ${address.country || ''}`.replace(/^,\s*|,\s*$|(?:,\s*){2,}/g, '').trim(),
          country: address.country || '',
          state: address.state || '',
          city: address.city || '',
          streetAddress: address.street_address || '',
        };
      } else if (userMetadata?.address) {
        // Fallback to user metadata if no address in DB
        return {
          address: userMetadata.address.fullAddress || '',
          country: userMetadata.address.country || '',
          state: userMetadata.address.state || '',
          city: userMetadata.address.city || '',
          streetAddress: `${userMetadata.address.houseNumber || ''} ${
            userMetadata.address.street || ''
          }`.trim(),
        };
      }
      
      // Default empty values
      return {
        address: '',
        country: '',
        state: '',
        city: '',
        streetAddress: '',
      };
    }
  ), []);

  return { formatAddress };
} 