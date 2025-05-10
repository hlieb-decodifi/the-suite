/* eslint-disable max-lines-per-function */
'use client';

import { ServiceListItem } from '@/components/templates/ServicesTemplate/types';
import { Form } from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Typography } from '@/components/ui/typography';
import { formatCurrency } from '@/utils/formatCurrency';
import { formatDuration } from '@/utils/formatDuration';
import { Clock } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  BookingFormDateTimePicker,
  BookingFormExtraServices,
  BookingFormRadioGroup,
  BookingFormServiceCard,
} from './components';
import { BookingFormValues } from './schema';
import { useBookingForm } from './useBookingForm';
import { FormFieldWrapper } from '@/components/forms/common/FormFieldWrapper';
import { FormInput } from '@/components/forms/common/FormInput';
import { FormError } from '@/components/forms/components/FormError';

export type BookingFormProps = {
  service: ServiceListItem;
  extraServices?: ServiceListItem[];
  isLoadingExtraServices?: boolean;
  availablePaymentMethods?: { id: string; name: string }[];
  isLoadingPaymentMethods?: boolean;
  availableTimeSlots?: string[];
  availableDays?: string[];
  onSubmitSuccess: (
    bookingId: string,
    formData: BookingFormValues,
    totalPrice: number,
  ) => void;
};

export function BookingForm({
  service,
  extraServices = [],
  isLoadingExtraServices = false,
  availablePaymentMethods = [],
  isLoadingPaymentMethods = false,
  availableTimeSlots,
  availableDays = [],
  onSubmitSuccess,
}: BookingFormProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  const { form, calculateTotalPrice, onSubmit } = useBookingForm({
    onSubmit: async (data: BookingFormValues) => {
      // Generate a fake booking ID
      const bookingId = `BK-${Math.floor(Math.random() * 10000)}`;

      // This would normally call an API endpoint
      console.log('Booking submitted:', data);

      // Call the onSubmitSuccess callback with the booking ID
      onSubmitSuccess(bookingId, data, calculateTotalPrice());

      return bookingId;
    },
    service,
    extraServices,
  });

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

  return (
    <Form {...form}>
      <form
        id="booking-form"
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-6"
        noValidate
      >
        {/* Main service */}
        <div className="space-y-2">
          <Typography variant="h4" className="text-sm font-medium">
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
          selectedDate={selectedDate}
          onSelectDate={(date: Date | undefined) => {
            setSelectedDate(date);
            form.setValue('date', date as Date);
            // Clear timeSlot when date changes
            if (date) {
              form.setValue('timeSlot', '');
            }
          }}
          availableDays={availableDays}
          availableTimeSlots={availableTimeSlots}
          selectedTimeSlot={form.watch('timeSlot')}
          onSelectTimeSlot={(timeSlot: string) => {
            form.setValue('timeSlot', timeSlot);
          }}
          service={service}
          selectedExtraServices={selectedExtraServices}
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
        <div className="space-y-2">
          <Typography variant="h4" className="text-sm font-medium">
            Payment Method
          </Typography>

          {isLoadingPaymentMethods ? (
            <div className="p-4 border rounded-md bg-muted/10 flex items-center justify-center">
              <Typography variant="small" className="text-muted-foreground">
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
        <div className="space-y-2 relative">
          <Typography variant="h4" className="text-sm font-medium">
            Additional Notes
          </Typography>

          <Textarea
            placeholder="Any special requests or notes for the professional..."
            className="resize-none"
            {...form.register('notes')}
          />

          <FormError error={form.formState.errors.notes?.message?.toString()} />
        </div>
        {/* Tip - using FormFieldWrapper and FormInput */}
        <FormFieldWrapper
          control={form.control}
          name="tipAmount"
          label="Add a Tip ($)"
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

        <Typography variant="small" className="text-muted-foreground -mt-4">
          Optional: Add a tip for your service provider
        </Typography>
        {/* Price Summary */}
        <div className="space-y-2">
          <Typography>Booking Summary</Typography>
          <div className="bg-muted/10 p-4 rounded-md border">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Typography variant="small">{service.name}</Typography>
                  <div className="text-xs text-muted-foreground flex items-center">
                    <Clock className="h-3 w-3 mr-0.5" />
                    {formatDuration(service.duration)}
                  </div>
                </div>
                <Typography variant="small" className="font-medium">
                  {formatCurrency(service.price)}
                </Typography>
              </div>

              {/* Extra services */}
              {extraServices.length > 0 &&
                form.watch('extraServiceIds')?.map((extraId) => {
                  const extraService = extraServices.find(
                    (es) => es.id === extraId,
                  );
                  if (extraService) {
                    return (
                      <div
                        key={extraId}
                        className="flex justify-between items-center"
                      >
                        <div className="flex items-center gap-2">
                          <Typography
                            variant="small"
                            className="text-muted-foreground"
                          >
                            {extraService.name}
                          </Typography>
                          <div className="text-xs text-muted-foreground flex items-center">
                            <Clock className="h-3 w-3 mr-0.5" />
                            {formatDuration(extraService.duration)}
                          </div>
                        </div>
                        <Typography variant="small" className="font-medium">
                          {formatCurrency(extraService.price)}
                        </Typography>
                      </div>
                    );
                  }
                  return null;
                })}

              {/* Service fee */}
              <div className="flex justify-between items-center">
                <Typography variant="small" className="text-muted-foreground">
                  Service Fee
                </Typography>
                <Typography variant="small" className="font-medium">
                  {formatCurrency(1.0)}
                </Typography>
              </div>

              {/* Tip */}
              {(form.watch('tipAmount') ?? 0) > 0 && (
                <div className="flex justify-between items-center">
                  <Typography variant="small" className="text-muted-foreground">
                    Tip
                  </Typography>
                  <Typography variant="small" className="font-medium">
                    {formatCurrency(form.watch('tipAmount') ?? 0)}
                  </Typography>
                </div>
              )}

              <Separator className="my-2" />

              {/* Total */}
              <div className="flex justify-between items-center font-medium pt-1">
                <Typography>Total</Typography>
                <Typography className="text-primary">
                  {formatCurrency(totalPrice)}
                </Typography>
              </div>
            </div>
          </div>
        </div>
      </form>
    </Form>
  );
}
