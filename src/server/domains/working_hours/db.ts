import { createClient } from '@/lib/supabase/server';
import { DEFAULT_WORKING_HOURS, WorkingHoursEntry, TimezoneAwareWorkingHours } from '@/types/working_hours';
import { parseWorkingHoursFromDB, prepareWorkingHoursForDB } from '@/utils/timezone';

/**
 * Fetch working hours and timezone for a professional profile
 */
export async function getWorkingHoursFromDb(userId: string): Promise<{
  hours: WorkingHoursEntry[];
  timezone: string;
}> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('professional_profiles')
    .select('working_hours, timezone')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching working hours:', error);
    throw new Error(error.message);
  }

  // If no data, return defaults
  if (!data) {
    console.log(`No profile found for user ${userId}, returning defaults.`);
    return {
      hours: DEFAULT_WORKING_HOURS,
      timezone: 'UTC', // Will be overridden by browser timezone on frontend
    };
  }

  // Parse working hours with timezone awareness
  const parsedWorkingHours = parseWorkingHoursFromDB(data.working_hours, data.timezone || 'UTC');
  
  return {
    hours: parsedWorkingHours.hours.length > 0 ? parsedWorkingHours.hours : DEFAULT_WORKING_HOURS,
    // If no timezone is set in DB, return null so frontend can detect and use browser timezone
    timezone: data.timezone || '', // Empty string indicates no timezone set in DB
  };
}

/**
 * Update working hours and timezone for a professional profile
 */
export async function updateWorkingHoursInDb(
  userId: string,
  hoursData: WorkingHoursEntry[],
  timezone?: string
): Promise<void> {
  const supabase = await createClient();
  
  // Prepare timezone-aware working hours for storage
  const timezoneToUse = timezone || 'UTC';
  const workingHoursForStorage = prepareWorkingHoursForDB(hoursData, timezoneToUse);
  
  const updateData: { working_hours: TimezoneAwareWorkingHours; timezone?: string; updated_at: string } = {
    working_hours: workingHoursForStorage,
    updated_at: new Date().toISOString(),
  };

  // Only update timezone if provided
  if (timezone) {
    updateData.timezone = timezone;
  }
  
  const { error } = await supabase
    .from('professional_profiles')
    .update(updateData)
    .eq('user_id', userId);

  if (error) {
    console.error('Error updating working hours:', error);
    throw new Error(error.message);
  }
}

/**
 * Get professional's timezone
 */
export async function getProfessionalTimezone(userId: string): Promise<string> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('professional_profiles')
    .select('timezone')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching timezone:', error);
    throw new Error(error.message);
  }

  return data?.timezone || 'UTC';
} 