import { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { serviceSchema, ServiceFormValues } from './schema';

// Helper function to parse duration string
const parseDuration = (
  durationString?: string | null,
): {
  durationHours?: number | undefined;
  durationMinutes?: number | undefined;
} => {
  if (!durationString) return {};

  let hours = 0;
  let minutes = 0;

  const hourMatch = durationString.match(/(\d+)\s*h/);
  const minMatch = durationString.match(/(\d+)\s*m/);
  const numberOnlyMatch = durationString.match(/^(\d+)$/);
  const decimalHourMatch = durationString.match(/(\d+\.\d+)\s*h/);

  if (hourMatch?.[1]) {
    hours = parseInt(hourMatch[1], 10);
  }
  if (minMatch?.[1]) {
    minutes = parseInt(minMatch[1], 10);
  }

  // If only a number is provided, assume minutes
  if (!hourMatch && !minMatch && numberOnlyMatch?.[1]) {
    minutes = parseInt(numberOnlyMatch[1], 10);
  }

  // Basic handling for formats like "1.5h"
  if (decimalHourMatch?.[1] && !minMatch) {
    const totalHours = parseFloat(decimalHourMatch[1]);
    hours = Math.floor(totalHours);
    minutes = Math.round((totalHours - hours) * 60);
  }

  // Ensure we return undefined, not 0, if value wasn't found or parsed as 0
  const resultHours = hours > 0 ? hours : undefined;
  const resultMinutes = minutes > 0 ? minutes : undefined;

  // Return type needs to explicitly allow undefined for exactOptionalPropertyTypes
  return {
    durationHours: resultHours,
    durationMinutes: resultMinutes,
  };
};

export type UseServiceFormProps = {
  onSubmit: (data: ServiceFormValues) => Promise<void> | void;
  defaultValues?: Partial<
    Omit<ServiceFormValues, 'durationHours' | 'durationMinutes'>
  > & { duration?: string };
};

export function useServiceForm({
  onSubmit,
  defaultValues,
}: UseServiceFormProps) {
  const [isPending, setIsPending] = useState(false);
  // Add state for potential submission errors if needed
  // const [error, setError] = useState<string | null>(null);

  const parsedDuration = parseDuration(defaultValues?.duration);

  // Prepare default values carefully for exactOptionalPropertyTypes
  const formDefaultValues: Partial<ServiceFormValues> = {
    name: defaultValues?.name ?? '',
    description: defaultValues?.description ?? '',
    ...(defaultValues?.price !== undefined && { price: defaultValues.price }),
    ...(parsedDuration.durationHours !== undefined && {
      durationHours: parsedDuration.durationHours,
    }),
    ...(parsedDuration.durationMinutes !== undefined && {
      durationMinutes: parsedDuration.durationMinutes,
    }),
  };

  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceSchema),
    // Use the carefully prepared default values
    defaultValues: formDefaultValues,
  });

  const handleSubmit = useCallback(
    async (data: ServiceFormValues) => {
      setIsPending(true);

      // --- Normalize Duration ---
      const hoursInput = data.durationHours ?? 0;
      const minutesInput = data.durationMinutes; // Already required, will be a number

      const totalMinutes = hoursInput * 60 + minutesInput;
      const normalizedHours = Math.floor(totalMinutes / 60);
      const normalizedMinutes = totalMinutes % 60;

      // Create the data object to be submitted
      const normalizedData: ServiceFormValues = {
        ...data,
        durationHours: normalizedHours > 0 ? normalizedHours : undefined,
        durationMinutes: normalizedMinutes, // Minutes are required, keep 0 if result is 0
      };
      // --- End Normalize Duration ---

      try {
        // Pass the *normalized* data to the parent onSubmit
        await onSubmit(normalizedData);
      } catch (err) {
        console.error('Submission failed:', err);
        // Optionally set form error setError('root.serverError', { message: ... })
      } finally {
        setIsPending(false);
      }
    },
    [onSubmit],
  );

  return {
    form,
    isPending,
    // error,
    onSubmit: handleSubmit,
  };
}
