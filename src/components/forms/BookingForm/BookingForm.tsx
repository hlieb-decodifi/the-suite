'use client';

import { FormFieldWrapper } from '@/components/forms/common/FormFieldWrapper';
import { FormInput } from '@/components/forms/common/FormInput';
import { FormError } from '@/components/forms/components/FormError';
import { ServiceListItem } from '@/components/templates/ServicesTemplate/types';
import { Form } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Typography } from '@/components/ui/typography';
import { useEffect, useMemo, useState, useRef } from 'react';
import useQueryClient from './useQueryClient';
import {
  BookingFormDateTimePicker,
  BookingFormExtraServices,
  BookingFormRadioGroup,
  BookingFormServiceCard,
} from './components';
import { BookingFormValues } from './schema';
import { useBookingForm } from './useBookingForm';
import { useActivityTracker } from '@/api/activity-log';

export type BookingFormProps = {
  service: ServiceListItem;
  extraServices?: ServiceListItem[];
  isLoadingExtraServices?: boolean;
  availablePaymentMethods?: { id: string; name: string }[];
  isLoadingPaymentMethods?: boolean;
  availableTimeSlots?: string[];
  isLoadingTimeSlots?: boolean;
  availableDays?: string[];
  selectedDate: Date | undefined;
  onSelectDate?: (date: Date | undefined) => void;
  onSubmitSuccess: (formData: BookingFormValues, totalPrice: number) => void;
  onSubmitStateChange?: (isSubmitting: boolean) => void;
  onFormDataChange?: (data: {
    timeSlot?: string;
    totalPrice: number;
    extraServices: ServiceListItem[];
    tipAmount?: number;
  }) => void;
  isCalendarLoading?: boolean;
  professionalTimezone?: string;
  clientTimezone?: string;
};

export function BookingForm({
  service,
  extraServices = [],
  isLoadingExtraServices = false,
  availablePaymentMethods = [],
  isLoadingPaymentMethods = false,
  availableTimeSlots,
  isLoadingTimeSlots = false,
  availableDays = [],
  selectedDate,
  onSelectDate,
  onSubmitSuccess,
  onSubmitStateChange,
  onFormDataChange,
  isCalendarLoading = false,
  professionalTimezone,
  clientTimezone,
}: BookingFormProps) {
  // Use local state for date to ensure component has control
  const [localSelectedDate, setLocalSelectedDate] = useState<Date | undefined>(
    selectedDate,
  );

  // Activity tracking
  const { trackBookingStarted } = useActivityTracker();
  const hasTrackedBookingStarted = useRef(false);

  // QueryClient for refetching available time slots
  const queryClient = useQueryClient();

  // Sync with parent when parent date changes
  useEffect(() => {
    if (selectedDate !== localSelectedDate) {
      setLocalSelectedDate(selectedDate);
      if (selectedDate) {
        form.setValue('date', selectedDate);
      }
    }
  }, [selectedDate]);

  // Track booking started when user selects a date (serious intent indicator)
  useEffect(() => {
    if (localSelectedDate && !hasTrackedBookingStarted.current) {
      hasTrackedBookingStarted.current = true;
      trackBookingStarted(service.id, {
        service_name: service.name,
        professional_id: service.professional.id,
        professional_name: service.professional.name,
        selected_date: localSelectedDate.toISOString(),
        price: service.price,
        source: 'date_selection',
      });
    }
  }, [localSelectedDate, service, trackBookingStarted]);

  const { form, calculateTotalPrice, onSubmit, isPending } = useBookingForm({
    onSubmit: async (data: BookingFormValues) => {
      // Parse the timeSlot string (format: "HH:mm")
      const timeParts = data.timeSlot.split(':');
      if (timeParts.length !== 2) {
        throw new Error('Invalid time format');
      }

      // We've verified the array has exactly 2 elements
      const hours = parseInt(timeParts[0] as string, 10);
      const minutes = parseInt(timeParts[1] as string, 10);

      if (isNaN(hours) || isNaN(minutes)) {
        throw new Error('Invalid time format');
      }

      // Create a new date object to avoid mutating the original
      const dateWithTime = new Date(data.date);
      dateWithTime.setHours(hours);
      dateWithTime.setMinutes(minutes);

      // Add the combined date to the form data
      const formDataWithCombinedDate = {
        ...data,
        dateWithTime,
      };

      console.log('formDataWithCombinedDate', formDataWithCombinedDate);

      // Call the onSubmitSuccess callback with the enhanced form data and price
      onSubmitSuccess(formDataWithCombinedDate, calculateTotalPrice());

      // Force refetch of available time slots after booking
      queryClient.invalidateQueries({ queryKey: ['availableTimeSlots'] });
    },
    service,
    extraServices,
  });
  // Refetch available time slots on mount/page reload/navigation
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ['availableTimeSlots'] });
  }, [queryClient]);

  // Notify parent about submission state changes
  useEffect(() => {
    if (onSubmitStateChange) {
      onSubmitStateChange(isPending);
    }
  }, [isPending, onSubmitStateChange]);

  // Log timezone information
  useEffect(() => {
    console.log('BookingForm timezone info:', {
      professionalTimezone,
      clientTimezone,
      browserTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      timezoneOffset: new Date().getTimezoneOffset(),
    });
  }, [professionalTimezone, clientTimezone]);

  const totalPrice = useMemo(
    () => calculateTotalPrice(),
    [
      calculateTotalPrice,
      form.watch('extraServiceIds'),
      form.watch('tipAmount'),
    ],
  );

  // Payment method options
  const paymentOptions = useMemo(() => {
    if (availablePaymentMethods && availablePaymentMethods.length > 0) {
      return availablePaymentMethods.map((method) => ({
        value: method.id,
        label: method.name,
      }));
    }

    return [];
  }, [availablePaymentMethods]);

  // Get selected extra services for the datetime picker
  const selectedExtraServices = useMemo(() => {
    const selectedIds = form.watch('extraServiceIds') || [];
    return extraServices.filter((service) => selectedIds.includes(service.id));
  }, [extraServices, form.watch('extraServiceIds')]);

  // Notify parent about form data changes
  useEffect(() => {
    if (onFormDataChange) {
      const tipAmount = form.watch('tipAmount');
      onFormDataChange({
        timeSlot: form.watch('timeSlot'),
        totalPrice,
        extraServices: selectedExtraServices,
        ...(tipAmount !== undefined && { tipAmount }),
      });
    }
  }, [
    onFormDataChange,
    form.watch('timeSlot'),
    totalPrice,
    selectedExtraServices,
    form.watch('tipAmount'),
  ]);

  // Handle date selection
  const handleDateSelect = (date: Date | undefined) => {
    // Update local state first
    setLocalSelectedDate(date);

    // Update parent component state
    if (onSelectDate) {
      onSelectDate(date);
    }

    // Update form value
    form.setValue('date', date as Date);

    // Clear timeSlot when date changes
    if (date) {
      form.setValue('timeSlot', '');
    }
  };

  return (
    <Form {...form}>
      <form
        id="booking-form"
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-6"
        noValidate
      >
        {/* Main service */}
        <div className="space-y-3">
          <Typography variant="h3" className="text-lg font-semibold">
            Selected Service
          </Typography>
          <BookingFormServiceCard
            id="mainService"
            name={service.name}
            description={service.description}
            duration={service.duration}
            price={service.price}
            isPrimary
          />
        </div>
        {/* Extra services */}
        <BookingFormExtraServices
          extraServices={extraServices}
          isLoadingExtraServices={isLoadingExtraServices}
          form={form}
        />

        {/* Date and Time Selection - Using the new component */}
        <BookingFormDateTimePicker
          selectedDate={localSelectedDate}
          onSelectDate={(date) => {
            handleDateSelect(date);
          }}
          availableDays={availableDays}
          availableTimeSlots={availableTimeSlots}
          selectedTimeSlot={form.watch('timeSlot')}
          onSelectTimeSlot={(timeSlot: string) => {
            form.setValue('timeSlot', timeSlot);
          }}
          service={service}
          selectedExtraServices={selectedExtraServices}
          isLoading={isLoadingTimeSlots}
          isCalendarLoading={isCalendarLoading}
          professionalTimezone={professionalTimezone}
          clientTimezone={clientTimezone}
        />

        {/* Show form errors for date and time */}
        <div className="relative">
          {!form.formState.errors.date && form.formState.errors.timeSlot && (
            <FormError
              error={form.formState.errors.timeSlot.message?.toString()}
            />
          )}
          {form.formState.errors.date && (
            <FormError error={form.formState.errors.date.message?.toString()} />
          )}
        </div>

        {/* Payment Method - Using custom BookingFormRadioGroup */}
        <div className="space-y-3">
          <Typography variant="h3" className="text-lg font-semibold">
            Payment Method
          </Typography>

          {isLoadingPaymentMethods ? (
            <div className="p-4 border rounded-md bg-muted/10 flex items-center justify-center">
              <Typography className="text-muted-foreground">
                Loading payment methods...
              </Typography>
            </div>
          ) : (
            <BookingFormRadioGroup
              options={paymentOptions}
              value={form.watch('paymentMethodId')}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                form.setValue('paymentMethodId', e.target.value)
              }
              error={form.formState.errors.paymentMethodId?.message?.toString()}
              name="paymentMethodId"
            />
          )}
        </div>
        {/* Notes */}
        <div className="space-y-3 relative">
          <Typography variant="h3" className="text-lg font-semibold">
            Additional Notes
          </Typography>

          <Textarea
            placeholder="Any special requests or notes for the professional..."
            className="resize-none min-h-[100px]"
            {...form.register('notes')}
          />

          <FormError error={form.formState.errors.notes?.message?.toString()} />
        </div>
        {/* Tip - using FormFieldWrapper and FormInput */}
        <div className="space-y-3">
          <Typography variant="h3" className="text-lg font-semibold">
            Add a Tip (Optional)
          </Typography>

          <FormFieldWrapper
            control={form.control}
            name="tipAmount"
            label="Tip Amount ($)"
          >
            {(field) => (
              <FormInput
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                numericOnly
                allowDecimal
                {...field}
                onChange={(e) => {
                  const value =
                    e.target.value === '' ? 0 : Number(e.target.value);
                  field.onChange(value);
                }}
                value={field.value === 0 ? '' : (field.value?.toString() ?? '')}
              />
            )}
          </FormFieldWrapper>

          <Typography variant="muted" className="text-sm">
            Show your appreciation for exceptional service
          </Typography>
        </div>
      </form>
    </Form>
  );
}
