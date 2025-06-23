'use client';

import { User } from '@supabase/supabase-js';
import { LocationFormContent } from './components/LocationFormContent';
import { LocationFormValues } from './schema';
import { useLocationForm } from './useLocationForm';
import { forwardRef } from 'react';

export type LocationFormProps = {
  user: User;
  onSubmit: (data: LocationFormValues) => Promise<void>;
  onCancel: () => void;
  className?: string;
  initialData?: LocationFormValues;
  hideButtons?: boolean;
};

export const LocationForm = forwardRef<HTMLFormElement, LocationFormProps>(
  function LocationForm(
    {
      user,
      onSubmit,
      onCancel,
      className = '',
      initialData,
      hideButtons = false,
    },
    ref,
  ) {
    const {
      form,
      isPending,
      saveSuccess,
      onSubmit: handleSubmit,
    } = useLocationForm({
      onSubmit,
      user,
      initialData,
    });

    return (
      <div className={className}>
        <LocationFormContent
          ref={ref}
          form={form}
          isPending={isPending}
          saveSuccess={saveSuccess}
          onSubmit={handleSubmit}
          onCancel={onCancel}
          hideButtons={hideButtons}
        />
      </div>
    );
  },
);
