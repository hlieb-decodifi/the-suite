import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

// Types
type WorkingHoursEntry = {
  day: string;
  enabled: boolean;
  startTime: string | null;
  endTime: string | null;
};

// Default fallback time slots
const DEFAULT_TIME_SLOTS = [
  '9:00 AM',
  '10:00 AM',
  '11:00 AM',
  '1:00 PM',
  '2:00 PM',
  '3:00 PM',
];

// Default working days
const DEFAULT_WORKING_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

// Helper function to generate time slots based on start and end hours
function generateTimeSlots(startHour: number, endHour: number): string[] {
  const slots = [];
  for (let hour = startHour; hour < endHour; hour++) {
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    slots.push(`${displayHour}:00 ${ampm}`);
  }
  return slots;
}

// Helper to parse time string to hour
function parseTimeToHour(timeString: string | null): number | null {
  if (!timeString) return null;
  
  const parts = timeString.split(':');
  if (parts.length < 2) return null;
  
  // Ensure we're parsing a string not undefined
  const hourStr = parts[0] || '';
  const hour = parseInt(hourStr);
  return isNaN(hour) ? null : hour;
}

// Fetch working days from professional profile
async function fetchWorkingDays(professionalId: string): Promise<string[]> {
  try {
    const supabase = createClient();
    const { data: professionalData, error } = await supabase
      .from('professional_profiles')
      .select('working_hours')
      .eq('user_id', professionalId)
      .single();

    if (error || !professionalData?.working_hours) {
      console.error('Error fetching professional hours:', error);
      return DEFAULT_WORKING_DAYS;
    }

    // Parse working hours from JSON
    const workingHours = professionalData.working_hours as WorkingHoursEntry[];
    
    // Find all enabled days
    const enabledDays = workingHours
      .filter(day => day.enabled && day.startTime && day.endTime)
      .map(day => day.day);

    return enabledDays.length > 0 ? enabledDays : DEFAULT_WORKING_DAYS;
  } catch (error) {
    console.error('Error processing working hours:', error);
    return DEFAULT_WORKING_DAYS;
  }
}

// Fetch time slots for a specific day
async function fetchTimeSlotsForDay(
  professionalId: string, 
  dayOfWeek: string
): Promise<string[]> {
  try {
    const supabase = createClient();
    const { data: professionalData, error } = await supabase
      .from('professional_profiles')
      .select('working_hours')
      .eq('user_id', professionalId)
      .single();

    if (error || !professionalData?.working_hours) {
      console.error('Error fetching professional hours:', error);
      return DEFAULT_TIME_SLOTS;
    }

    // Parse working hours from JSON
    const workingHours = professionalData.working_hours as WorkingHoursEntry[];

    // Find the working hours for the selected day
    const dayHours = workingHours.find(
      (hours) => hours.day === dayOfWeek && hours.enabled
    );

    if (!dayHours) {
      // Professional doesn't work on this day
      return [];
    }

    // Parse hours
    const startHour = parseTimeToHour(dayHours.startTime);
    const endHour = parseTimeToHour(dayHours.endTime);

    if (!startHour || !endHour) {
      return DEFAULT_TIME_SLOTS;
    }

    // Generate time slots
    return generateTimeSlots(startHour, endHour);
  } catch (error) {
    console.error('Error processing time slots:', error);
    return DEFAULT_TIME_SLOTS;
  }
}

/**
 * Hook to fetch and process available time slots for a professional
 */
export function useTimeSlots(professionalId?: string, selectedDate?: Date) {
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);
  const [availableDays, setAvailableDays] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch available working days
  useEffect(() => {
    async function loadWorkingDays() {
      if (!professionalId) {
        setAvailableDays([]);
        return;
      }

      setIsLoading(true);
      const days = await fetchWorkingDays(professionalId);
      setAvailableDays(days);
      setIsLoading(false);
    }

    loadWorkingDays();
  }, [professionalId]);

  // Generate time slots when date changes
  useEffect(() => {
    async function loadTimeSlots() {
      if (!professionalId || !selectedDate) {
        setAvailableTimeSlots([]);
        return;
      }

      setIsLoading(true);
      
      const dayOfWeek = new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
      }).format(selectedDate);

      const slots = await fetchTimeSlotsForDay(professionalId, dayOfWeek);
      setAvailableTimeSlots(slots);
      
      setIsLoading(false);
    }

    loadTimeSlots();
  }, [professionalId, selectedDate]);

  return { availableTimeSlots, availableDays, isLoading };
} 