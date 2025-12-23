'use server';

import { createAdminClient } from '@/lib/supabase/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Admin-only action to update appointment start and end times for testing purposes
 * Also updates payment scheduling times based on the new appointment times
 */
export async function updateAppointmentTimesAction(
  appointmentId: string,
  startTime: string,
  endTime: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const adminSupabase = await createAdminClient();

    // Check if user is admin
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'Unauthorized: User not found' };
    }

    // Verify admin role
    const { data: isAdminData, error: adminError } = await supabase.rpc(
      'is_admin',
      {
        user_uuid: user.id,
      },
    );

    if (adminError || !isAdminData) {
      return { success: false, error: 'Unauthorized: Admin access required' };
    }

    // Update the appointment using admin client
    const { error: updateError } = await adminSupabase
      .from('appointments')
      .update({
        start_time: startTime,
        end_time: endTime,
        updated_at: new Date().toISOString(),
      })
      .eq('id', appointmentId);

    if (updateError) {
      console.error('Error updating appointment times:', updateError);
      return {
        success: false,
        error: `Failed to update appointment: ${updateError.message}`,
      };
    }

    // Update payment scheduling times based on new appointment times
    await updatePaymentSchedulingTimes(
      adminSupabase,
      appointmentId,
      startTime,
      endTime,
    );

    return { success: true };
  } catch (error) {
    console.error('Error in updateAppointmentTimesAction:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Helper function to update payment scheduling times based on appointment times
 */
async function updatePaymentSchedulingTimes(
  adminSupabase: ReturnType<typeof createAdminClient>,
  appointmentId: string,
  appointmentStartTime: string,
  appointmentEndTime: string,
): Promise<void> {
  try {
    console.log(
      '[updatePaymentSchedulingTimes] Updating payment scheduling for appointment:',
      appointmentId,
    );

    // Get booking ID from appointment
    const { data: appointment, error: appointmentError } = await adminSupabase
      .from('appointments')
      .select('booking_id')
      .eq('id', appointmentId)
      .single();

    if (appointmentError || !appointment) {
      console.error(
        '[updatePaymentSchedulingTimes] Failed to get booking ID:',
        appointmentError,
      );
      return;
    }

    // Calculate payment schedule based on new appointment times
    const { data: scheduleData, error: scheduleError } =
      await adminSupabase.rpc('calculate_payment_schedule', {
        appointment_start_time: appointmentStartTime,
        appointment_end_time: appointmentEndTime,
      });

    if (scheduleError || !scheduleData || scheduleData.length === 0) {
      console.error(
        '[updatePaymentSchedulingTimes] Failed to calculate payment schedule:',
        scheduleError,
      );
      return;
    }

    const schedule = scheduleData[0];
    if (!schedule) {
      console.error(
        '[updatePaymentSchedulingTimes] Schedule data is undefined',
      );
      return;
    }

    const preAuthDate = new Date(schedule.pre_auth_date);
    const captureDate = new Date(schedule.capture_date);
    const shouldPreAuthNow = schedule.should_pre_auth_now;

    console.log('[updatePaymentSchedulingTimes] Calculated schedule:', {
      preAuthDate: preAuthDate.toISOString(),
      captureDate: captureDate.toISOString(),
      shouldPreAuthNow,
    });

    // Update booking_payments with new scheduling times
    const paymentUpdateData: {
      capture_scheduled_for: string;
      updated_at: string;
      pre_auth_scheduled_for?: string | null;
      pre_auth_placed_at?: string | null;
      status?: string;
    } = {
      capture_scheduled_for: captureDate.toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (shouldPreAuthNow) {
      // If appointment is within 6 days, set pre-auth as placed
      paymentUpdateData.pre_auth_scheduled_for = null;
      paymentUpdateData.pre_auth_placed_at = new Date().toISOString();
      paymentUpdateData.status = 'authorized';
    } else {
      // If appointment is more than 6 days away, schedule pre-auth
      paymentUpdateData.pre_auth_scheduled_for = preAuthDate.toISOString();
      paymentUpdateData.pre_auth_placed_at = null;
      paymentUpdateData.status = 'pre_auth_scheduled';
    }

    const { error: paymentUpdateError } = await adminSupabase
      .from('booking_payments')
      .update(paymentUpdateData)
      .eq('booking_id', appointment.booking_id);

    if (paymentUpdateError) {
      console.error(
        '[updatePaymentSchedulingTimes] Failed to update payment scheduling:',
        paymentUpdateError,
      );
    } else {
      console.log(
        '[updatePaymentSchedulingTimes] Successfully updated payment scheduling:',
        {
          bookingId: appointment.booking_id,
          updates: paymentUpdateData,
        },
      );
    }
  } catch (error) {
    console.error('[updatePaymentSchedulingTimes] Unexpected error:', error);
  }
}

/**
 * Admin action to make an appointment ongoing (start time = now - 10 minutes, end time = now + 50 minutes)
 */
export async function makeAppointmentOngoingAction(
  appointmentId: string,
): Promise<{ success: boolean; error?: string }> {
  const now = new Date();
  const startTime = new Date(now.getTime() - 10 * 60 * 1000); // 10 minutes ago
  const endTime = new Date(now.getTime() + 50 * 60 * 1000); // 50 minutes from now (1 hour total duration)

  return updateAppointmentTimesAction(
    appointmentId,
    startTime.toISOString(),
    endTime.toISOString(),
  );
}

/**
 * Admin action to make an appointment completed (both start and end times in the past)
 */
export async function makeAppointmentCompletedAction(
  appointmentId: string,
  hoursAgo: number = 2,
): Promise<{ success: boolean; error?: string }> {
  const now = new Date();
  const endTime = new Date(now.getTime() - hoursAgo * 60 * 60 * 1000); // specified hours ago
  const startTime = new Date(endTime.getTime() - 60 * 60 * 1000); // 1 hour before end time

  return updateAppointmentTimesAction(
    appointmentId,
    startTime.toISOString(),
    endTime.toISOString(),
  );
}

/**
 * Admin action to make an appointment upcoming (both start and end times in the future)
 */
export async function makeAppointmentUpcomingAction(
  appointmentId: string,
  hoursFromNow: number = 24,
): Promise<{ success: boolean; error?: string }> {
  const now = new Date();
  const startTime = new Date(now.getTime() + hoursFromNow * 60 * 60 * 1000); // specified hours from now
  const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 1 hour duration

  return updateAppointmentTimesAction(
    appointmentId,
    startTime.toISOString(),
    endTime.toISOString(),
  );
}

/**
 * Admin action to simulate payment pre-auth being scheduled (appointment > 6 days away)
 */
export async function makePaymentPreAuthScheduledAction(
  appointmentId: string,
): Promise<{ success: boolean; error?: string }> {
  const now = new Date();
  const startTime = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
  const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 1 hour duration

  return updateAppointmentTimesAction(
    appointmentId,
    startTime.toISOString(),
    endTime.toISOString(),
  );
}

/**
 * Admin action to make payment pre-auth ready for cron job pickup
 * Sets pre_auth_scheduled_for to NOW so cron job can immediately process it
 */
export async function makePaymentPreAuthPlacedAction(
  appointmentId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const adminSupabase = await createAdminClient();

    // Check if user is admin
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'Unauthorized: User not found' };
    }

    // Verify admin role
    const { data: isAdminData, error: adminError } = await supabase.rpc(
      'is_admin',
      {
        user_uuid: user.id,
      },
    );

    if (adminError || !isAdminData) {
      return { success: false, error: 'Unauthorized: Admin access required' };
    }

    // Set appointment to 5 days from now (within 6-day threshold)
    const now = new Date();
    const startTime = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

    // Update appointment times
    const { error: appointmentError } = await adminSupabase
      .from('appointments')
      .update({
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', appointmentId);

    if (appointmentError) {
      console.error('Error updating appointment:', appointmentError);
      return {
        success: false,
        error: `Failed to update appointment: ${appointmentError.message}`,
      };
    }

    // Get booking ID and existing payment method ID
    const { data: appointment, error: getAppointmentError } =
      await adminSupabase
        .from('appointments')
        .select('booking_id')
        .eq('id', appointmentId)
        .single();

    if (getAppointmentError || !appointment) {
      return {
        success: false,
        error: 'Failed to get booking ID',
      };
    }

    // Get existing payment record to preserve stripe_payment_method_id
    const { data: existingPayment, error: getPaymentError } =
      await adminSupabase
        .from('booking_payments')
        .select('stripe_payment_method_id')
        .eq('booking_id', appointment.booking_id)
        .single();

    if (getPaymentError) {
      console.error('Error getting existing payment:', getPaymentError);
      return {
        success: false,
        error: 'Failed to get existing payment record',
      };
    }

    // Set pre_auth_scheduled_for to NOW so cron job picks it up immediately
    // Also calculate proper capture_scheduled_for (12 hours after appointment end)
    const captureTime = new Date(endTime.getTime() + 12 * 60 * 60 * 1000);

    const { error: paymentError } = await adminSupabase
      .from('booking_payments')
      .update({
        pre_auth_scheduled_for: new Date().toISOString(), // NOW - triggers cron
        pre_auth_placed_at: null, // Must be null for cron to pick it up
        capture_scheduled_for: captureTime.toISOString(),
        status: 'pre_auth_scheduled', // Status that cron expects
        stripe_payment_method_id: existingPayment.stripe_payment_method_id, // CRITICAL: Preserve this!
        updated_at: new Date().toISOString(),
      })
      .eq('booking_id', appointment.booking_id);

    if (paymentError) {
      console.error('Error updating payment:', paymentError);
      return {
        success: false,
        error: `Failed to update payment: ${paymentError.message}`,
      };
    }

    console.log(
      `✅ Pre-auth made ready for cron pickup - booking: ${appointment.booking_id}`,
    );
    return { success: true };
  } catch (error) {
    console.error('Error in makePaymentPreAuthPlacedAction:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Admin action to make payment capture ready for cron job pickup
 * Sets capture_scheduled_for to NOW so cron job can immediately capture it
 */
export async function makePaymentCaptureReadyAction(
  appointmentId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const adminSupabase = await createAdminClient();

    // Check if user is admin
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'Unauthorized: User not found' };
    }

    // Verify admin role
    const { data: isAdminData, error: adminError } = await supabase.rpc(
      'is_admin',
      {
        user_uuid: user.id,
      },
    );

    if (adminError || !isAdminData) {
      return { success: false, error: 'Unauthorized: Admin access required' };
    }

    // Set appointment to have ended 2 hours ago
    const now = new Date();
    const endTime = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const startTime = new Date(endTime.getTime() - 60 * 60 * 1000);

    // Update appointment times
    const { error: appointmentError } = await adminSupabase
      .from('appointments')
      .update({
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', appointmentId);

    if (appointmentError) {
      console.error('Error updating appointment:', appointmentError);
      return {
        success: false,
        error: `Failed to update appointment: ${appointmentError.message}`,
      };
    }

    // Get booking ID
    const { data: appointment, error: getAppointmentError } =
      await adminSupabase
        .from('appointments')
        .select('booking_id')
        .eq('id', appointmentId)
        .single();

    if (getAppointmentError || !appointment) {
      return {
        success: false,
        error: 'Failed to get booking ID',
      };
    }

    // Get existing payment record to preserve critical fields
    const { data: existingPayment, error: getPaymentError } =
      await adminSupabase
        .from('booking_payments')
        .select('stripe_payment_method_id, stripe_payment_intent_id')
        .eq('booking_id', appointment.booking_id)
        .single();

    if (getPaymentError) {
      console.error('Error getting existing payment:', getPaymentError);
      return {
        success: false,
        error: 'Failed to get existing payment record',
      };
    }

    // Set capture_scheduled_for to NOW so cron job picks it up immediately
    // Must have stripe_payment_intent_id and status 'authorized' for cron to process
    const { error: paymentError } = await adminSupabase
      .from('booking_payments')
      .update({
        capture_scheduled_for: new Date().toISOString(), // NOW - triggers cron
        status: 'authorized', // Status that cron expects for capture
        stripe_payment_method_id: existingPayment.stripe_payment_method_id, // CRITICAL: Preserve this!
        stripe_payment_intent_id: existingPayment.stripe_payment_intent_id, // CRITICAL: Preserve this!
        updated_at: new Date().toISOString(),
      })
      .eq('booking_id', appointment.booking_id);

    if (paymentError) {
      console.error('Error updating payment:', paymentError);
      return {
        success: false,
        error: `Failed to update payment: ${paymentError.message}`,
      };
    }

    console.log(
      `✅ Capture made ready for cron pickup - booking: ${appointment.booking_id}`,
    );
    return { success: true };
  } catch (error) {
    console.error('Error in makePaymentCaptureReadyAction:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}
