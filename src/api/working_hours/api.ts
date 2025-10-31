import { WorkingHoursEntry } from '@/types/working_hours';
import {
  getWorkingHoursAction,
  updateWorkingHoursAction,
  getProfessionalTimezoneAction,
} from '@/server/domains/working_hours/actions';

/**
 * Get working hours and timezone for a professional profile
 */
export async function getWorkingHours(userId: string): Promise<{
  hours: WorkingHoursEntry[];
  timezone: string;
}> {
  const result = await getWorkingHoursAction(userId);
  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch working hours');
  }
  return {
    hours: result.hours || [],
    timezone: result.timezone || 'UTC',
  };
}

/**
 * Update working hours and timezone for a professional profile
 */
export async function updateWorkingHours(
  userId: string,
  hoursData: WorkingHoursEntry[],
  timezone?: string,
): Promise<void> {
  const result = await updateWorkingHoursAction(userId, hoursData, timezone);
  if (!result.success) {
    throw new Error(result.error || 'Failed to update working hours');
  }
}

/**
 * Get professional's timezone
 */
export async function getProfessionalTimezone(userId: string): Promise<string> {
  const result = await getProfessionalTimezoneAction(userId);
  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch timezone');
  }
  return result.timezone || 'UTC';
}
