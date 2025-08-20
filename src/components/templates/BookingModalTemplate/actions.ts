'use server';

import { BookingFormValues } from '@/components/forms/BookingForm/schema';
import { createClient } from '@/lib/supabase/server';
import { convertTimeToClientTimezone, getAvailableDaysWithTimezoneConversion, parseWorkingHoursFromDB } from '@/utils/timezone';

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
  
  // Get service fee from admin configuration
  const { getServiceFeeFromConfig } = await import('@/server/domains/stripe-payments/stripe-operations');
  const serviceFeeInCents = await getServiceFeeFromConfig();
  const serviceFee = serviceFeeInCents / 100; // Convert to dollars
  
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
export async function createBooking(
  formData: BookingFormValues & { dateWithTime: Date },
  professionalProfileId: string
): Promise<{ bookingId: string; totalPrice: number }> {
  const supabase = await createClient();
  
  try {
    // Get the current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    
    if (authError || !user) {
      throw new Error('Not authenticated');
    }
    
    // Get the main service details
    const { data: mainService, error: mainServiceError } = await supabase
      .from('services')
      .select('id, name, price, duration')
      .eq('id', formData.serviceId)
      .single();
    
    if (mainServiceError || !mainService) {
      throw new Error(`Error getting main service: ${mainServiceError?.message}`);
    }
    
    // Get extra service durations
    const extraServiceDurations: number[] = [];
    if (formData.extraServiceIds.length > 0) {
      const { data: extraServices, error: extraServicesError } = await supabase
        .from('services')
        .select('duration')
        .in('id', formData.extraServiceIds);
      
      if (extraServicesError || !extraServices) {
        throw new Error(`Error fetching extra services: ${extraServicesError?.message}`);
      }
      
      extraServices.forEach(service => {
        if (service.duration) {
          extraServiceDurations.push(service.duration);
        }
      });
    }

    // Calculate total duration
    const totalDuration = mainService.duration + extraServiceDurations.reduce((sum, duration) => sum + duration, 0);

    // Convert the local date to UTC
    const localDate = new Date(formData.date);
    const [hoursStr, minutesStr] = formData.timeSlot.split(':');
    const hours = parseInt(hoursStr || '0', 10);
    const minutes = parseInt(minutesStr || '0', 10);
    
    // Create the appointment start time in local timezone
    const appointmentDate = new Date(localDate);
    appointmentDate.setHours(hours, minutes, 0, 0);

    // Convert to UTC
    const utcDate = new Date(appointmentDate.getTime());
    const utcEndDate = new Date(utcDate.getTime() + (totalDuration * 60 * 1000));

    console.log('Appointment times:', {
      local: appointmentDate.toLocaleString(),
      utcStart: utcDate.toISOString(),
      utcEnd: utcEndDate.toISOString(),
      totalDuration
    });

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
    const bookingStatus = paymentMethod?.is_online ? 'pending' : 'confirmed';

    try {
      // Start transaction by inserting booking record
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          client_id: user.id,
          professional_profile_id: professionalProfileId,
          status: bookingStatus,
          notes: formData.notes || null,
        })
        .select('id')
        .single();
      
      if (bookingError || !booking) {
        throw new Error(`Error creating booking: ${bookingError?.message}`);
      }
      
      // Create appointment record
      console.log('About to create appointment with status: "ongoing", permitted statuses in schema are "completed", "cancelled", "ongoing"');
      console.log('Appointment data:', {
        booking_id: booking.id,
        start_time: utcDate.toISOString(),
        end_time: utcEndDate.toISOString(),
        status: 'ongoing' // Changed from 'active' to match allowed statuses
      });
      
      const { data: appointment, error: appointmentError } = await supabase
        .from('appointments')
        .insert({
          booking_id: booking.id,
          start_time: utcDate.toISOString(),
          end_time: utcEndDate.toISOString(),
          status: 'ongoing', // Changed to match the allowed status values in the database schema
        })
        .select('id')
        .single();
      
      if (appointmentError || !appointment) {
        console.error('Appointment creation error:', appointmentError);
        console.error('Error code:', appointmentError?.code);
        console.error('Error message:', appointmentError?.message);
        console.error('Error details:', appointmentError?.details);
        throw new Error(`Error creating appointment: ${appointmentError?.message}`);
      }
      
      // Insert main service into booking_services
      const { error: mainServiceInsertError } = await supabase
        .from('booking_services')
        .insert({
          booking_id: booking.id,
          service_id: formData.serviceId,
          price: mainService.price,
          duration: mainService.duration,
        });
      
      if (mainServiceInsertError) {
        throw new Error(`Error adding main service: ${mainServiceInsertError.message}`);
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
      
      // For cash payments, send confirmation emails immediately
      // if (!paymentMethod?.is_online) {
      //   try {
      //     const { sendBookingConfirmationEmails } = await import('@/server/domains/stripe-payments/email-notifications');
      //     await sendBookingConfirmationEmails(booking.id, appointment.id, false);
      //   } catch (emailError) {
      //     console.error('Failed to send booking confirmation emails:', emailError);
      //     // Don't fail the booking creation if email sending fails
      //   }
      // }
      
      // Return the booking details
      return { bookingId: booking.id, totalPrice };
      
    } catch (error) {
      console.error('Error in createBooking:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in createBooking:', error);
    throw error;
  }
}

/**
 * Convert a time string to minutes since midnight
 */
function timeToMinutes(timeString: string): number {
  const [hours, minutes] = timeString.split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

/**
 * Check if a time slot overlaps with an appointment
 */
function isSlotOverlapping(
  slotStartTime: string,
  slotEndTime: string,
  appointmentStartTime: string,
  appointmentEndTime: string
): boolean {
  const slotStart = new Date(slotStartTime);
  const slotEnd = new Date(slotEndTime);
  const appointmentStart = new Date(appointmentStartTime);
  const appointmentEnd = new Date(appointmentEndTime);

  return slotStart < appointmentEnd && slotEnd > appointmentStart;
}

/**
 * Get available time slots for a given date and professional
 */
export async function getAvailableTimeSlots(
  professionalProfileId: string,
  date: string,
  requiredDurationMinutes: number = 30,
  professionalTimezone: string = 'UTC',
  clientTimezone: string = 'UTC'
): Promise<string[]> {
  const supabase = await createClient();

  try {
    // Create date objects for the start and end of the day in professional's timezone
    const professionalDate = new Date(date);
    
    // Calculate timezone offset between professional's timezone and UTC
    const professionalOffsetMinutes = -new Date(date).getTimezoneOffset();
    const targetTimezoneOffsetHours = professionalOffsetMinutes / 60;

    console.log('Timezone info:', {
      professionalTimezone,
      offsetMinutes: professionalOffsetMinutes,
      offsetHours: targetTimezoneOffsetHours
    });
    
    // Adjust the date to professional's timezone for querying
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Convert to UTC for database query
    const queryStartTime = new Date(startOfDay.getTime() - (professionalOffsetMinutes * 60 * 1000));
    const queryEndTime = new Date(endOfDay.getTime() - (professionalOffsetMinutes * 60 * 1000));

    // Get working hours
    const { data: workingHoursData, error: workingHoursError } = await supabase
      .from('professional_profiles')
      .select('working_hours')
      .eq('id', professionalProfileId)
      .single();

    if (workingHoursError || !workingHoursData?.working_hours) {
      console.error('Error fetching working hours:', workingHoursError);
      return [];
    }

    // Parse working hours with timezone conversion
    const workingHours = parseWorkingHoursFromDB(workingHoursData.working_hours, professionalTimezone);
    
    // Get the day of the week in professional's timezone
    const dayOfWeek = professionalDate.getDay();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
    const dayName = dayNames[dayOfWeek];

    // Get working hours for this day
    const dayWorkingHours = workingHours.hours.find(h => {
      if (!dayName) return false;
      return h.day.toLowerCase() === dayName.toLowerCase();
    });

    if (!dayWorkingHours?.enabled || !dayWorkingHours?.startTime || !dayWorkingHours?.endTime) {
      console.log('Professional not working on this day');
      return [];
    }


    // Get all appointments that overlap with the day (not just those that start within the day)
    // This ensures we catch appointments that start before the day but end during it
    const { data: appointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select(`
        start_time,
        end_time,
        bookings!inner (
          professional_profile_id,
          status
        )
      `)
      .eq('bookings.professional_profile_id', professionalProfileId)
      .neq('bookings.status', 'cancelled')
      .lt('end_time', queryEndTime.toISOString()) // appointment ends after day starts
      .gt('start_time', queryStartTime.toISOString()); // appointment starts before day ends

    if (appointmentsError) {
      console.error('Error fetching appointments:', appointmentsError);
      return [];
    }
    // Convert working hours to minutes for easier comparison
    const workingStartMinutes = timeToMinutes(dayWorkingHours.startTime);
    const workingEndMinutes = timeToMinutes(dayWorkingHours.endTime);


    // Generate time slots every 30 minutes, but check the full required duration for each slot
    const slots: string[] = [];
    for (let minutes = workingStartMinutes; minutes <= workingEndMinutes - requiredDurationMinutes; minutes += 30) {
      const hour = Math.floor(minutes / 60);
      const minute = minutes % 60;
      const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;

      // Create datetime strings in professional's timezone
      const slotDate = new Date(date);
      slotDate.setHours(hour, minute, 0, 0);

      // Convert slot times to UTC for comparison
      const slotStartTime = new Date(slotDate.getTime());
      const slotEndTime = new Date(slotDate.getTime() + (requiredDurationMinutes * 60 * 1000));

      // Check if this slot (for the full required duration) overlaps with any existing appointments
      let isAvailable = true;

      for (const appointment of appointments || []) {
        if (!appointment.start_time || !appointment.end_time) continue;

        if (isSlotOverlapping(
          slotStartTime.toISOString(),
          slotEndTime.toISOString(),
          appointment.start_time,
          appointment.end_time
        )) {
          isAvailable = false;
          break;
        }
      }

      if (isAvailable) {
        slots.push(timeString);
      }
    }

    // Convert slots to client timezone
    const targetDate = new Date(date);
    const convertedSlots = slots.map(slot => {
      const { time } = convertTimeToClientTimezone(slot, professionalTimezone, clientTimezone, targetDate);
      return time;
    });

    return convertedSlots;
  } catch (error) {
    console.error('Error in getAvailableTimeSlots:', error);
    return [];
  }
}

/**
 * Get available dates for a professional based on their working hours
 * Now with timezone conversion support
 * @param professionalProfileId - The ID of the professional's profile
 * @param professionalTimezone - Professional's timezone (optional, will fetch if not provided)
 * @param clientTimezone - Client's timezone (optional, will use professional's timezone if not provided)
 * @returns Array of available day names
 */
export async function getAvailableDates(
  professionalProfileId: string,
  professionalTimezone?: string,
  clientTimezone?: string
): Promise<string[]> {
  const supabase = await createClient();
  
  try {
    // Get the professional's working hours and timezone
    const { data: professionalProfile, error: profileError } = await supabase
      .from('professional_profiles')
      .select('working_hours, timezone')
      .eq('id', professionalProfileId)
      .single();
    
    if (profileError || !professionalProfile?.working_hours) {
      return [];
    }
    
    // Use provided timezone or fetch from database
    const profTimezone = professionalTimezone || professionalProfile.timezone || 'UTC';
    const targetTimezone = clientTimezone || profTimezone;
    
    // Parse timezone-aware working hours
    const parsedWorkingHours = parseWorkingHoursFromDB(
      professionalProfile.working_hours, 
      profTimezone
    );
    
    // Get available days with proper timezone conversion and day boundary crossing
    const availableDaysOfWeek = getAvailableDaysWithTimezoneConversion(
      parsedWorkingHours, 
      targetTimezone
    );
      
    return availableDaysOfWeek;
    
  } catch (error) {
    console.error('Error getting available dates:', error);
    return [];
  }
}

/**
 * Get available payment methods
 */
export async function getAvailablePaymentMethods(): Promise<Array<{ id: string; name: string }>> {
  const supabase = await createClient();
  
  const { data, error: supabaseError } = await supabase
    .from('payment_methods')
    .select('id, name');
  
  if (supabaseError) {
    return [];
  }
  
  return data || [];
}

 