import { BookingFormValues } from '@/components/forms/BookingForm';

export type BookingDetailsState = {
  date?: Date;
  timeSlot?: string;
  totalPrice?: number;
};

/**
 * Formats a booking ID with a prefix for display
 */
export function formatBookingId(id: number): string {
  return `BK-${id.toString().padStart(5, '0')}`;
}

/**
 * Generates a random booking ID for demo purposes
 */
export function generateBookingId(): string {
  return formatBookingId(Math.floor(Math.random() * 10000));
}

/**
 * Creates booking details from form data
 */
export function createBookingDetails(formData: BookingFormValues, price: number): BookingDetailsState {
  return {
    date: formData.date,
    timeSlot: formData.timeSlot,
    totalPrice: price,
  };
}

/**
 * Reset booking state with a delay
 */
export function resetBookingState(
  setBookingCompleted: (value: boolean) => void,
  setBookingId: (value: string | null) => void,
  setBookingDetails: (value: BookingDetailsState) => void,
  delay = 300
): void {
  setTimeout(() => {
    setBookingCompleted(false);
    setBookingId(null);
    setBookingDetails({});
  }, delay);
} 