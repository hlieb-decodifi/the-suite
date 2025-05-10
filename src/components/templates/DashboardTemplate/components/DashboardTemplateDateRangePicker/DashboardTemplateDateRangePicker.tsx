'use client';

import { CalendarIcon } from 'lucide-react';
import {
  format,
  subDays,
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfYear,
  endOfYear,
  subYears,
} from 'date-fns';
import { cn } from '@/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useState, useEffect } from 'react';
import { DateRange } from 'react-day-picker';
import { Typography } from '@/components/ui/typography';

export type DashboardTemplateDateRangePickerProps = {
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange) => void;
  className?: string;
};

type DatePreset = {
  name: string;
  range: () => DateRange;
};

// Define date presets for quick selection
const getDatePresets = (): DatePreset[] => [
  {
    name: 'Today',
    range: () => ({
      from: new Date(),
      to: new Date(),
    }),
  },
  {
    name: 'Last 7 days',
    range: () => ({
      from: subDays(new Date(), 6),
      to: new Date(),
    }),
  },
  {
    name: 'Last 30 days',
    range: () => ({
      from: subDays(new Date(), 29),
      to: new Date(),
    }),
  },
  {
    name: 'This month',
    range: () => ({
      from: startOfMonth(new Date()),
      to: endOfMonth(new Date()),
    }),
  },
  {
    name: 'Last month',
    range: () => {
      const date = subMonths(new Date(), 1);
      return {
        from: startOfMonth(date),
        to: endOfMonth(date),
      };
    },
  },
  {
    name: 'This year',
    range: () => ({
      from: startOfYear(new Date()),
      to: endOfYear(new Date()),
    }),
  },
  {
    name: 'Last year',
    range: () => {
      const date = subYears(new Date(), 1);
      return {
        from: startOfYear(date),
        to: endOfYear(date),
      };
    },
  },
];

// Component for the presets sidebar
function DateRangePresets({
  onSelectPreset,
}: {
  onSelectPreset: (range: DateRange) => void;
}) {
  const datePresets = getDatePresets();

  return (
    <div className="border-r p-2 flex flex-col space-y-2 min-w-[150px] bg-muted/20">
      <Typography className="px-2 py-1 text-sm font-medium">Presets</Typography>
      {datePresets.map((preset) => (
        <Button
          key={preset.name}
          variant="ghost"
          size="sm"
          className="justify-start text-left"
          onClick={() => onSelectPreset(preset.range())}
        >
          {preset.name}
        </Button>
      ))}
    </div>
  );
}

// Component for the calendar footer
function CalendarFooter({
  dateRange,
  onClear,
  onApply,
}: {
  dateRange: DateRange | undefined;
  onClear: () => void;
  onApply: () => void;
}) {
  return (
    <div className="flex items-center justify-between p-3 border-t">
      <Typography variant="small" className="text-muted-foreground">
        {dateRange?.from && dateRange?.to ? (
          <>
            {format(dateRange.from, 'PPP')} - {format(dateRange.to, 'PPP')}
          </>
        ) : (
          'Please select a date range'
        )}
      </Typography>
      <div className="flex space-x-2">
        <Button variant="ghost" size="sm" onClick={onClear}>
          Clear
        </Button>
        <Button size="sm" onClick={onApply}>
          Apply
        </Button>
      </div>
    </div>
  );
}

// Button content component to display the selected date range or placeholder
function DateRangeDisplay({ dateRange }: { dateRange: DateRange | undefined }) {
  return (
    <>
      <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
      {dateRange?.from ? (
        dateRange.to ? (
          <>
            {format(dateRange.from, 'LLL dd, y')} -{' '}
            {format(dateRange.to, 'LLL dd, y')}
          </>
        ) : (
          format(dateRange.from, 'LLL dd, y')
        )
      ) : (
        <span>Filter by date range</span>
      )}
    </>
  );
}

// Calendar content component
function DatePickerContent({
  localDateRange,
  handleSelect,
  handleClear,
  handleApply,
  handleSelectPreset,
}: {
  localDateRange: DateRange | undefined;
  handleSelect: (range: DateRange | undefined) => void;
  handleClear: () => void;
  handleApply: () => void;
  handleSelectPreset: (range: DateRange) => void;
}) {
  return (
    <PopoverContent className="w-auto p-0 flex" align="end">
      <DateRangePresets onSelectPreset={handleSelectPreset} />
      <div>
        <Calendar
          initialFocus
          mode="range"
          defaultMonth={localDateRange?.from ?? new Date()}
          selected={localDateRange}
          onSelect={handleSelect}
          numberOfMonths={2}
          disabled={{ before: new Date(2000, 0, 1) }}
        />
        <CalendarFooter
          dateRange={localDateRange}
          onClear={handleClear}
          onApply={handleApply}
        />
      </div>
    </PopoverContent>
  );
}

export function DashboardTemplateDateRangePicker({
  dateRange,
  onDateRangeChange,
  className,
}: DashboardTemplateDateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [localDateRange, setLocalDateRange] = useState<DateRange | undefined>(
    dateRange,
  );

  // Update local state when props change
  useEffect(() => {
    setLocalDateRange(dateRange);
  }, [dateRange]);

  // Handle selection of a preset
  const handleSelectPreset = (range: DateRange) => {
    setLocalDateRange(range);
    onDateRangeChange(range);
    setIsOpen(false);
  };

  // Handle calendar selection
  const handleSelect = (range: DateRange | undefined) => {
    if (range) {
      setLocalDateRange(range);
    }
  };

  // Handle apply button click
  const handleApply = () => {
    if (localDateRange) {
      onDateRangeChange(localDateRange);
    }
    setIsOpen(false);
  };

  // Handle clear button click
  const handleClear = () => {
    const emptyRange = { from: undefined, to: undefined };
    setLocalDateRange(emptyRange);
    onDateRangeChange(emptyRange);
  };

  return (
    <div className={cn('grid gap-2', className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant="outline"
            className={cn(
              'w-full justify-start text-left font-normal border-primary/20 bg-primary/5',
              !dateRange && 'text-muted-foreground',
            )}
          >
            <DateRangeDisplay dateRange={dateRange} />
          </Button>
        </PopoverTrigger>

        <DatePickerContent
          localDateRange={localDateRange}
          handleSelect={handleSelect}
          handleClear={handleClear}
          handleApply={handleApply}
          handleSelectPreset={handleSelectPreset}
        />
      </Popover>
    </div>
  );
}
