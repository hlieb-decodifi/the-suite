/**
 * Mock data for booking form
 */

// Available weekdays
export const AVAILABLE_DAYS = ['Monday'];

// Generate time slots from 10 AM to 6 PM in 30-minute intervals
export function getMockTimeSlots(): string[] {
  const timeSlots: string[] = [];

  // Start at 10:00 AM
  for (let hour = 10; hour < 22; hour++) {
    const isPM = hour >= 12;
    const displayHour = hour > 12 ? hour - 12 : hour;

    // Add :00 slot
    timeSlots.push(`${displayHour}:00 ${isPM ? 'PM' : 'AM'}`);

    // Add :30 slot
    timeSlots.push(`${displayHour}:30 ${isPM ? 'PM' : 'AM'}`);
  }

  return timeSlots;
}

// Get mock time slots
export const MOCK_TIME_SLOTS = getMockTimeSlots();
