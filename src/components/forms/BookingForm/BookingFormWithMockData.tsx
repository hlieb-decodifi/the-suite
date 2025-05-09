'use client';

import { BookingForm, BookingFormProps } from './BookingForm';
import { AVAILABLE_DAYS, MOCK_TIME_SLOTS } from './mockData';

// Create a wrapped version of BookingForm that uses the mock time slots
export function BookingFormWithMockData(
  props: Omit<BookingFormProps, 'availableTimeSlots' | 'availableDays'>,
) {
  return (
    <BookingForm
      {...props}
      // Use the mock data
      availableTimeSlots={MOCK_TIME_SLOTS}
      availableDays={AVAILABLE_DAYS}
    />
  );
}
