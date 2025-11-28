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

// Time conversion helper
export const timeToMinutes = (
  time: string | null | undefined,
): number | null => {
  if (!time) return null;
  const parts = time.split(':');
  // Ensure parts has 2 elements AND that they are defined strings
  if (parts.length !== 2 || parts[0] === undefined || parts[1] === undefined) {
    return null;
  }
  // Now parts[0] and parts[1] are guaranteed to be strings
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  if (isNaN(hours) || isNaN(minutes)) return null;
  return hours * 60 + minutes;
};

// Helper to parse display hours string like "9:00 AM - 5:00 PM"
export const parseDisplayHours = (
  hoursString: string | undefined | null,
): { startTime?: string; endTime?: string } => {
  if (!hoursString || hoursString.toLowerCase() === 'closed') {
    return {}; // Return empty for exactOptionalPropertyTypes compatibility
  }
  const parts = hoursString.split(' - ');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return {}; // Invalid format
  }

  // Function to convert 12-hour AM/PM time to HH:MM format
  const formatBackToHHMM = (timeStr: string): string | undefined => {
    const timeParts = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!timeParts) return undefined;

    // Explicitly check match array elements before using them
    const hoursStr = timeParts[1];
    const minuteStr = timeParts[2];
    const ampm = timeParts[3]?.toUpperCase(); // Safe navigation for ampm

    if (!hoursStr || !minuteStr || !ampm) return undefined; // Guard against missing parts

    let hour = parseInt(hoursStr, 10);
    if (isNaN(hour)) return undefined; // Guard against parsing failure

    if (ampm === 'PM' && hour !== 12) {
      hour += 12;
    } else if (ampm === 'AM' && hour === 12) {
      hour = 0; // Midnight
    }

    // Ensure hour is within valid range (0-23) although logic should guarantee this
    if (hour < 0 || hour > 23) return undefined;

    return `${hour.toString().padStart(2, '0')}:${minuteStr}`;
  };

  // Ensure parts[0] and parts[1] are defined before calling
  const startTime = parts[0] ? formatBackToHHMM(parts[0]) : undefined;
  const endTime = parts[1] ? formatBackToHHMM(parts[1]) : undefined;

  // Build result object ensuring only defined values are added
  const result: { startTime?: string; endTime?: string } = {};
  if (startTime !== undefined) result.startTime = startTime;
  if (endTime !== undefined) result.endTime = endTime;

  return result;
};
