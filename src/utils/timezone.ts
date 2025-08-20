import { format, parse, isValid } from 'date-fns';
import { toZonedTime, fromZonedTime, getTimezoneOffset } from 'date-fns-tz';

export type TimezoneAwareWorkingHours = {
  timezone: string;
  hours: Array<{
    day: string;
    enabled: boolean;
    startTime: string | null;
    endTime: string | null;
  }>;
};

/**
 * Get GMT offset for a timezone (e.g., "GMT+5", "GMT-4")
 */
function getGMTOffset(timezone: string): string | null {
  try {
    const now = new Date();
    
    // Use Intl.DateTimeFormat to get proper offset
    const formatter = new Intl.DateTimeFormat('en', {
      timeZone: timezone,
      timeZoneName: 'longOffset'
    });
    
    const parts = formatter.formatToParts(now);
    const timeZoneName = parts.find(part => part.type === 'timeZoneName')?.value;
    
    if (timeZoneName) {
      // timeZoneName will be like "GMT+05:30" or "GMT-05:00"
      const match = timeZoneName.match(/GMT([+-])(\d{2}):(\d{2})/);
      if (match) {
        const [, sign, hours, minutes] = match;
        const hourNum = parseInt(hours || '0', 10);
        const minNum = parseInt(minutes || '0', 10);
        
        if (minNum === 0) {
          return `GMT${sign}${hourNum}`;
        } else {
          return `GMT${sign}${hourNum}:${minutes}`;
        }
      }
    }
    
    // Fallback to manual calculation if Intl method fails
    const offsetMinutes = getTimezoneOffset(timezone, now);
    const offsetHours = offsetMinutes / 60;
    
    if (offsetHours === 0) {
      return 'GMT+0';
    }
    
    const sign = offsetHours > 0 ? '-' : '+';
    const absHours = Math.abs(offsetHours);
    
    if (absHours % 1 === 0) {
      return `GMT${sign}${Math.floor(absHours)}`;
    } else {
      const hours = Math.floor(absHours);
      const minutes = Math.round((absHours - hours) * 60);
      return `GMT${sign}${hours}:${minutes.toString().padStart(2, '0')}`;
    }
  } catch (error) {
    console.error('Error calculating GMT offset for', timezone, error);
    return null; // Return null for invalid timezones
  }
}

/**
 * Get list of timezones organized by region for dropdown
 */
export function getTimezoneOptions() {
  const timezones = [
    // UTC First
    { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
    
    // North America
    { value: 'America/New_York', label: 'Eastern Time (New York)' },
    { value: 'America/Chicago', label: 'Central Time (Chicago)' },
    { value: 'America/Denver', label: 'Mountain Time (Denver)' },
    { value: 'America/Phoenix', label: 'Mountain Time (Phoenix)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (Los Angeles)' },
    { value: 'America/Anchorage', label: 'Alaska Time (Anchorage)' },
    { value: 'Pacific/Honolulu', label: 'Hawaii Time (Honolulu)' },
    
    // Canada
    { value: 'America/St_Johns', label: 'Newfoundland Time (St. Johns)' },
    { value: 'America/Halifax', label: 'Atlantic Time (Halifax)' },
    { value: 'America/Toronto', label: 'Eastern Time (Toronto)' },
    { value: 'America/Winnipeg', label: 'Central Time (Winnipeg)' },
    { value: 'America/Edmonton', label: 'Mountain Time (Edmonton)' },
    { value: 'America/Vancouver', label: 'Pacific Time (Vancouver)' },
    
    // Mexico & Central America
    { value: 'America/Mexico_City', label: 'Central Time (Mexico City)' },
    { value: 'America/Tijuana', label: 'Pacific Time (Tijuana)' },
    { value: 'America/Guatemala', label: 'Central Time (Guatemala)' },
    { value: 'America/Costa_Rica', label: 'Central Time (Costa Rica)' },
    
    // South America
    { value: 'America/Sao_Paulo', label: 'Brazil Time (São Paulo)' },
    { value: 'America/Argentina/Buenos_Aires', label: 'Argentina Time (Buenos Aires)' },
    { value: 'America/Santiago', label: 'Chile Time (Santiago)' },
    { value: 'America/Lima', label: 'Peru Time (Lima)' },
    { value: 'America/Bogota', label: 'Colombia Time (Bogotá)' },
    { value: 'America/Caracas', label: 'Venezuela Time (Caracas)' },
    
    // Europe
    { value: 'Europe/London', label: 'GMT (London)' },
    { value: 'Europe/Dublin', label: 'GMT (Dublin)' },
    { value: 'Europe/Paris', label: 'CET (Paris)' },
    { value: 'Europe/Berlin', label: 'CET (Berlin)' },
    { value: 'Europe/Rome', label: 'CET (Rome)' },
    { value: 'Europe/Madrid', label: 'CET (Madrid)' },
    { value: 'Europe/Amsterdam', label: 'CET (Amsterdam)' },
    { value: 'Europe/Brussels', label: 'CET (Brussels)' },
    { value: 'Europe/Vienna', label: 'CET (Vienna)' },
    { value: 'Europe/Zurich', label: 'CET (Zurich)' },
    { value: 'Europe/Stockholm', label: 'CET (Stockholm)' },
    { value: 'Europe/Oslo', label: 'CET (Oslo)' },
    { value: 'Europe/Copenhagen', label: 'CET (Copenhagen)' },
    { value: 'Europe/Warsaw', label: 'CET (Warsaw)' },
    { value: 'Europe/Prague', label: 'CET (Prague)' },
    { value: 'Europe/Budapest', label: 'CET (Budapest)' },
    { value: 'Europe/Athens', label: 'EET (Athens)' },
    { value: 'Europe/Helsinki', label: 'EET (Helsinki)' },
    { value: 'Europe/Moscow', label: 'MSK (Moscow)' },
    { value: 'Europe/Istanbul', label: 'TRT (Istanbul)' },
    
    // Africa
    { value: 'Africa/Lagos', label: 'WAT (Lagos)' },
    { value: 'Africa/Cairo', label: 'EET (Cairo)' },
    { value: 'Africa/Johannesburg', label: 'SAST (Johannesburg)' },
    { value: 'Africa/Casablanca', label: 'WET (Casablanca)' },
    { value: 'Africa/Nairobi', label: 'EAT (Nairobi)' },
    
    // Middle East
    { value: 'Asia/Dubai', label: 'GST (Dubai)' },
    { value: 'Asia/Riyadh', label: 'AST (Riyadh)' },
    { value: 'Asia/Kuwait', label: 'AST (Kuwait)' },
    { value: 'Asia/Qatar', label: 'AST (Qatar)' },
    { value: 'Asia/Baghdad', label: 'AST (Baghdad)' },
    { value: 'Asia/Tehran', label: 'IRST (Tehran)' },
    { value: 'Asia/Jerusalem', label: 'IST (Jerusalem)' },
    
    // South Asia
    { value: 'Asia/Kolkata', label: 'IST (India)' },
    { value: 'Asia/Karachi', label: 'PKT (Karachi)' },
    { value: 'Asia/Dhaka', label: 'BST (Dhaka)' },
    { value: 'Asia/Colombo', label: 'IST (Colombo)' },
    { value: 'Asia/Kathmandu', label: 'NPT (Kathmandu)' },
    
    // Southeast Asia
    { value: 'Asia/Bangkok', label: 'ICT (Bangkok)' },
    { value: 'Asia/Jakarta', label: 'WIB (Jakarta)' },
    { value: 'Asia/Singapore', label: 'SGT (Singapore)' },
    { value: 'Asia/Kuala_Lumpur', label: 'MYT (Kuala Lumpur)' },
    { value: 'Asia/Manila', label: 'PST (Manila)' },
    { value: 'Asia/Ho_Chi_Minh', label: 'ICT (Ho Chi Minh City)' },
    
    // East Asia
    { value: 'Asia/Shanghai', label: 'CST (Shanghai)' },
    { value: 'Asia/Hong_Kong', label: 'HKT (Hong Kong)' },
    { value: 'Asia/Taipei', label: 'CST (Taipei)' },
    { value: 'Asia/Tokyo', label: 'JST (Tokyo)' },
    { value: 'Asia/Seoul', label: 'KST (Seoul)' },
    
    // Central Asia
    { value: 'Asia/Almaty', label: 'ALMT (Almaty)' },
    { value: 'Asia/Tashkent', label: 'UZT (Tashkent)' },
    { value: 'Asia/Yekaterinburg', label: 'YEKT (Yekaterinburg)' },
    { value: 'Asia/Novosibirsk', label: 'NOVT (Novosibirsk)' },
    
    // Australia & New Zealand
    { value: 'Australia/Perth', label: 'AWST (Perth)' },
    { value: 'Australia/Darwin', label: 'ACST (Darwin)' },
    { value: 'Australia/Adelaide', label: 'ACDT (Adelaide)' },
    { value: 'Australia/Brisbane', label: 'AEST (Brisbane)' },
    { value: 'Australia/Sydney', label: 'AEDT (Sydney)' },
    { value: 'Australia/Melbourne', label: 'AEDT (Melbourne)' },
    { value: 'Australia/Hobart', label: 'AEDT (Hobart)' },
    { value: 'Pacific/Auckland', label: 'NZDT (Auckland)' },
    
    // Pacific Islands
    { value: 'Pacific/Fiji', label: 'FJT (Fiji)' },
    { value: 'Pacific/Guam', label: 'ChST (Guam)' },
    { value: 'Pacific/Tahiti', label: 'TAHT (Tahiti)' },
    { value: 'Pacific/Samoa', label: 'SST (Samoa)' },
  ];

  // Add GMT offset to each timezone label and remove duplicates
  const timezonesWithGMT = timezones
    .map(timezone => {
      const gmtOffset = getGMTOffset(timezone.value);
      // Skip invalid timezones (getGMTOffset returns null for invalid ones)
      if (gmtOffset === null) {
        console.log(`Skipping invalid timezone: ${timezone.value}`);
        return null;
      }
      return {
        ...timezone,
        label: `${timezone.label} ${gmtOffset}`,
      };
    })
    .filter((timezone): timezone is NonNullable<typeof timezone> => timezone !== null);

  // Remove duplicates by value (in case any accidentally got added)
  const uniqueTimezones = timezonesWithGMT.filter((timezone, index, self) => 
    index === self.findIndex(t => t.value === timezone.value)
  );

  return uniqueTimezones;
}

/**
 * Get user's current timezone
 */
export function getUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'UTC';
  }
}

/**
 * Simple timezone conversion for working hours
 * Converts a time from professional's timezone to client's timezone
 */
export function convertTimeToClientTimezone(
  timeString: string, // Format: "HH:mm"
  professionalTimezone: string,
  clientTimezone: string,
  targetDate: Date = new Date()
): { time: string; dayOffset: number } {
  try {
    // Create a date object for the time in the professional's timezone
    const baseDate = new Date(targetDate);
    baseDate.setHours(0, 0, 0, 0);
    
    const timeParts = timeString.split(':');
    const hours = parseInt(timeParts[0] || '0', 10);
    const minutes = parseInt(timeParts[1] || '0', 10);
    baseDate.setHours(hours, minutes, 0, 0);
    
    // Convert to professional's timezone first (this gives us the actual moment in time)
    const timeInProfTz = fromZonedTime(baseDate, professionalTimezone);
    
    // Convert to client's timezone
    const timeInClientTz = toZonedTime(timeInProfTz, clientTimezone);
    
    // Calculate day offset (how many days the time shifted)
    const originalDay = baseDate.getDate();
    const convertedDay = timeInClientTz.getDate();
    const dayOffset = convertedDay - originalDay;
    
    return {
      time: format(timeInClientTz, 'HH:mm'),
      dayOffset
    };
  } catch (error) {
    console.error('Error converting time:', error);
    return { time: timeString, dayOffset: 0 };
  }
}

/**
 * Convert working hours from professional's timezone to client's timezone
 * Returns working hours with times converted to client's timezone and properly split across days
 */
export function convertWorkingHoursToClientTimezone(
  professionalHours: TimezoneAwareWorkingHours,
  clientTimezone: string,
  targetDate: Date = new Date()
): TimezoneAwareWorkingHours {
  // If timezones are the same, no conversion needed
  if (professionalHours.timezone === clientTimezone) {
    return professionalHours;
  }

  const dayOrder = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const resultHours: Array<{
    day: string;
    enabled: boolean;
    startTime: string | null;
    endTime: string | null;
  }> = [];

  // Initialize all days as disabled first
  dayOrder.forEach(day => {
    resultHours.push({
      day,
      enabled: false,
      startTime: null,
      endTime: null
    });
  });

  professionalHours.hours.forEach(dayHours => {
    if (!dayHours.enabled || !dayHours.startTime || !dayHours.endTime) {
      return;
    }

    // Convert start and end times
    const startConversion = convertTimeToClientTimezone(
      dayHours.startTime,
      professionalHours.timezone,
      clientTimezone,
      targetDate
    );
    
    const endConversion = convertTimeToClientTimezone(
      dayHours.endTime,
      professionalHours.timezone,
      clientTimezone,
      targetDate
    );

    // Determine which day(s) this working period covers in the client timezone
    const originalDayIndex = dayOrder.indexOf(dayHours.day.toLowerCase());
    
    if (originalDayIndex === -1) {
      console.error('Unknown day:', dayHours.day);
      return;
    }

    // Check if working hours cross day boundaries
    if (startConversion.dayOffset !== endConversion.dayOffset) {
      // Split across two days
      const startDayIndex = (originalDayIndex + startConversion.dayOffset + 7) % 7;
      const endDayIndex = (originalDayIndex + endConversion.dayOffset + 7) % 7;
      
      const startDayName = dayOrder[startDayIndex];
      const endDayName = dayOrder[endDayIndex];

      if (startDayName) {
        // First part: start time to end of day (23:59)
        const startDayResultIndex = resultHours.findIndex(h => h.day === startDayName);
        if (startDayResultIndex !== -1) {
          resultHours[startDayResultIndex] = {
            day: startDayName,
            enabled: true,
            startTime: startConversion.time,
            endTime: '23:59'
          };
        }
      }

      if (endDayName) {
        // Second part: start of day (00:00) to end time
        const endDayResultIndex = resultHours.findIndex(h => h.day === endDayName);
        if (endDayResultIndex !== -1) {
          resultHours[endDayResultIndex] = {
            day: endDayName,
            enabled: true,
            startTime: '00:00',
            endTime: endConversion.time
          };
        }
      }

    } else {
      // No day crossing, assign to the appropriate day
      const targetDayIndex = (originalDayIndex + startConversion.dayOffset + 7) % 7;
      const targetDayName = dayOrder[targetDayIndex];
      
      if (targetDayName) {
        const targetDayResultIndex = resultHours.findIndex(h => h.day === targetDayName);
        if (targetDayResultIndex !== -1) {
          resultHours[targetDayResultIndex] = {
            day: targetDayName,
            enabled: true,
            startTime: startConversion.time,
            endTime: endConversion.time
          };
        }
      }

    }
  });

  return {
    timezone: clientTimezone,
    hours: resultHours,
  };
}

/**
 * Get available days considering timezone conversion and day boundary crossings
 * This function properly handles when working hours cross midnight after timezone conversion
 */
export function getAvailableDaysWithTimezoneConversion(
  professionalHours: TimezoneAwareWorkingHours,
  clientTimezone: string,
  targetDate: Date = new Date()
): string[] {
  // If timezones are the same, return enabled days as-is
  if (professionalHours.timezone === clientTimezone) {
    return professionalHours.hours
      .filter(dayHours => dayHours.enabled && dayHours.startTime && dayHours.endTime)
      .map(dayHours => dayHours.day);
  }

  const dayOrder = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const availableDays = new Set<string>();

  professionalHours.hours.forEach(dayHours => {
    if (!dayHours.enabled || !dayHours.startTime || !dayHours.endTime) {
      return;
    }

    // Convert start and end times to detect day shifts
    const startConversion = convertTimeToClientTimezone(
      dayHours.startTime,
      professionalHours.timezone,
      clientTimezone,
      targetDate
    );
    
    const endConversion = convertTimeToClientTimezone(
      dayHours.endTime,
      professionalHours.timezone,
      clientTimezone,
      targetDate
    );

    // Determine which day(s) this working period covers in the client timezone
    const originalDayIndex = dayOrder.indexOf(dayHours.day.toLowerCase());
    
    if (originalDayIndex === -1) {
      console.error('Unknown day:', dayHours.day);
      return;
    }

    // Add the day where the working hours start
    const startDayIndex = (originalDayIndex + startConversion.dayOffset + 7) % 7;
    const startDayName = dayOrder[startDayIndex];
    if (startDayName) {
      availableDays.add(startDayName);
    }

    // If end time shifted to a different day, add that day too
    if (endConversion.dayOffset !== startConversion.dayOffset) {
      const endDayIndex = (originalDayIndex + endConversion.dayOffset + 7) % 7;
      const endDayName = dayOrder[endDayIndex];
      if (endDayName) {
        availableDays.add(endDayName);
      }
      
    }
  });

  return Array.from(availableDays);
}

/**
 * Format time for display in a specific timezone
 */
export function formatTimeInTimezone(
  timeString: string,
  timezone: string,
  targetDate: Date = new Date()
): string {
  try {
    const baseDate = new Date(targetDate);
    baseDate.setHours(0, 0, 0, 0);
    
    const time = parse(timeString, 'HH:mm', baseDate);
    if (!isValid(time)) return timeString;

    const timeInTz = toZonedTime(fromZonedTime(time, 'UTC'), timezone);
    return format(timeInTz, 'h:mm a');
  } catch {
    return timeString;
  }
}

/**
 * Format a Date object (like appointment start/end time) in a specific timezone
 */
export function formatDateTimeInTimezone(
  date: Date | string,
  timezone: string,
  dateFormat: string = 'EEEE, MMMM d, yyyy',
  timeFormat: string = 'h:mm a'
): { date: string; time: string; dateTime: string } {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (!isValid(dateObj)) {
      return { 
        date: 'Invalid Date', 
        time: 'Invalid Time', 
        dateTime: 'Invalid DateTime' 
      };
    }

    const zonedDate = toZonedTime(dateObj, timezone);
    
    return {
      date: format(zonedDate, dateFormat),
      time: format(zonedDate, timeFormat),
      dateTime: format(zonedDate, `${dateFormat} 'at' ${timeFormat}`)
    };
  } catch (error) {
    console.error('Error formatting date in timezone:', error);
    return { 
      date: 'Format Error', 
      time: 'Format Error', 
      dateTime: 'Format Error' 
    };
  }
}

/**
 * Check if a day's hours cross midnight when converted to another timezone
 */
export function checkDayBoundaryCrossing(
  dayHours: { startTime: string; endTime: string },
  fromTimezone: string,
  toTimezone: string,
  targetDate: Date = new Date()
): { crossesMidnight: boolean; nextDay: boolean } {
  try {
    const baseDate = new Date(targetDate);
    baseDate.setHours(0, 0, 0, 0);
    
    const startTime = parse(dayHours.startTime, 'HH:mm', baseDate);
    const endTime = parse(dayHours.endTime, 'HH:mm', baseDate);

    if (!isValid(startTime) || !isValid(endTime)) {
      return { crossesMidnight: false, nextDay: false };
    }

    // Convert times to target timezone
    const startTimeUTC = fromZonedTime(startTime, fromTimezone);
    const endTimeUTC = fromZonedTime(endTime, fromTimezone);

    const startTimeInTargetTz = toZonedTime(startTimeUTC, toTimezone);
    const endTimeInTargetTz = toZonedTime(endTimeUTC, toTimezone);

    // Check if the date changed
    const originalDate = baseDate.getDate();
    const convertedStartDate = startTimeInTargetTz.getDate();
    const convertedEndDate = endTimeInTargetTz.getDate();

    const nextDay = convertedStartDate !== originalDate;
    const crossesMidnight = convertedStartDate !== convertedEndDate;

    return { crossesMidnight, nextDay };
  } catch {
    return { crossesMidnight: false, nextDay: false };
  }
}

/**
 * Convert legacy working hours format to timezone-aware format
 */
export function migrateWorkingHoursToTimezoneAware(
  legacyHours: Array<{
    day: string;
    enabled: boolean;
    startTime: string | null;
    endTime: string | null;
  }>,
  timezone: string = 'UTC'
): TimezoneAwareWorkingHours {
  return {
    timezone,
    hours: legacyHours,
  };
}

/**
 * Extract timezone-aware working hours from database JSONB
 */
export function parseWorkingHoursFromDB(
  workingHoursJSON: unknown,
  fallbackTimezone: string = 'UTC'
): TimezoneAwareWorkingHours {
  if (!workingHoursJSON) {
    return {
      timezone: fallbackTimezone,
      hours: [],
    };
  }

  // Check if it's already in the new format
  if (
    typeof workingHoursJSON === 'object' &&
    workingHoursJSON !== null &&
    'timezone' in workingHoursJSON &&
    'hours' in workingHoursJSON
  ) {
    return workingHoursJSON as TimezoneAwareWorkingHours;
  }

  // Handle legacy format (array of hours without timezone)
  if (Array.isArray(workingHoursJSON)) {
    return migrateWorkingHoursToTimezoneAware(workingHoursJSON, fallbackTimezone);
  }

  // Fallback for unexpected formats
  return {
    timezone: fallbackTimezone,
    hours: [],
  };
}

/**
 * Prepare working hours for database storage
 */
export function prepareWorkingHoursForDB(
  hours: Array<{
    day: string;
    enabled: boolean;
    startTime: string | null;
    endTime: string | null;
  }>,
  timezone: string
): TimezoneAwareWorkingHours {
  return {
    timezone,
    hours,
  };
}

 