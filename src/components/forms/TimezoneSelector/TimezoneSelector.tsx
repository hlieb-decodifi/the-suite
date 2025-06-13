'use client';

import { useState, useEffect } from 'react';
import TimezoneSelect, {
  type ITimezone,
  allTimezones,
} from 'react-timezone-select';
import { getUserTimezone } from '@/utils/timezone';
import { cn } from '@/utils/cn';

export type TimezoneSelectorProps = {
  value: string;
  onChange: (timezone: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
};

export function TimezoneSelector({
  value,
  onChange,
  disabled = false,
  placeholder = 'Select timezone...',
  className,
}: TimezoneSelectorProps) {
  const [selectedTimezone, setSelectedTimezone] = useState<ITimezone>(
    value || '',
  );

  // Update selected timezone when value prop changes
  useEffect(() => {
    setSelectedTimezone(value || '');
  }, [value]);

  const handleTimezoneChange = (timezone: ITimezone) => {
    setSelectedTimezone(timezone);
    // Extract timezone string from the ITimezone object
    const timezoneString =
      typeof timezone === 'string' ? timezone : timezone.value;
    onChange(timezoneString);
  };

  // Get user's timezone for prioritization
  const userTimezone = getUserTimezone();

  // Create custom timezone options with user's timezone prioritized
  const customTimezones = {
    ...allTimezones,
    // Add user's timezone with special label if it's not already selected
    ...(userTimezone && userTimezone !== value && userTimezone !== 'UTC'
      ? {
          [userTimezone]: `${allTimezones[userTimezone] || userTimezone} (Your Location)`,
        }
      : {}),
  };

  return (
    <div className={cn('w-full relative', className)}>
      <TimezoneSelect
        value={selectedTimezone}
        onChange={handleTimezoneChange}
        isDisabled={disabled}
        placeholder={placeholder}
        timezones={customTimezones}
        labelStyle="original" // Shows full timezone names with GMT offsets
        displayValue="GMT" // Use GMT instead of UTC for consistency
        autoFocus={false} // Prevent auto-focus when rendered
        openMenuOnFocus={false} // Prevent menu opening when focused
        blurInputOnSelect={true} // Blur input after selection
        styles={{
          control: (provided, state) => ({
            ...provided,
            borderColor: state.isFocused
              ? 'hsl(var(--ring))'
              : 'hsl(var(--border))',
            boxShadow: state.isFocused
              ? '0 0 0 2px hsl(var(--ring) / 0.2)'
              : 'none',
            '&:hover': {
              borderColor: 'hsl(var(--border))',
            },
            backgroundColor: 'hsl(var(--background))',
            color: 'hsl(var(--foreground))',
            borderRadius: 'calc(var(--radius) - 2px)',
            minHeight: '40px',
            fontSize: '14px',
          }),
          menu: (provided) => ({
            ...provided,
            backgroundColor: 'hsl(var(--popover))',
            border: '1px solid hsl(var(--border))',
            borderRadius: 'calc(var(--radius) - 2px)',
            boxShadow:
              '0 10px 38px -10px rgba(22, 23, 24, 0.35), 0 10px 20px -15px rgba(22, 23, 24, 0.2)',
            zIndex: 9999,
            position: 'absolute',
          }),
          menuList: (provided) => ({
            ...provided,
            maxHeight: '300px',
            padding: '4px',
            '&::-webkit-scrollbar': {
              width: '8px',
            },
            '&::-webkit-scrollbar-track': {
              background: 'hsl(var(--muted))',
              borderRadius: '4px',
            },
            '&::-webkit-scrollbar-thumb': {
              background: 'hsl(var(--muted-foreground) / 0.3)',
              borderRadius: '4px',
            },
            '&::-webkit-scrollbar-thumb:hover': {
              background: 'hsl(var(--muted-foreground) / 0.5)',
            },
          }),
          option: (provided, state) => ({
            ...provided,
            backgroundColor: state.isSelected
              ? 'hsl(var(--accent))'
              : state.isFocused
                ? 'hsl(var(--accent) / 0.1)'
                : 'transparent',
            color: state.isSelected
              ? 'hsl(var(--accent-foreground))'
              : 'hsl(var(--foreground))',
            '&:hover': {
              backgroundColor: 'hsl(var(--accent) / 0.1)',
            },
            cursor: 'pointer',
            fontSize: '14px',
            padding: '8px 12px',
            borderRadius: '4px',
            margin: '2px 0',
          }),
          input: (provided) => ({
            ...provided,
            color: 'hsl(var(--foreground))',
          }),
          placeholder: (provided) => ({
            ...provided,
            color: 'hsl(var(--muted-foreground))',
          }),
          singleValue: (provided) => ({
            ...provided,
            color: 'hsl(var(--foreground))',
          }),
          dropdownIndicator: (provided) => ({
            ...provided,
            color: 'hsl(var(--muted-foreground))',
            '&:hover': {
              color: 'hsl(var(--foreground))',
            },
          }),
          clearIndicator: (provided) => ({
            ...provided,
            color: 'hsl(var(--muted-foreground))',
            '&:hover': {
              color: 'hsl(var(--foreground))',
            },
          }),
        }}
        menuPlacement="bottom"
        isSearchable={true}
        isClearable={false}
      />
    </div>
  );
}
