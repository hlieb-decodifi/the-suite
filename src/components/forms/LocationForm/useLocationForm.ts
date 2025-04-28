'use client';

import { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LocationFormValues, locationFormSchema } from './schema';
import { toast } from '@/components/ui/use-toast';
import { User } from '@supabase/supabase-js';

export type UseLocationFormProps = {
  onSubmit: (data: LocationFormValues) => Promise<void>;
  user: User;
  initialData?: LocationFormValues | undefined;
};

export function useLocationForm({ 
  onSubmit,
  user,
  initialData
}: UseLocationFormProps) {
  const [isPending, setIsPending] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const defaultValues: LocationFormValues = initialData || {
    address: user.user_metadata?.address?.fullAddress || '',
    country: user.user_metadata?.address?.country || '',
    state: user.user_metadata?.address?.state || '',
    city: user.user_metadata?.address?.city || '',
    streetAddress: `${user.user_metadata?.address?.houseNumber || ''} ${
      user.user_metadata?.address?.street || ''
    }`.trim(),
  };

  const form = useForm<LocationFormValues>({
    resolver: zodResolver(locationFormSchema),
    defaultValues,
  });

  const handleSubmit = useCallback(async (data: LocationFormValues) => {
    try {
      setIsPending(true);
      setSaveSuccess(false);
      
      // Call the parent's onSubmit function
      await onSubmit(data);
      
      toast({
        title: "Address updated",
        description: "Your location information has been updated successfully.",
      });
      
      setSaveSuccess(true);
    } catch (error) {
      console.error('Error updating location:', error);
      toast({
        variant: "destructive",
        title: "Update failed",
        description: "Failed to update your location information. Please try again."
      });
    } finally {
      setIsPending(false);
    }
  }, [onSubmit]);

  return {
    form,
    isPending,
    saveSuccess,
    onSubmit: handleSubmit,
  };
} 