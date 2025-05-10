'use server';

import { BookingFormValues } from '@/components/forms/BookingForm/schema';
import { createClient } from '@/lib/supabase/server';
import { format } from 'date-fns';
import { isValidWorkingHours } from '@/types/working_hours';

/**
 * Converts a timeSlot string (e.g., "14:00") to a time object
 */
function timeSlotToTimeObject(timeSlot: string): { start: string; end: string; durationMinutes: number } {
  // Safely handle timeSlot parsing
  const timeString = timeSlot || '00:00';
  const parts = timeString.split(':');
  const hoursStr = parts[0] || '0';
  const minutesStr = parts[1] || '0';
  
  const hours = parseInt(hoursStr, 10) || 0;
  const minutes = parseInt(minutesStr, 10) || 0;
  
  // Default duration is 1 hour (60 minutes)
  const durationMinutes = 60;
  
  // Calculate end time
  const startDate = new Date();
  startDate.setHours(hours, minutes, 0, 0);
  
  const endDate = new Date(startDate);
  endDate.setMinutes(endDate.getMinutes() + durationMinutes);
  
  return {
    start: format(startDate, 'HH:mm:ss'),
    end: format(endDate, 'HH:mm:ss'),
    durationMinutes
  };
}

/**
 * Calculate the total price for a booking
 */
async function calculateTotalPrice(
  serviceId: string,
  extraServiceIds: string[],
  tipAmount: number
): Promise<{ total: number; servicePrice: number; extraServicesPrice: number; serviceFee: number }> {
  const supabase = await createClient();
  
  // Get main service price
  const { data: serviceData, error: serviceError } = await supabase
    .from('services')
    .select('price')
    .eq('id', serviceId)
    .single();
  
  if (serviceError || !serviceData) {
    throw new Error(`Error fetching service: ${serviceError?.message || 'Service not found'}`);
  }
  
  // Get extra services prices
  let extraServicesPrice = 0;
  if (extraServiceIds.length > 0) {
    const { data: extraServices, error: extraServicesError } = await supabase
      .from('services')
      .select('price')
      .in('id', extraServiceIds);
    
    if (extraServicesError) {
      throw new Error(`Error fetching extra services: ${extraServicesError.message}`);
    }
    
    extraServicesPrice = extraServices.reduce((sum, service) => sum + Number(service.price), 0);
  }
  
  // Fixed service fee
  const serviceFee = 1.0;
  
  // Calculate total
  const total = Number(serviceData.price) + extraServicesPrice + serviceFee + (tipAmount || 0);
  
  return { 
    total, 
    servicePrice: Number(serviceData.price), 
    extraServicesPrice, 
    serviceFee 
  };
}

/**
 * Create a booking with associated records
 * 
 * @param formData The booking form data
 * @param professionalProfileId The ID of the professional's profile
 * @returns Object containing the booking ID and total price
 */
/* eslint-disable-next-line max-lines-per-function */
export async function createBooking(
  formData: BookingFormValues,
  professionalProfileId: string
): Promise<{ bookingId: string; totalPrice: number }> {
  const supabase = await createClient();
  
  // Get the current user
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('Not authenticated');
  }
  
  // Parse the time slot
  const timeInfo = timeSlotToTimeObject(formData.timeSlot);
  
  // Format date for database
  const dateFormatted = format(formData.date, 'yyyy-MM-dd');
  
  // Calculate total price
  const { total: totalPrice, serviceFee } = await calculateTotalPrice(
    formData.serviceId,
    formData.extraServiceIds,
    formData.tipAmount || 0
  );

  // Get the payment method to check if it's online
  const { data: paymentMethod } = await supabase
    .from('payment_methods')
    .select('is_online')
    .eq('id', formData.paymentMethodId)
    .single();
  
  // Determine initial payment status
  const paymentStatus = paymentMethod?.is_online ? 'pending' : 'completed';
  
  try {
    // Start transaction by inserting booking record
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        client_id: user.id,
        professional_profile_id: professionalProfileId,
        status: 'pending',
        notes: formData.notes || null,
      })
      .select('id')
      .single();
    
    if (bookingError || !booking) {
      throw new Error(`Error creating booking: ${bookingError?.message}`);
    }
    
    // Create appointment record
    const { error: appointmentError } = await supabase
      .from('appointments')
      .insert({
        booking_id: booking.id,
        date: dateFormatted,
        start_time: timeInfo.start,
        end_time: timeInfo.end,
        status: 'upcoming',
      });
    
    if (appointmentError) {
      throw new Error(`Error creating appointment: ${appointmentError.message}`);
    }
    
    // Get service details for booking_services table
    const { data: serviceDetails } = await supabase
      .from('services')
      .select('price, duration')
      .eq('id', formData.serviceId)
      .single();
    
    if (!serviceDetails) {
      throw new Error('Service details not found');
    }
    
    // Insert main service into booking_services
    const { error: mainServiceError } = await supabase
      .from('booking_services')
      .insert({
        booking_id: booking.id,
        service_id: formData.serviceId,
        price: serviceDetails.price,
        duration: serviceDetails.duration,
      });
    
    if (mainServiceError) {
      throw new Error(`Error adding main service: ${mainServiceError.message}`);
    }
    
    // Insert extra services into booking_services
    if (formData.extraServiceIds.length > 0) {
      const { data: extraServices } = await supabase
        .from('services')
        .select('id, price, duration')
        .in('id', formData.extraServiceIds);
      
      if (extraServices && extraServices.length > 0) {
        const extraServicesData = extraServices.map(service => ({
          booking_id: booking.id,
          service_id: service.id,
          price: service.price,
          duration: service.duration,
        }));
        
        const { error: extraServicesError } = await supabase
          .from('booking_services')
          .insert(extraServicesData);
        
        if (extraServicesError) {
          throw new Error(`Error adding extra services: ${extraServicesError.message}`);
        }
      }
    }
    
    // Create payment record
    const { error: paymentError } = await supabase
      .from('booking_payments')
      .insert({
        booking_id: booking.id,
        payment_method_id: formData.paymentMethodId,
        amount: totalPrice,
        tip_amount: formData.tipAmount || 0,
        service_fee: serviceFee,
        status: paymentStatus,
      });
    
    if (paymentError) {
      throw new Error(`Error creating payment record: ${paymentError.message}`);
    }
    
    // If payment method is online (e.g., credit card), we would typically
    // create a Stripe payment intent here and return it for client-side processing
    if (paymentMethod?.is_online) {
      // Future implementation: Create Stripe payment intent
      // const stripeIntent = await createStripePaymentIntent(totalPrice, booking.id);
      
      // For now, just return the booking ID
      return { bookingId: booking.id, totalPrice };
    }
    
    // Return the booking details
    return { bookingId: booking.id, totalPrice };
    
  } catch (error) {
    console.error('Error in createBooking:', error);
    throw error;
  }
}

/**
 * Process appointment times by extracting hours and minutes safely
 */
function processTimeString(timeString: string): { hour: number; minute: number } {
  const parts = timeString.split(':');
  const hour = parseInt(parts[0] || '0', 10);
  const minute = parseInt(parts[1] || '0', 10);
  return { hour, minute };
}

/**
 * Convert a time to minutes since midnight
 */
function timeToMinutes(timeString: string): number {
  const { hour, minute } = processTimeString(timeString);
  return hour * 60 + minute;
}

/**
 * Format time for display (24h -> 12h with AM/PM)
 */
function formatTimeForDisplay(timeString: string): string {
  const { hour, minute } = processTimeString(timeString);
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12; // Convert 0 to 12 for 12 AM
  return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
}

/**
 * Check if a time slot overlaps with an appointment
 */
function isSlotOverlapping(
  slotStart: number,
  slotEnd: number,
  appointmentStart: number,
  appointmentEnd: number
): boolean {
  // Slot starts before appointment ends AND slot ends after appointment starts
  return slotStart < appointmentEnd && slotEnd > appointmentStart;
}

/**
 * Get available time slots for a professional
 * @param professionalProfileId - The ID of the professional's profile
 * @param date - The date in YYYY-MM-DD format
 * @returns Array of available time slots formatted as "HH:MM AM/PM"
 */
/* eslint-disable-next-line max-lines-per-function */
export async function getAvailableTimeSlots(
  professionalProfileId: string,
  date: string
): Promise<string[]> {
  const supabase = await createClient();
  
  try {
    // Step 1: Get the professional's working hours for the day of week
    const dateObj = new Date(date);
    const dayOfWeek = format(dateObj, 'EEEE').toLowerCase(); // e.g., "monday"
    
    const { data: professionalProfile, error: profileError } = await supabase
      .from('professional_profiles')
      .select('working_hours')
      .eq('id', professionalProfileId)
      .single();

    if (profileError || !professionalProfile?.working_hours) {
      console.error('Error fetching professional working hours:', profileError);
      return [];
    }
    
    // Parse working hours using our type guard
    if (!isValidWorkingHours(professionalProfile.working_hours)) {
      console.error('Invalid working hours format');
      return [];
    }
    
    // Now TypeScript knows this is WorkingHoursEntry[]
    const workingHours = professionalProfile.working_hours;

    // Find the entry for the current day
    const dayEntry = workingHours.find(entry => 
      entry.day.toLowerCase() === dayOfWeek && entry.enabled
    );

    console.log('dayEntry', dayEntry, workingHours, dayOfWeek);
    
    if (!dayEntry) {
      // Professional doesn't work on this day
      return [];
    }

    const daySchedule = {
      start: dayEntry.startTime,
      end: dayEntry.endTime
    };

    if (!daySchedule.start || !daySchedule.end) {
      return [];
    }

    // Step 2: Generate all possible 30-minute time slots for the working hours
    const allTimeSlots: string[] = [];
    const startMinutes = timeToMinutes(daySchedule.start);
    const endMinutes = timeToMinutes(daySchedule.end);
    
    // Generate 30-minute slots
    for (let minutes = startMinutes; minutes < endMinutes; minutes += 30) {
      const hour = Math.floor(minutes / 60);
      const minute = minutes % 60;
      const formattedHour = hour.toString().padStart(2, '0');
      const formattedMinute = minute.toString().padStart(2, '0');
      allTimeSlots.push(`${formattedHour}:${formattedMinute}`);
    }
    
    // Step 3: Get booked appointments for the date to filter out unavailable slots
    const { data: bookedAppointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select(`
        start_time,
        end_time,
        bookings!inner(professional_profile_id)
      `)
      .eq('bookings.professional_profile_id', professionalProfileId)
      .eq('date', date)
      .neq('status', 'cancelled');
    
    if (appointmentsError) {
      console.error('Error fetching booked appointments:', appointmentsError);
      return allTimeSlots.map(formatTimeForDisplay); // Return all slots if we can't check appointments
    }

    // Step 4: Filter out booked time slots
    const availableTimeSlots = allTimeSlots.filter(timeSlot => {
      const slotStartMinutes = timeToMinutes(timeSlot);
      const slotEndMinutes = slotStartMinutes + 30; // Each slot is 30 minutes
      
      // Check if this slot overlaps with any booked appointment
      return !bookedAppointments.some(appointment => {
        if (!appointment.start_time || !appointment.end_time) return false;
        
        // Convert appointment times to minutes
        const apptStartTime = appointment.start_time.substring(0, 5); // Format: "14:00:00" -> "14:00"
        const apptEndTime = appointment.end_time.substring(0, 5);
        
        const apptStartMinutes = timeToMinutes(apptStartTime);
        const apptEndMinutes = timeToMinutes(apptEndTime);
        
        return isSlotOverlapping(
          slotStartMinutes, 
          slotEndMinutes,
          apptStartMinutes,
          apptEndMinutes
        );
      });
    });

    // Format time slots for display
    return availableTimeSlots.map(formatTimeForDisplay);
    
  } catch (error) {
    console.error('Unexpected error in getAvailableTimeSlots:', error);
    return [];
  }
}

/**
 * Get available dates for a professional based on their working hours
 * @param professionalProfileId - The ID of the professional's profile
 * @returns Array of available day numbers (0-6, where 0 is Sunday)
 */
export async function getAvailableDates(
  professionalProfileId: string
): Promise<string[]> {
  const supabase = await createClient();
  
  try {
    // Get the professional's working hours
    const { data: professionalProfile, error: profileError } = await supabase
      .from('professional_profiles')
      .select('working_hours')
      .eq('id', professionalProfileId)
      .single();
    
    if (profileError || !professionalProfile?.working_hours) {
      console.error('Error fetching professional working hours:', profileError);
      return [];
    }
    
    // Parse working hours to determine which days the professional works
    const workingHours = professionalProfile.working_hours as Record<string, { startTime: string; endTime: string } | null>;
    
    // Map day names to day numbers (0 is Monday, not Sunday)
    // Get days of week when the professional is available (as numbers)
    const availableDaysOfWeek = Object.entries(workingHours)
      .filter(([, schedule]) => schedule?.startTime && schedule?.endTime)
      .map(([day]) => day); // Convert to day number

    // Filter out any empty strings (in case of invalid day names)
    const validDays = availableDaysOfWeek.filter(day => day !== '');
    
    if (validDays.length === 0) {
      return [];
    }
    
    return validDays;
    
  } catch (error) {
    console.error('Unexpected error in getAvailableDates:', error);
    return [];
  }
}

/**
 * Get available payment methods
 */
export async function getAvailablePaymentMethods(): Promise<Array<{ id: string; name: string }>> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('payment_methods')
    .select('id, name');
  
  if (error) {
    console.error('Error fetching payment methods:', error);
    return [];
  }
  
  return data || [];
} 