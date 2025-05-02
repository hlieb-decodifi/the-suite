'use server';

import { revalidatePath } from 'next/cache';
import { WorkingHoursEntry } from '@/types/working_hours';
import { getWorkingHoursFromDb, updateWorkingHoursInDb } from './db';

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

/**
 * Server Action: Fetch working hours for a professional profile
 */
export async function getWorkingHoursAction(userId: string): Promise<GetWorkingHoursResult> {
  try {
    const hours = await getWorkingHoursFromDb(userId);
    return { success: true, hours };
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
  hoursData: WorkingHoursEntry[]
): Promise<UpdateWorkingHoursResult> {
  try {
    await updateWorkingHoursInDb(userId, hoursData);
    revalidatePath('/profile'); // Revalidate profile page
    return { success: true };
  } catch (err) {
    console.error('Server error updating working hours:', err);
    const message = err instanceof Error ? err.message : 'Failed to update working hours';
    return { success: false, error: message };
  }
} 