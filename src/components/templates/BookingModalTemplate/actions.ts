'use server';

import { BookingFormValues } from '@/components/forms/BookingForm/schema';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import {
  getAvailableDaysWithTimezoneConversion,
  parseWorkingHoursFromDB,
} from '@/utils/timezone';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { format } from 'date-fns';

/**
 * Calculate the total price for a booking
 */
async function calculateTotalPrice(
  serviceId: string,
  extraServiceIds: string[],
  tipAmount: number,
): Promise<{
  total: number;
  servicePrice: number;
  extraServicesPrice: number;
  serviceFee: number;
}> {
  const supabase = await createClient();

  // Get main service price
  const { data: serviceData, error: serviceError } = await supabase
    .from('services')
    .select('price')
    .eq('id', serviceId)
    .single();

  if (serviceError || !serviceData) {
    throw new Error(
      `Error fetching service: ${serviceError?.message || 'Service not found'}`,
    );
  }

  // Get extra services prices
  let extraServicesPrice = 0;
  if (extraServiceIds.length > 0) {
    const { data: extraServices, error: extraServicesError } = await supabase
      .from('services')
      .select('price')
      .in('id', extraServiceIds);

    if (extraServicesError) {
      throw new Error(
        `Error fetching extra services: ${extraServicesError.message}`,
      );
    }

    extraServicesPrice = extraServices.reduce(
      (sum, service) => sum + Number(service.price),
      0,
    );
  }

  // Get service fee from admin configuration
  const { getServiceFeeFromConfig } = await import(
    '@/server/domains/stripe-payments/config'
  );
  const serviceFeeInCents = await getServiceFeeFromConfig();
  const serviceFee = serviceFeeInCents / 100; // Convert to dollars

  // Calculate total
  const total =
    Number(serviceData.price) +
    extraServicesPrice +
    serviceFee +
    (tipAmount || 0);

  return {
    total,
    servicePrice: Number(serviceData.price),
    extraServicesPrice,
    serviceFee,
  };
}

/**
 * Create a booking with associated records
 *
 * @param formData The booking form data
 * @param professionalProfileId The ID of the professional's profile
 * @param clientTimezone The client's timezone for proper date conversion
 * @returns Object containing the booking ID, total price, appointment timing, and service fee
 */
export async function createBooking(
  formData: BookingFormValues & { dateWithTime: Date },
  professionalProfileId: string,
  clientTimezone: string = 'UTC',
): Promise<{
  bookingId: string;
  totalPrice: number;
  appointmentStartTime: Date;
  appointmentEndTime: Date;
  serviceFee: number;
}> {
  const supabase = await createClient();
  const adminSupabase = createAdminClient();

  try {
    // Get the current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error('Not authenticated');
    }

    // Update client timezone in their profile if provided
    if (clientTimezone && clientTimezone !== 'UTC') {
      try {
        const { error: timezoneUpdateError } = await supabase
          .from('client_profiles')
          .update({ timezone: clientTimezone })
          .eq('user_id', user.id);

        if (timezoneUpdateError) {
          console.error(
            'Failed to update client timezone:',
            timezoneUpdateError,
          );
          // Don't fail the booking if timezone update fails
        }
      } catch (error) {
        console.error('Error updating client timezone:', error);
        // Don't fail the booking if timezone update fails
      }
    }

    // Get the main service details
    const { data: mainService, error: mainServiceError } = await supabase
      .from('services')
      .select('id, name, price, duration')
      .eq('id', formData.serviceId)
      .single();

    if (mainServiceError || !mainService) {
      throw new Error(
        `Error getting main service: ${mainServiceError?.message}`,
      );
    }

    // Get extra service durations
    const extraServiceDurations: number[] = [];
    if (formData.extraServiceIds.length > 0) {
      const { data: extraServices, error: extraServicesError } = await supabase
        .from('services')
        .select('duration')
        .in('id', formData.extraServiceIds);

      if (extraServicesError || !extraServices) {
        throw new Error(
          `Error fetching extra services: ${extraServicesError?.message}`,
        );
      }

      extraServices.forEach((service) => {
        if (service.duration) {
          extraServiceDurations.push(service.duration);
        }
      });
    }

    // Calculate total duration
    const totalDuration =
      mainService.duration +
      extraServiceDurations.reduce((sum, duration) => sum + duration, 0);

    // Properly convert appointment time from client timezone to UTC for database storage
    const localDate = new Date(formData.date);
    const [hoursStr, minutesStr] = formData.timeSlot.split(':');
    const hours = parseInt(hoursStr || '0', 10);
    const minutes = parseInt(minutesStr || '0', 10);

    // Create the appointment start time in client's local time
    const appointmentDateInClientTz = new Date(localDate);
    appointmentDateInClientTz.setHours(hours, minutes, 0, 0);

    // Import timezone utilities for proper conversion
    const { fromZonedTime } = await import('date-fns-tz');

    // Convert from client timezone to UTC for database storage
    const utcDate = fromZonedTime(appointmentDateInClientTz, clientTimezone);
    const utcEndDate = new Date(utcDate.getTime() + totalDuration * 60 * 1000);

    console.log('Appointment times:', {
      clientLocalTime: appointmentDateInClientTz.toLocaleString(),
      clientTimezone,
      utcStart: utcDate.toISOString(),
      utcEnd: utcEndDate.toISOString(),
      totalDuration,
    });

    // Calculate total price
    const { total: totalPrice, serviceFee } = await calculateTotalPrice(
      formData.serviceId,
      formData.extraServiceIds,
      formData.tipAmount || 0,
    );

    // Get the payment method to check if it's online
    const { data: paymentMethod } = await supabase
      .from('payment_methods')
      .select('is_online')
      .eq('id', formData.paymentMethodId)
      .single();

    // Determine initial payment status
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
      console.log(
        'About to create appointment with status: "ongoing", permitted statuses in schema are "completed", "cancelled", "ongoing"',
      );
      console.log('Appointment data:', {
        booking_id: booking.id,
        start_time: utcDate.toISOString(),
        end_time: utcEndDate.toISOString(),
        status: 'ongoing', // Changed from 'active' to match allowed statuses
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
        throw new Error(
          `Error creating appointment: ${appointmentError?.message}`,
        );
      }

      // Insert main service into booking_services using admin client
      const { error: mainServiceInsertError } = await adminSupabase
        .from('booking_services')
        .insert({
          booking_id: booking.id,
          service_id: formData.serviceId,
          price: mainService.price,
          duration: mainService.duration,
        });

      if (mainServiceInsertError) {
        throw new Error(
          `Error adding main service: ${mainServiceInsertError.message}`,
        );
      }

      // Insert extra services into booking_services
      if (formData.extraServiceIds.length > 0) {
        const { data: extraServices } = await supabase
          .from('services')
          .select('id, price, duration')
          .in('id', formData.extraServiceIds);

        if (extraServices && extraServices.length > 0) {
          const extraServicesData = extraServices.map((service) => ({
            booking_id: booking.id,
            service_id: service.id,
            price: service.price,
            duration: service.duration,
          }));

          const { error: extraServicesError } = await adminSupabase
            .from('booking_services')
            .insert(extraServicesData);

          if (extraServicesError) {
            throw new Error(
              `Error adding extra services: ${extraServicesError.message}`,
            );
          }
        }
      }

      // NOTE: booking_payments record creation moved to createBookingWithStripePayment
      // This allows all payment data to be calculated upfront before insertion

      // Note: Confirmation emails are sent from Stripe webhook after payment confirmation
      // This ensures emails are only sent for successfully paid bookings

      // Return the booking details with appointment timing for payment calculation
      return {
        bookingId: booking.id,
        totalPrice,
        appointmentStartTime: utcDate,
        appointmentEndTime: utcEndDate,
        serviceFee,
      };
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
  appointmentEndTime: string,
): boolean {
  const slotStart = new Date(slotStartTime);
  const slotEnd = new Date(slotEndTime);
  const appointmentStart = new Date(appointmentStartTime);
  const appointmentEnd = new Date(appointmentEndTime);

  return slotStart < appointmentEnd && slotEnd > appointmentStart;
}

/**
 * Generate cross-midnight slots for a specific working day
 */

type BookingAppointment = {
  start_time: string;
  end_time: string;
  bookings: {
    professional_profile_id: string;
    status: string;
  };
};

async function generateCrossMidnightSlots(
  workingHours: { startTime: string; endTime: string },
  professionalTimezone: string,
  clientTimezone: string,
  clientSelectedDate: string,
  appointments: BookingAppointment[],
  requiredDurationMinutes: number,
  dayOffset: number,
): Promise<string[]> {
  const slots: string[] = [];

  // Create a date for the professional's working day
  const professionalWorkingDate = new Date(clientSelectedDate);
  professionalWorkingDate.setDate(
    professionalWorkingDate.getDate() + dayOffset,
  );

  // Generate time slots for this working day
  const workingStartMinutes = timeToMinutes(workingHours.startTime);
  const workingEndMinutes = timeToMinutes(workingHours.endTime);

  for (
    let minutes = workingStartMinutes;
    minutes <= workingEndMinutes - requiredDurationMinutes;
    minutes += 30
  ) {
    const hour = Math.floor(minutes / 60);
    const minute = minutes % 60;

    // Create slot in professional's timezone for their working day
    const slotDate = new Date(professionalWorkingDate);
    slotDate.setHours(hour, minute, 0, 0);

    // Convert slot times to UTC for comparison
    const slotStartTime = fromZonedTime(slotDate, professionalTimezone);
    const slotEndTime = fromZonedTime(
      new Date(slotDate.getTime() + requiredDurationMinutes * 60 * 1000),
      professionalTimezone,
    );

    // Check for overlaps with existing appointments
    const hasOverlap = (appointments || []).some((appointment) => {
      if (!appointment.start_time || !appointment.end_time) return false;
      return isSlotOverlapping(
        slotStartTime.toISOString(),
        slotEndTime.toISOString(),
        appointment.start_time,
        appointment.end_time,
      );
    });

    if (!hasOverlap) {
      // Convert the slot to the client's timezone
      const slotInClientTz = toZonedTime(slotStartTime, clientTimezone);

      // Check if this slot falls on the client's selected date
      const slotClientDate = new Date(slotInClientTz);
      slotClientDate.setHours(0, 0, 0, 0);

      const clientSelectedDateObj = new Date(clientSelectedDate);
      clientSelectedDateObj.setHours(0, 0, 0, 0);

      if (slotClientDate.getTime() === clientSelectedDateObj.getTime()) {
        // Format the time in client timezone
        const clientTime = format(slotInClientTz, 'HH:mm');
        slots.push(clientTime);
      }
    }
  }

  return slots;
}

/**
 * Get available time slots for a given date and professional
 */
export async function getAvailableTimeSlots(
  professionalProfileId: string,
  date: string,
  requiredDurationMinutes: number = 30,
  professionalTimezone: string = 'UTC',
  clientTimezone: string = 'UTC',
): Promise<string[]> {
  const supabase = await createClient();

  try {
    // Create date objects for the start and end of the day in professional's timezone
    // Use zonedTimeToUtc for accurate conversion (handles DST and IANA timezones)
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Convert professional's local day start/end to UTC using fromZonedTime
    const queryStartTime = fromZonedTime(startOfDay, professionalTimezone);
    const queryEndTime = fromZonedTime(endOfDay, professionalTimezone);

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
    const workingHours = parseWorkingHoursFromDB(
      workingHoursData.working_hours,
      professionalTimezone,
    );

    // Get all appointments that might overlap with any day (for cross-midnight checking)
    // Expand the query window to include adjacent days
    const expandedStartTime = new Date(
      queryStartTime.getTime() - 24 * 60 * 60 * 1000,
    ); // 1 day before
    const expandedEndTime = new Date(
      queryEndTime.getTime() + 24 * 60 * 60 * 1000,
    ); // 1 day after

    const { data: appointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select(
        `
        start_time,
        end_time,
        bookings!inner (
          professional_profile_id,
          status
        )
      `,
      )
      .eq('bookings.professional_profile_id', professionalProfileId)
      .neq('bookings.status', 'cancelled')
      .lt('start_time', expandedEndTime.toISOString())
      .gt('end_time', expandedStartTime.toISOString());

    if (appointmentsError) {
      console.error('Error fetching appointments:', appointmentsError);
      return [];
    }

    // Parse client's selected date
    const clientSelectedDateObj = new Date(date);
    clientSelectedDateObj.setHours(0, 0, 0, 0);

    // We need to check all professional working days to see which ones have slots
    // that fall on the client's selected date (due to timezone differences)
    const allSlots: string[] = [];

    console.log(
      `Finding available slots for client date ${date} (professional timezone: ${professionalTimezone}, client timezone: ${clientTimezone})`,
    );

    // For each day offset around the client's selected date, check which professional working days
    // might have slots that fall on this client date after timezone conversion
    for (let dayOffset = -1; dayOffset <= 1; dayOffset++) {
      const professionalDate = new Date(clientSelectedDateObj);
      professionalDate.setDate(professionalDate.getDate() + dayOffset);

      const professionalDayOfWeek = professionalDate.getDay();
      const dayNames = [
        'sunday',
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
        'saturday',
      ];
      const professionalDayName = dayNames[professionalDayOfWeek];

      console.log(
        `Checking professional ${professionalDayName} (offset ${dayOffset}) for slots that fall on client date ${date}`,
      );

      // Find all working day configurations that match this professional day
      const matchingWorkingDays = workingHours.hours.filter(
        (dayHours) =>
          dayHours.enabled &&
          dayHours.startTime &&
          dayHours.endTime &&
          dayHours.day.toLowerCase() === professionalDayName?.toLowerCase(),
      );

      for (const dayWorkingHours of matchingWorkingDays) {
        console.log(
          `  Processing ${dayWorkingHours.day} working hours (${dayWorkingHours.startTime} - ${dayWorkingHours.endTime})`,
        );

        // Generate slots for this professional working day
        const daySlots = await generateCrossMidnightSlots(
          {
            startTime: dayWorkingHours.startTime!,
            endTime: dayWorkingHours.endTime!,
          },
          professionalTimezone,
          clientTimezone,
          date,
          appointments,
          requiredDurationMinutes,
          dayOffset,
        );

        console.log(
          `    Found ${daySlots.length} slots from ${dayWorkingHours.day}: ${daySlots.join(', ')}`,
        );
        allSlots.push(...daySlots);
      }
    }

    // Remove duplicates and sort
    const uniqueSlots = Array.from(new Set(allSlots));
    uniqueSlots.sort((a, b) => {
      const [aHour, aMin] = a.split(':').map(Number);
      const [bHour, bMin] = b.split(':').map(Number);
      return (
        (aHour || 0) * 60 + (aMin || 0) - ((bHour || 0) * 60 + (bMin || 0))
      );
    });

    console.log(
      `Found ${uniqueSlots.length} available slots for client date ${date}`,
    );
    return uniqueSlots;
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
  clientTimezone?: string,
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
    const profTimezone =
      professionalTimezone || professionalProfile.timezone || 'UTC';
    const targetTimezone = clientTimezone || profTimezone;

    // Parse timezone-aware working hours
    const parsedWorkingHours = parseWorkingHoursFromDB(
      professionalProfile.working_hours,
      profTimezone,
    );

    // Get available days with proper timezone conversion and day boundary crossing
    const availableDaysOfWeek = getAvailableDaysWithTimezoneConversion(
      parsedWorkingHours,
      targetTimezone,
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
export async function getAvailablePaymentMethods(): Promise<
  Array<{ id: string; name: string }>
> {
  const supabase = await createClient();

  const { data, error: supabaseError } = await supabase
    .from('payment_methods')
    .select('id, name');

  if (supabaseError) {
    return [];
  }

  return data || [];
}
