'use client';

import { BookingForm } from '@/components/forms/BookingForm/BookingForm';
import { BookingCompleted } from '@/components/templates/BookingModalTemplate/components/BookingCompleted';
import { useBookingState } from '@/components/templates/BookingModalTemplate/hooks/useBookingState';
import { createCompletedViewProps } from '@/components/templates/BookingModalTemplate/utils';
import { ServiceListItem } from '@/components/templates/ServicesTemplate/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Typography } from '@/components/ui/typography';
import { formatCurrency } from '@/utils/formatCurrency';
import { formatDuration } from '@/utils/formatDuration';
import { ArrowLeft, Calendar, Clock, MapPin } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export type BookingPageClientProps = {
  service: ServiceListItem;
  preselectedDate?: string;
  preselectedProfessional?: string;
};

export function BookingPageClient({
  service,
  preselectedDate,
}: {
  service: ServiceListItem;
  preselectedDate?: string;
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<{
    timeSlot?: string;
    totalPrice: number;
    extraServices: ServiceListItem[];
    tipAmount?: number;
  }>({
    totalPrice: service.price + 1.0, // Base price + service fee
    extraServices: [],
  });

  // Use the existing booking state hook with the page context
  const {
    bookingCompleted,
    bookingDetails,
    additionalServices,
    isLoadingAdditionalServices,
    availableTimeSlots,
    availableDays,
    paymentMethods,
    isLoadingPaymentMethods,
    isLoadingTimeSlots,
    isLoadingCalendar,
    handleSuccess,
    selectedDate,
    handleDateSelect,
    professionalTimezone,
    clientTimezone,
  } = useBookingState({
    isOpen: true, // Always open for page context
    service,
    onBookingComplete: (bookingId) => {
      // Redirect to success page or show completion state
      console.log('Booking completed:', bookingId);
    },
  });

  // Handle preselected date from URL params
  useEffect(() => {
    if (preselectedDate && !selectedDate) {
      try {
        const date = new Date(preselectedDate);
        if (!isNaN(date.getTime())) {
          handleDateSelect(date);
        }
      } catch (error) {
        console.error('Invalid preselected date:', error);
      }
    }
  }, [preselectedDate, selectedDate, handleDateSelect]);

  // Handle back navigation
  const handleGoBack = () => {
    router.back();
  };

  // Handle submission state changes
  const handleSubmitStateChange = (submitting: boolean) => {
    setIsSubmitting(submitting);
  };

  // Ensure we always have an array of payment methods
  const availablePaymentMethods = Array.isArray(paymentMethods)
    ? paymentMethods
    : [];

  // Show completed state
  if (bookingCompleted) {
    const completedProps = createCompletedViewProps(service, bookingDetails);

    return (
      <div className="w-full">
        <Card className="max-w-3xl mx-auto">
          <CardContent className="p-8">
            <BookingCompleted {...completedProps} />

            <div className="flex flex-col sm:flex-row gap-3 mt-8 justify-center">
              <Button
                variant="outline"
                onClick={handleGoBack}
                className="sm:w-auto"
              >
                Go Back
              </Button>
              <Button
                onClick={() => router.push('/dashboard/appointments')}
                className="sm:w-auto"
              >
                View My Bookings
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show booking form
  return (
    <div className="w-full">
      {/* Back button */}
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={handleGoBack}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Services
        </Button>
      </div>

      {/* Form header */}
      <div className="text-center mb-8">
        <Typography
          variant="h1"
          className="font-bold text-3xl md:text-4xl mb-2"
        >
          Book Your Appointment
        </Typography>
        <Typography className="text-muted-foreground max-w-2xl mx-auto">
          Complete the form below to schedule your service
        </Typography>
      </div>

      {/* Professional Info */}
      <div className="mb-8">
        <Card
          className="cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() =>
            router.push(`/professionals/${service.professional.id}`)
          }
        >
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 border-2 border-primary/10">
                <AvatarImage
                  src={service.professional.avatar}
                  alt={service.professional.name}
                />
                <AvatarFallback className="text-lg font-medium">
                  {service.professional.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1">
                <Typography variant="h3" className="text-xl font-semibold mb-1">
                  {service.professional.name}
                </Typography>

                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{service.professional.address}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main form - use full width with max container */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form section - takes 2 columns on large screens, full width otherwise */}
        <div className="lg:col-span-2">
          <BookingForm
            service={service}
            extraServices={additionalServices}
            isLoadingExtraServices={isLoadingAdditionalServices}
            availablePaymentMethods={availablePaymentMethods}
            isLoadingPaymentMethods={isLoadingPaymentMethods}
            availableTimeSlots={availableTimeSlots}
            isLoadingTimeSlots={isLoadingTimeSlots}
            availableDays={availableDays}
            onSubmitSuccess={handleSuccess}
            selectedDate={selectedDate}
            onSelectDate={handleDateSelect}
            onSubmitStateChange={handleSubmitStateChange}
            onFormDataChange={setFormData}
            isCalendarLoading={isLoadingCalendar}
            professionalTimezone={professionalTimezone}
            clientTimezone={clientTimezone}
          />
        </div>

        {/* Sidebar with booking summary - takes 1 column on large screens */}
        <div className="lg:col-span-1">
          <div className="sticky top-24">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Booking Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Service info */}
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <Typography className="font-medium">
                        {service.name}
                      </Typography>
                      <div className="flex items-center gap-1 mt-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <Typography
                          variant="small"
                          className="text-muted-foreground"
                        >
                          {formatDuration(service.duration)}
                        </Typography>
                      </div>
                    </div>
                    <Typography className="font-semibold">
                      {formatCurrency(service.price)}
                    </Typography>
                  </div>

                  {/* Extra services */}
                  {formData.extraServices.map((extraService) => (
                    <div
                      key={extraService.id}
                      className="flex justify-between items-start"
                    >
                      <div className="flex-1">
                        <Typography
                          variant="small"
                          className="text-muted-foreground"
                        >
                          {extraService.name}
                        </Typography>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <Typography
                            variant="small"
                            className="text-muted-foreground"
                          >
                            {formatDuration(extraService.duration)}
                          </Typography>
                        </div>
                      </div>
                      <Typography variant="small" className="font-medium">
                        {formatCurrency(extraService.price)}
                      </Typography>
                    </div>
                  ))}

                  {/* Service fee */}
                  <div className="flex justify-between items-center">
                    <Typography
                      variant="small"
                      className="text-muted-foreground"
                    >
                      Service Fee
                    </Typography>
                    <Typography variant="small" className="font-medium">
                      {formatCurrency(1.0)}
                    </Typography>
                  </div>

                  {/* Tip */}
                  {formData.tipAmount && formData.tipAmount > 0 && (
                    <div className="flex justify-between items-center">
                      <Typography
                        variant="small"
                        className="text-muted-foreground"
                      >
                        Tip
                      </Typography>
                      <Typography variant="small" className="font-medium">
                        {formatCurrency(formData.tipAmount)}
                      </Typography>
                    </div>
                  )}
                </div>

                {/* Selected date/time */}
                {selectedDate && (
                  <div className="pt-3 border-t space-y-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <Typography
                        variant="small"
                        className="text-muted-foreground"
                      >
                        Date & Time
                      </Typography>
                    </div>
                    <div>
                      <Typography className="font-medium">
                        {selectedDate.toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </Typography>
                      {formData.timeSlot && (
                        <Typography
                          variant="small"
                          className="text-muted-foreground"
                        >
                          at {formData.timeSlot}
                        </Typography>
                      )}
                    </div>
                  </div>
                )}

                {/* Total */}
                <div className="pt-3 border-t">
                  <div className="flex justify-between items-center">
                    <Typography className="font-semibold">Total</Typography>
                    <Typography className="font-bold text-primary text-lg">
                      {formatCurrency(formData.totalPrice)}
                    </Typography>
                  </div>
                </div>

                {/* Submit button */}
                <div className="pt-4">
                  <Button
                    type="submit"
                    form="booking-form"
                    className="w-full"
                    size="lg"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Processing...' : 'Book Now'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
