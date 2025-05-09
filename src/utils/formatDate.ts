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