/**
 * Utility functions for appointment time calculations
 */

/**
 * Calculate the appointment end time based on start time and total duration
 * @param startTime - The appointment start time (ISO string)
 * @param totalDurationMinutes - Total duration of all services in minutes
 * @returns Object with start datetime, end datetime, and capture schedule
 */
export function calculateAppointmentTimes(
  startTime: string,
  totalDurationMinutes: number,
): {
  appointmentStart: Date;
  appointmentEnd: Date;
  captureScheduledFor: Date;
} {
  // Parse the ISO string to Date
  const appointmentStart = new Date(startTime);

  // Add total duration to get end time
  const appointmentEnd = new Date(
    appointmentStart.getTime() + totalDurationMinutes * 60 * 1000,
  );

  // Add 12 hours to end time for capture schedule
  const captureScheduledFor = new Date(
    appointmentEnd.getTime() + 12 * 60 * 60 * 1000,
  );

  return {
    appointmentStart,
    appointmentEnd,
    captureScheduledFor,
  };
}

/**
 * Calculate total duration from booking services
 * @param services - Array of services with duration property
 * @returns Total duration in minutes
 */
export function calculateTotalDuration(
  services: { duration: number }[],
): number {
  return services.reduce((sum, service) => sum + service.duration, 0);
}
