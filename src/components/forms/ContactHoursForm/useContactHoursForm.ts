import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { contactHoursSchema, ContactHoursFormValues } from './schema';
import { useCallback, useState, useEffect } from 'react';
import type { Resolver } from 'react-hook-form';
import { DAYS_OF_WEEK, DayOfWeek } from './constants';
import { WorkingHoursEntry } from '@/types/working_hours';

export type UseContactHoursFormProps = {
  onSubmit: (data: ContactHoursFormValues) => Promise<void> | void;
  defaultValues?: WorkingHoursEntry[] | null; 
};

// Function to create default form values from DB structure or baseline
const createInitialFormValues = (dbValues: WorkingHoursEntry[] | null): ContactHoursFormValues => {
  const initialHours = DAYS_OF_WEEK.map(day => {
    const existing = dbValues?.find(d => d.day === day);
    // Ensure the day property matches the expected DayOfWeek type
    return existing ? { ...existing, day: day as DayOfWeek } : { day, enabled: false, startTime: null, endTime: null };
  });
  // Explicitly type the return value to ensure consistency with the schema
  return { hours: initialHours as ContactHoursFormValues['hours'] };
};

export function useContactHoursForm({
  onSubmit,
  defaultValues,
}: UseContactHoursFormProps) {
  const [isPending, setIsPending] = useState(false);

  // Initialize form with structured data, handling potential undefined defaultValues
  const initialFormValues = createInitialFormValues(defaultValues ?? null);

  const form = useForm<ContactHoursFormValues>({
    resolver: zodResolver(contactHoursSchema) as Resolver<ContactHoursFormValues>,
    defaultValues: initialFormValues, 
    mode: 'onBlur',
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'hours',
  });

  // Reset form when defaultValues change (e.g., data loaded)
  useEffect(() => {
    // Pass null if defaultValues is undefined/null
    form.reset(createInitialFormValues(defaultValues ?? null));
  }, [defaultValues, form]);


  const handleSubmit = useCallback(
    async (data: ContactHoursFormValues) => {
      setIsPending(true);
      try {
        await onSubmit(data);
      } catch (err) {
        console.error('Submission failed:', err);
        form.setError('root.serverError', {
          type: 'manual',
          message: 'Failed to save working hours. Please try again.',
        });
      } finally {
        setIsPending(false);
      }
    },
    [onSubmit, form],
  );

  return {
    form,
    fields,
    hoursFieldArray: fields, // For backward compatibility
    append,
    remove,
    isPending,
    onSubmit: handleSubmit,
  };
}