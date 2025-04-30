export const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

export type DayOfWeek = (typeof DAYS_OF_WEEK)[number];

// Generate time options (e.g., every 30 minutes)
const generateTimeOptions = (intervalMinutes: number = 30) => {
  const options = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += intervalMinutes) {
      const hourString = hour.toString().padStart(2, '0');
      const minuteString = minute.toString().padStart(2, '0');
      const timeValue = `${hourString}:${minuteString}`;
      const ampm = hour < 12 ? 'AM' : 'PM';
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      const timeLabel = `${displayHour}:${minuteString} ${ampm}`;
      options.push({ value: timeValue, label: timeLabel });
    }
  }
  // Add the special Midnight (End of Day) option
  options.push({ value: '24:00', label: '12:00 AM (Midnight)' }); 
  return options;
};

export const TIME_OPTIONS = generateTimeOptions(30); // Generate options every 30 mins

// Helper to convert HH:MM string to minutes from midnight
export const timeToMinutes = (time: string | undefined | null): number | null => {
  if (!time) return null;
  // Handle the special Midnight case
  if (time === '24:00') return 24 * 60; 

  const parts = time.split(':');
  if (parts.length !== 2) return null;
  const hoursStr = parts[0];
  const minutesStr = parts[1];
  if (hoursStr === undefined || minutesStr === undefined) return null;
  const hours = parseInt(hoursStr, 10);
  const minutes = parseInt(minutesStr, 10);
  if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours >= 24 || minutes < 0 || minutes >= 60) {
     // Add stricter validation for standard times
     return null;
  }
  return hours * 60 + minutes;
};

// Helper to parse display string like "9:00 AM - 5:00 PM" or "Closed"
export const parseDisplayHours = (
  displayHours: string | undefined | null,
): { startTime?: string | undefined; endTime?: string | undefined } => {
  if (!displayHours || displayHours.toLowerCase() === 'closed') {
    return {}; // Return empty object for exactOptionalPropertyTypes
  }

  const parts = displayHours.split(' - ');
  if (parts.length !== 2) return {};

  const convertTo24Hour = (timeStr: string | undefined): string | undefined => {
    if (!timeStr) return undefined;
    const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!match) return undefined;

    // Ensure matched parts are defined (though regex guarantees this if match succeeds)
    const hoursStr = match[1];
    const minutesStr = match[2];
    let ampm = match[3];
    if (!hoursStr || !minutesStr || !ampm) return undefined;

    let hours = parseInt(hoursStr, 10);
    ampm = ampm.toUpperCase();

    if (ampm === 'AM' && hours === 12) hours = 0; // Midnight case
    if (ampm === 'PM' && hours < 12) hours += 12; // PM case

    return `${hours.toString().padStart(2, '0')}:${minutesStr}`;
  };

  const startTime = convertTo24Hour(parts[0]);
  const endTime = convertTo24Hour(parts[1]);

  // Construct result carefully for exactOptionalPropertyTypes
  const result: { startTime?: string | undefined; endTime?: string | undefined } = {};
  if (startTime !== undefined) result.startTime = startTime;
  if (endTime !== undefined) result.endTime = endTime;

  return result;
}; 