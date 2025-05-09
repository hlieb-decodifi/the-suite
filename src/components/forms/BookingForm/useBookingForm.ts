import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { bookingSchema, BookingFormValues } from './schema';
import { useCallback, useState } from 'react';
import { ServiceListItem } from '@/components/templates/ServicesTemplate/types';
import { useCalculateTotalPrice } from './useCalculateTotalPrice';

export type UseBookingFormProps = {
  onSubmit: (data: BookingFormValues) => Promise<void | string> | void;
  service: ServiceListItem;
  extraServices?: ServiceListItem[];
  availablePaymentMethods?: { id: string; name: string }[];
  defaultValues?: Partial<BookingFormValues>;
};

export function useBookingForm({
  onSubmit,
  service,
  extraServices = [],
  defaultValues,
}: UseBookingFormProps) {
  // State management
  const [isPending, setIsPending] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3; // Service details, Date/Time, Payment/Summary

  // Prepare default values including the selected service
  const formDefaultValues: Partial<BookingFormValues> = {
    serviceId: service.id,
    extraServiceIds: [],
    tipAmount: 0,
    ...defaultValues,
  };

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: formDefaultValues,
  });

  // Form submission handler
  const handleSubmit = useCallback(
    async (data: BookingFormValues) => {
      setIsPending(true);
      try {
        await onSubmit(data);
      } catch (err) {
        console.error('Booking submission failed:', err);
        form.setError('root.serverError', { 
          message: 'Failed to create booking. Please try again.' 
        });
      } finally {
        setIsPending(false);
      }
    },
    [onSubmit, form],
  );

  // Multi-step form navigation
  const handleNextStep = useCallback(() => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  }, [currentStep, totalSteps]);

  const handlePreviousStep = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  // Price calculation
  const calculateTotalPrice = useCalculateTotalPrice({
    service,
    extraServices,
    form,
  });

  return {
    form,
    isPending,
    currentStep,
    totalSteps,
    handleNextStep,
    handlePreviousStep,
    calculateTotalPrice,
    onSubmit: handleSubmit,
  };
} 