'use server';

import { createAdminClient } from '@/lib/supabase/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Admin-only action to update appointment start and end times for testing purposes
 */
export async function updateAppointmentTimesAction(
  appointmentId: string,
  startTime: string,
  endTime: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const adminSupabase = await createAdminClient();

    // Check if user is admin
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'Unauthorized: User not found' };
    }

    // Verify admin role
    const { data: isAdminData, error: adminError } = await supabase.rpc('is_admin', {
      user_uuid: user.id,
    });

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
      return { success: false, error: `Failed to update appointment: ${updateError.message}` };
    }

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
 * Admin action to make an appointment ongoing (start time = now - 10 minutes, end time = now + 50 minutes)
 */
export async function makeAppointmentOngoingAction(
  appointmentId: string
): Promise<{ success: boolean; error?: string }> {
  const now = new Date();
  const startTime = new Date(now.getTime() - 10 * 60 * 1000); // 10 minutes ago
  const endTime = new Date(now.getTime() + 50 * 60 * 1000); // 50 minutes from now (1 hour total duration)

  return updateAppointmentTimesAction(
    appointmentId,
    startTime.toISOString(),
    endTime.toISOString()
  );
}

/**
 * Admin action to make an appointment completed (both start and end times in the past)
 */
export async function makeAppointmentCompletedAction(
  appointmentId: string,
  hoursAgo: number = 2
): Promise<{ success: boolean; error?: string }> {
  const now = new Date();
  const endTime = new Date(now.getTime() - hoursAgo * 60 * 60 * 1000); // specified hours ago
  const startTime = new Date(endTime.getTime() - 60 * 60 * 1000); // 1 hour before end time

  return updateAppointmentTimesAction(
    appointmentId,
    startTime.toISOString(),
    endTime.toISOString()
  );
}

/**
 * Admin action to make an appointment upcoming (both start and end times in the future)
 */
export async function makeAppointmentUpcomingAction(
  appointmentId: string,
  hoursFromNow: number = 24
): Promise<{ success: boolean; error?: string }> {
  const now = new Date();
  const startTime = new Date(now.getTime() + hoursFromNow * 60 * 60 * 1000); // specified hours from now
  const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 1 hour duration

  return updateAppointmentTimesAction(
    appointmentId,
    startTime.toISOString(),
    endTime.toISOString()
  );
}
