'use server';

import { revalidatePath } from 'next/cache';
import { WorkingHoursEntry } from '@/types/working_hours';
import { getWorkingHoursFromDb, updateWorkingHoursInDb, getProfessionalTimezone } from './db';
import { createClient } from '@/lib/supabase/server';

// Result type for fetching with timezone
type GetWorkingHoursResult = {
  success: boolean;
  hours?: WorkingHoursEntry[] | null;
  timezone?: string;
  error?: string;
};

// Result type for updating
type UpdateWorkingHoursResult = {
  success: boolean;
  error?: string;
};

// Helper function to check if working hours are empty (no enabled days)
function hasEnabledWorkingHours(workingHours: WorkingHoursEntry[]): boolean {
  return workingHours.some(hour => hour.enabled === true);
}

// Helper function to check if user's profile is published
async function isProfilePublished(userId: string): Promise<boolean> {
  const supabase = await createClient();
  
  const { data: profileData } = await supabase
    .from('professional_profiles')
    .select('is_published')
    .eq('user_id', userId)
    .single();
  
  return profileData?.is_published === true;
}

/**
 * Server Action: Fetch working hours for a professional profile with timezone
 */
export async function getWorkingHoursAction(userId: string): Promise<GetWorkingHoursResult> {
  try {
    const { hours, timezone } = await getWorkingHoursFromDb(userId);
    
    return { 
      success: true, 
      hours: hours,
      timezone: timezone || 'UTC'
    };
  } catch (err) {
    console.error('Server error fetching working hours:', err);
    const message = err instanceof Error ? err.message : 'Failed to fetch working hours';
    return { success: false, hours: null, error: message };
  }
}

/**
 * Server Action: Update working hours and timezone for a professional profile
 */
export async function updateWorkingHoursAction(
  userId: string,
  hoursData: WorkingHoursEntry[],
  timezone?: string
): Promise<UpdateWorkingHoursResult> {
  try {
    // Check if profile is published and if we're trying to clear all working hours
    const isPublished = await isProfilePublished(userId);
    const hasEnabledHours = hasEnabledWorkingHours(hoursData);
    
    if (isPublished && !hasEnabledHours) {
      return {
        success: false,
        error: 'Cannot remove all working hours while profile is published. You must have at least one working day selected.',
      };
    }
    
    await updateWorkingHoursInDb(userId, hoursData, timezone);
    revalidatePath('/profile'); // Revalidate profile page
    return { success: true };
  } catch (err) {
    console.error('Server error updating working hours:', err);
    const message = err instanceof Error ? err.message : 'Failed to update working hours';
    return { success: false, error: message };
  }
}

/**
 * Server Action: Get professional's timezone
 */
export async function getProfessionalTimezoneAction(userId: string): Promise<{
  success: boolean;
  timezone?: string;
  error?: string;
}> {
  try {
    const timezone = await getProfessionalTimezone(userId);
    return { success: true, timezone: timezone || 'UTC' };
  } catch (err) {
    console.error('Server error fetching timezone:', err);
    const message = err instanceof Error ? err.message : 'Failed to fetch timezone';
    return { success: false, error: message };
  }
} 