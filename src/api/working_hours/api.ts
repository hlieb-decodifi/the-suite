import { WorkingHoursEntry } from '@/types/working_hours';
import { getWorkingHoursAction, updateWorkingHoursAction } from '@/server/domains/working_hours/actions';

/**
 * Get working hours for a professional profile
 */
export async function getWorkingHours(userId: string): Promise<WorkingHoursEntry[]> {
  const result = await getWorkingHoursAction(userId);
  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch working hours');
  }
  return result.hours || [];
}

/**
 * Update working hours for a professional profile
 */
export async function updateWorkingHours(
  userId: string,
  hoursData: WorkingHoursEntry[]
): Promise<void> {
  const result = await updateWorkingHoursAction(userId, hoursData);
  if (!result.success) {
    throw new Error(result.error || 'Failed to update working hours');
  }
} 