/**
 * Formats a date object to a readable string
 */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

/**
 * Formats a time string (from 24h format to 12h format with AM/PM)
 */
export function formatTime(time: string): string {
  // Format time string (assuming time is in format like "14:30")
  const parts = time.split(':').map(Number);
  const hour = parts[0] || 0;
  const minute = parts[1] || 0;

  const ampm = hour >= 12 ? 'PM' : 'AM';
  const formattedHour = hour % 12 || 12;

  return `${formattedHour}:${minute.toString().padStart(2, '0')} ${ampm}`;
}

/**
 * Converts a local time string to UTC format
 * @param timeString The time string in "HH:MM" format in local timezone
 * @returns The time string in "HH:MM" format in UTC timezone
 */
export function convertToUTC(
  timeString: string | null | undefined,
): string | null {
  // QUICK WORKAROUND: Just return the input time string without conversion
  return timeString || null;

  /* 
  if (!timeString) return null;
  
  try {
    // Parse the time string (e.g., "09:30")
    const parts = timeString.split(':');
    if (parts.length < 2) return null;
    
    const hourStr = parts[0] || '0';
    const minuteStr = parts[1] || '0';
    
    const hours = parseInt(hourStr, 10);
    const minutes = parseInt(minuteStr, 10);
    
    if (isNaN(hours) || isNaN(minutes)) return null;
    
    // Create a date with today's date in local timezone
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const day = today.getDate();
    
    // Set the local time using local timezone
    const localDate = new Date(year, month, day, hours, minutes, 0);
    
    // Convert to UTC format HH:MM
    const utcHours = localDate.getUTCHours();
    const utcMinutes = localDate.getUTCMinutes();
    
    return `${utcHours.toString().padStart(2, '0')}:${utcMinutes.toString().padStart(2, '0')}`;
  } catch (error) {
    console.error('Error converting time to UTC:', error);
    return null;
  }
  */
}

/**
 * Converts a UTC time string to local format
 * @param timeString The time string in "HH:MM" format in UTC timezone
 * @returns The time string in "HH:MM" format in local timezone
 */
export function convertToLocal(
  timeString: string | null | undefined,
): string | null {
  // QUICK WORKAROUND: Just return the input time string without conversion
  return timeString || null;

  /*
  if (!timeString) return null;
  
  try {
    // Parse the UTC time string (e.g., "14:30")
    const parts = timeString.split(':');
    if (parts.length < 2) return null;
    
    const hourStr = parts[0] || '0';
    const minuteStr = parts[1] || '0';
    
    const utcHours = parseInt(hourStr, 10);
    const utcMinutes = parseInt(minuteStr, 10);
    
    if (isNaN(utcHours) || isNaN(utcMinutes)) return null;
    
    // Create a date with today's date in UTC
    const today = new Date();
    const utcDate = new Date(Date.UTC(
      today.getUTCFullYear(),
      today.getUTCMonth(),
      today.getUTCDate(),
      utcHours,
      utcMinutes,
      0
    ));
    
    // Convert to local format HH:MM
    const localHours = utcDate.getHours();
    const localMinutes = utcDate.getMinutes();
    
    return `${localHours.toString().padStart(2, '0')}:${localMinutes.toString().padStart(2, '0')}`;
  } catch (error) {
    console.error('Error converting UTC time to local:', error);
    return null;
  }
  */
}

/**
 * Formats a Date object as a local YYYY-MM-DD string (timezone-safe)
 */
export function formatDateLocalYYYYMMDD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
