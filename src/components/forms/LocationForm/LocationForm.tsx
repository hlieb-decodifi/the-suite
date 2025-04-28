'use client';

import { User } from '@supabase/supabase-js';
import { LocationFormContent } from './components/LocationFormContent';
import { LocationFormValues } from './schema';
import { useLocationForm } from './useLocationForm';

export type LocationFormProps = {
  user: User;
  onSubmit: (data: LocationFormValues) => Promise<void>;
  onCancel: () => void;
  className?: string;
  initialData?: LocationFormValues;
};

export function LocationForm({
  user,
  onSubmit,
  onCancel,
  className = '',
  initialData,
}: LocationFormProps) {
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
        form={form}
        isPending={isPending}
        saveSuccess={saveSuccess}
        onSubmit={handleSubmit}
        onCancel={onCancel}
      />
    </div>
  );
}
