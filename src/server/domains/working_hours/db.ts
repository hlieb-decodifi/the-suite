import { createClient } from '@/lib/supabase/server';
import { DEFAULT_WORKING_HOURS, WorkingHoursEntry } from '@/types/working_hours';

/**
 * Fetch working hours for a professional profile
 */
export async function getWorkingHoursFromDb(userId: string): Promise<WorkingHoursEntry[]> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('professional_profiles')
    .select('working_hours')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching working hours:', error);
    throw new Error(error.message);
  }

  // If no data or working_hours is null/undefined, return default hours
  if (!data || !data.working_hours) {
    console.log(`No working hours found for user ${userId}, returning default.`);
    return DEFAULT_WORKING_HOURS;
  }

  // Basic validation: Check if it's an array
  if (!Array.isArray(data.working_hours)) {
    console.error('Invalid working_hours format in DB:', data.working_hours);
    // Return default hours as a fallback if format is wrong
    return DEFAULT_WORKING_HOURS;
  }

  return data.working_hours as WorkingHoursEntry[];
}

/**
 * Update working hours for a professional profile
 */
export async function updateWorkingHoursInDb(
  userId: string,
  hoursData: WorkingHoursEntry[]
): Promise<void> {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from('professional_profiles')
    .update({
      working_hours: hoursData, // Store the array directly as JSONB
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  if (error) {
    console.error('Error updating working hours:', error);
    throw new Error(error.message);
  }
} 