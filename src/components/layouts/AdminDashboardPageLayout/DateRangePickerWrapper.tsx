'use client';
import { DateRangePicker } from '@/components/common/DateRangePicker/DateRangePicker';
import { useDateRange } from './DateRangeContextProvider';
import { formatDateLocalYYYYMMDD } from '@/utils/formatDate';

// Helper to parse YYYY-MM-DD as local date
function parseLocalDate(dateString: string) {
  const [yearStr, monthStr, dayStr] = dateString.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
}

export function DateRangePickerWrapper() {
  const { start, end, setDateRange } = useDateRange();
  const dateRange =
    start && end
      ? { from: parseLocalDate(start), to: parseLocalDate(end) }
      : undefined;
  return (
    <DateRangePicker
      dateRange={dateRange}
      onDateRangeChange={(range) =>
        setDateRange(
          range?.from ? formatDateLocalYYYYMMDD(range.from) : undefined,
          range?.to ? formatDateLocalYYYYMMDD(range.to) : undefined,
        )
      }
    />
  );
}
