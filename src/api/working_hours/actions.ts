'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

// Type for the structure stored in the JSONB column
// Corresponds to one element of ContactHoursFormValues['hours']
export type WorkingHoursEntry = {
  day: string;
  enabled: boolean;
  startTime: string | null;
  endTime: string | null;
};

// Result type for fetching
type GetWorkingHoursResult = {
  success: boolean;
  hours: WorkingHoursEntry[] | null;
  error?: string;
};

// Result type for updating
type UpdateWorkingHoursResult = {
  success: boolean;
  error?: string;
};

const DEFAULT_WORKING_HOURS: WorkingHoursEntry[] = [
  { day: 'Monday', enabled: false, startTime: null, endTime: null },
  { day: 'Tuesday', enabled: true, startTime: '09:00', endTime: '17:00' },
  { day: 'Wednesday', enabled: true, startTime: '09:00', endTime: '17:00' },
  { day: 'Thursday', enabled: true, startTime: '09:00', endTime: '17:00' },
  { day: 'Friday', enabled: true, startTime: '09:00', endTime: '17:00' },
  { day: 'Saturday', enabled: false, startTime: null, endTime: null },
  { day: 'Sunday', enabled: false, startTime: null, endTime: null },
];


/**
 * Server Action: Fetch working hours for a professional profile
 */
export async function getWorkingHoursAction(userId: string): Promise<GetWorkingHoursResult> {
  const supabase = await createClient();
  try {
    const { data, error } = await supabase
      .from('professional_profiles')
      .select('working_hours')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching working hours:', error);
      return { success: false, hours: null, error: error.message };
    }

    // If no data or working_hours is null/undefined, return default hours
    if (!data || !data.working_hours) {
      console.log(`No working hours found for user ${userId}, returning default.`);
      return { success: true, hours: DEFAULT_WORKING_HOURS };
    }

    // Basic validation: Check if it's an array (more robust validation could be added)
    if (!Array.isArray(data.working_hours)) {
        console.error('Invalid working_hours format in DB:', data.working_hours);
        // Return default hours as a fallback if format is wrong
         return { success: true, hours: DEFAULT_WORKING_HOURS, error: 'Invalid data format found, returned defaults.' };
    }

    // TODO: Add more specific validation that data.working_hours matches WorkingHoursEntry[] structure

    return { success: true, hours: data.working_hours as WorkingHoursEntry[] };

  } catch (err) {
    console.error('Server error fetching working hours:', err);
    const message = err instanceof Error ? err.message : 'Failed to fetch working hours';
    return { success: false, hours: null, error: message };
  }
}

/**
 * Server Action: Update working hours for a professional profile
 */
export async function updateWorkingHoursAction(
  userId: string,
  hoursData: WorkingHoursEntry[] // Expecting the structured array
): Promise<UpdateWorkingHoursResult> {
  const supabase = await createClient();
  try {
    const { error } = await supabase
      .from('professional_profiles')
      .update({
        working_hours: hoursData, // Store the array directly as JSONB
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (error) {
      console.error('Error updating working hours:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/profile'); // Revalidate profile page

    return { success: true };

  } catch (err) {
    console.error('Server error updating working hours:', err);
    const message = err instanceof Error ? err.message : 'Failed to update working hours';
    return { success: false, error: message };
  }
} 