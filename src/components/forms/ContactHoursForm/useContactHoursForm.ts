import { useState, useCallback } from 'react';
import {
  useForm,
  useFieldArray,
} from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  contactHoursSchema,
  ContactHoursFormValues,
} from './schema';
import { DAYS_OF_WEEK, parseDisplayHours } from './constants';

// Update input type
export type ContactHoursDefaultInput = {
  hours: { day: string; hours: string }[]; // Array from original component
};

export type UseContactHoursFormProps = {
  onSubmit: (data: ContactHoursFormValues) => Promise<void> | void;
  // Allow defaultValues itself to be undefined
  defaultValues?: ContactHoursDefaultInput | undefined;
};

// Update mapping helper
const mapInputToFormValues = (
  input: ContactHoursDefaultInput | undefined,
): Partial<ContactHoursFormValues> => {
  if (!input) {
    return {
      hours: DAYS_OF_WEEK.map((day) => ({
        day,
        // Default enabled to false here, as schema is optional
        enabled: false,
        startTime: undefined,
        endTime: undefined,
      })),
    };
  }

  const mappedHours = DAYS_OF_WEEK.map((dayName) => {
    const dayData = input.hours.find((d) => d.day === dayName);
    const parsedTimes = parseDisplayHours(dayData?.hours);
    const isEnabled = !!dayData && dayData.hours.toLowerCase() !== 'closed';

    return {
      day: dayName,
      enabled: isEnabled,
      startTime: isEnabled ? parsedTimes.startTime : undefined,
      endTime: isEnabled ? parsedTimes.endTime : undefined,
    };
  });

  return {
    hours: mappedHours,
  };
};

export function useContactHoursForm({
  onSubmit,
  defaultValues,
}: UseContactHoursFormProps) {
  const [isPending, setIsPending] = useState(false);

  const form = useForm<ContactHoursFormValues>({
    resolver: zodResolver(contactHoursSchema),
    defaultValues: mapInputToFormValues(defaultValues),
  });

  const hoursFieldArray = useFieldArray({
    control: form.control,
    name: 'hours',
  });

  const handleSubmit = useCallback(
    async (data: ContactHoursFormValues) => {
      setIsPending(true);
      try {
        const submitData = {
          hours: data.hours.map(h => ({
            ...h,
            enabled: h.enabled ?? false,
          }))
        };
        await onSubmit(submitData as ContactHoursFormValues);
      } catch (err) {
        console.error('Submission failed:', err);
      } finally {
        setIsPending(false);
      }
    },
    [onSubmit]
  );

  return {
    form,
    hoursFieldArray,
    isPending,
    onSubmit: handleSubmit,
  };
}