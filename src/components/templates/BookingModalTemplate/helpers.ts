import { BookingFormValues } from '@/components/forms/BookingForm';

export type BookingDetailsState = {
  date?: Date;
  timeSlot?: string;
  totalPrice?: number;
};

/**
 * Creates booking details from form data
 */
export function createBookingDetails(
  formData: BookingFormValues,
  price: number,
): BookingDetailsState {
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
  setBookingDetails: (value: BookingDetailsState) => void,
  delay = 300,
): void {
  setTimeout(() => {
    setBookingCompleted(false);
    setBookingDetails({});
  }, delay);
}
