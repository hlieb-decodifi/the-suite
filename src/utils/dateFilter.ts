/**
 * Date filtering utilities for creating inclusive date ranges
 * Used across admin and dashboard pages for consistent date filtering behavior
 */

/**
 * Converts a date string to the start of day in UTC (00:00:00.000)
 * @param dateString - Date string in YYYY-MM-DD format
 * @returns ISO string representing start of day in UTC
 */
export function toStartOfDayUTC(dateString: string): string {
  const date = new Date(dateString);
  date.setUTCHours(0, 0, 0, 0);
  return date.toISOString();
}

/**
 * Converts a date string to the end of day in UTC (23:59:59.999)
 * @param dateString - Date string in YYYY-MM-DD format
 * @returns ISO string representing end of day in UTC
 */
export function toEndOfDayUTC(dateString: string): string {
  const date = new Date(dateString);
  date.setUTCHours(23, 59, 59, 999);
  return date.toISOString();
}

/**
 * Apply inclusive date range filters to a Supabase query
 * This ensures that records created on both the start and end dates are included
 * 
 * @param query - Supabase query builder instance
 * @param fieldName - Name of the date/timestamp field to filter on (e.g., 'created_at', 'start_time')
 * @param startDate - Optional start date in YYYY-MM-DD format (inclusive)
 * @param endDate - Optional end date in YYYY-MM-DD format (inclusive)
 * @returns Modified query with date filters applied
 * 
 * @example
 * ```typescript
 * let query = supabase.from('bookings').select('*');
 * query = applyDateRangeFilter(query, 'created_at', '2025-12-01', '2025-12-31');
 * // Will include all records from 2025-12-01 00:00:00 to 2025-12-31 23:59:59.999
 * ```
 */
export function applyDateRangeFilter<T>(
  query: T,
  fieldName: string,
  startDate?: string,
  endDate?: string,
): T {
  let modifiedQuery = query;

  if (startDate) {
    // Set to start of day (00:00:00) to include the entire start date
    const startISO = toStartOfDayUTC(startDate);
    // @ts-expect-error - Supabase query types are complex, using any here is acceptable
    modifiedQuery = modifiedQuery.gte(fieldName, startISO);
  }

  if (endDate) {
    // Set to end of day (23:59:59.999) to include the entire end date
    const endISO = toEndOfDayUTC(endDate);
    // @ts-expect-error - Supabase query types are complex, using any here is acceptable
    modifiedQuery = modifiedQuery.lte(fieldName, endISO);
  }

  return modifiedQuery;
}

/**
 * Get inclusive date range values for manual filtering
 * Useful when you need the actual ISO strings for custom logic
 * 
 * @param startDate - Optional start date in YYYY-MM-DD format
 * @param endDate - Optional end date in YYYY-MM-DD format
 * @returns Object with start and end ISO strings (or undefined if not provided)
 * 
 * @example
 * ```typescript
 * const { start, end } = getInclusiveDateRange('2025-12-01', '2025-12-31');
 * // start: "2025-12-01T00:00:00.000Z"
 * // end: "2025-12-31T23:59:59.999Z"
 * ```
 */
export function getInclusiveDateRange(
  startDate?: string,
  endDate?: string,
): {
  start: string | undefined;
  end: string | undefined;
} {
  return {
    start: startDate ? toStartOfDayUTC(startDate) : undefined,
    end: endDate ? toEndOfDayUTC(endDate) : undefined,
  };
}

