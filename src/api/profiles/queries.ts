import { useMutation, useQuery } from '@tanstack/react-query';
import {
  getClientProfileWithAddress,
  updateClientLocation,
  updateUserDetails,
} from './fetchers';
import { AddressFormData, DetailFormData } from './types';
import { User } from '@supabase/supabase-js';

// Hook to fetch client profile with address
export function useClientProfile(userId: string) {
  return useQuery({
    queryKey: ['clientProfile', userId],
    queryFn: () => getClientProfileWithAddress(userId),
    enabled: !!userId,
  });
}

// Hook to update user details
export function useUpdateUserDetails() {
  return useMutation({
    mutationFn: ({
      user,
      details,
    }: {
      user: User;
      details: DetailFormData;
    }) => {
      return updateUserDetails(user, details);
    },
  });
}

// Hook to update location
export function useUpdateLocation() {
  return useMutation({
    mutationFn: ({
      userId,
      addressData,
      existingAddressId,
    }: {
      userId: string;
      addressData: AddressFormData;
      existingAddressId: string | null;
    }) => {
      return updateClientLocation(userId, addressData, existingAddressId);
    },
  });
}
