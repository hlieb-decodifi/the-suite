'use client';

import { User } from '@supabase/supabase-js';
import { DetailsFormContent } from './components/DetailsFormContent';
import { DetailsFormValues } from './schema';
import { useDetailsForm } from './useDetailsForm';

export type DetailsFormProps = {
  user: User;
  onSubmit: (data: DetailsFormValues) => Promise<void>;
  onCancel: () => void;
  className?: string;
  initialData?: DetailsFormValues;
};

export function DetailsForm({
  user,
  onSubmit,
  onCancel,
  className = '',
  initialData,
}: DetailsFormProps) {
  const {
    form,
    isPending,
    saveSuccess,
    onSubmit: handleSubmit,
  } = useDetailsForm({
    onSubmit,
    user,
    initialData,
  });

  return (
    <div className={className}>
      <DetailsFormContent
        form={form}
        isPending={isPending}
        saveSuccess={saveSuccess}
        onSubmit={handleSubmit}
        onCancel={onCancel}
      />
    </div>
  );
}
