'use server';

import { revalidatePath } from 'next/cache';
import { WorkingHoursEntry } from '@/types/working_hours';
import { getWorkingHoursFromDb, updateWorkingHoursInDb, getProfessionalTimezone } from './db';

// Result type for fetching with timezone
type GetWorkingHoursResult = {
  success: boolean;
  hours: WorkingHoursEntry[] | null;
  timezone?: string;
  error?: string;
};

// Result type for updating
type UpdateWorkingHoursResult = {
  success: boolean;
  error?: string;
};

/**
 * Server Action: Fetch working hours for a professional profile with timezone
 */
export async function getWorkingHoursAction(userId: string): Promise<GetWorkingHoursResult> {
  try {
    const { hours, timezone } = await getWorkingHoursFromDb(userId);
    return { success: true, hours, timezone };
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
    return { success: true, timezone };
  } catch (err) {
    console.error('Server error fetching timezone:', err);
    const message = err instanceof Error ? err.message : 'Failed to fetch timezone';
    return { success: false, error: message };
  }
} 