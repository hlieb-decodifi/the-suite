'use client';

import { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { DetailsFormValues, detailsFormSchema } from './schema';
import { toast } from '@/components/ui/use-toast';
import { User } from '@supabase/supabase-js';

export type UseDetailsFormProps = {
  onSubmit: (data: DetailsFormValues) => Promise<void>;
  user: User;
  initialData?: DetailsFormValues | undefined;
};

export function useDetailsForm({
  onSubmit,
  user,
  initialData,
}: UseDetailsFormProps) {
  const [isPending, setIsPending] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const defaultValues: DetailsFormValues = initialData || {
    firstName: user.user_metadata?.first_name || '',
    lastName: user.user_metadata?.last_name || '',
    phone: user.user_metadata?.phone || '',
  };

  const form = useForm<DetailsFormValues>({
    resolver: zodResolver(detailsFormSchema),
    defaultValues,
  });

  const handleSubmit = useCallback(
    async (data: DetailsFormValues) => {
      try {
        setIsPending(true);
        setSaveSuccess(false);

        // Call the parent's onSubmit function
        await onSubmit(data);

        toast({
          title: 'Profile updated',
          description: 'Your personal details have been updated successfully.',
        });

        setSaveSuccess(true);
      } catch (error) {
        console.error('Error updating profile details:', error);
        toast({
          variant: 'destructive',
          title: 'Update failed',
          description:
            'Failed to update your profile details. Please try again.',
        });
      } finally {
        setIsPending(false);
      }
    },
    [onSubmit],
  );

  return {
    form,
    isPending,
    saveSuccess,
    onSubmit: handleSubmit,
  };
}
