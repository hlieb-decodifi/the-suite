// Type for the structure stored in the JSONB column
// Corresponds to one element of ContactHoursFormValues['hours']
export type WorkingHoursEntry = {
  day: string;
  enabled: boolean;
  startTime: string | null;
  endTime: string | null;
};

// Default working hours for new professionals
export const DEFAULT_WORKING_HOURS: WorkingHoursEntry[] = [
  { day: 'Monday', enabled: false, startTime: null, endTime: null },
  { day: 'Tuesday', enabled: false, startTime: null, endTime: null },
  { day: 'Wednesday', enabled: false, startTime: null, endTime: null },
  { day: 'Thursday', enabled: false, startTime: null, endTime: null },
  { day: 'Friday', enabled: false, startTime: null, endTime: null },
  { day: 'Saturday', enabled: false, startTime: null, endTime: null },
  { day: 'Sunday', enabled: false, startTime: null, endTime: null },
]; 

export function isValidWorkingHours(hours: unknown): hours is WorkingHoursEntry[] {
  if (!hours || !Array.isArray(hours)) return false;
  
  if (hours.length === 0) return false;
  
  return hours.every(entry => 
    entry && 
    typeof entry === 'object' &&
    'day' in entry &&
    'enabled' in entry &&
    'startTime' in entry &&
    'endTime' in entry
  );
}