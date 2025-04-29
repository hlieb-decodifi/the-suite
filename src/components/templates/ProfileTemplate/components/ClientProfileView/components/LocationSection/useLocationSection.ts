'use client';

import { User } from '@supabase/supabase-js';
import { useToast } from '@/components/ui/use-toast';
import { useState } from 'react';
import { updateLocationAction } from '@/api/profiles/actions';
import { ClientProfile } from '@/api/profiles';
import { LocationFormValues } from '@/components/forms/LocationForm';

type UseLocationSectionProps = {
  user: User;
  profile: ClientProfile | null;
  setFormData: (data: LocationFormValues) => void;
  setIsEditing: (isEditing: boolean) => void;
};

export function useLocationSection({
  user,
  profile,
  setFormData,
  setIsEditing,
}: UseLocationSectionProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (data: LocationFormValues) => {
    try {
      setIsSubmitting(true);

      // Use the server action to update location
      const result = await updateLocationAction({
        userId: user.id,
        addressData: {
          country: data.country || '',
          state: data.state || '',
          city: data.city || '',
          streetAddress: data.streetAddress || '',
        },
        existingAddressId: profile?.address_id || null,
      });

      if (result.success) {
        // Update local state with new values
        setFormData(data);
        setIsEditing(false);
        toast({
          title: 'Location updated',
          description: 'Your location has been successfully updated.',
          variant: 'default',
        });
      } else {
        throw new Error(result.error || 'Failed to update location');
      }
    } catch (error) {
      console.error('Error saving address:', error);
      toast({
        title: 'Update failed',
        description:
          error instanceof Error ? error.message : 'Failed to update location',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    handleSubmit,
    isSubmitting,
  };
} 