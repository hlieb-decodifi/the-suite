'use client';

import { ServiceListItem } from '@/components/templates/ServicesTemplate/types';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar } from '@/components/ui/calendar';
import { Typography } from '@/components/ui/typography';
import { cn } from '@/utils';
import { formatDuration } from '@/utils/formatDuration';
import { AlertTriangle, Clock } from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';

type TimeSlot = {
  id: string;
  time: string;
  minutes: number;
  isSelected: boolean;
  isDisabled: boolean;
  isHighlighted: boolean;
};

// Add new ValidationStatus type for time slot validation
type ValidationStatus = {
  isValid: boolean;
  message: string | null;
  type: 'info' | 'warning' | 'error' | 'success' | null;
};

export type BookingFormDateTimePickerProps = {
  selectedDate: Date | undefined;
  onSelectDate: (date: Date | undefined) => void;
  availableDays: string[];
  availableTimeSlots: string[] | undefined;
  selectedTimeSlot: string | undefined;
  onSelectTimeSlot: (timeSlot: string) => void;
  service: ServiceListItem;
  selectedExtraServices: ServiceListItem[];
  isLoading?: boolean;
  isCalendarLoading?: boolean;
  professionalTimezone?: string | undefined;
  clientTimezone?: string | undefined;
};

// Time slots rendering component
function TimeSlotsPicker({
  timeSlots,
  onSelectTimeSlot,
}: {
  timeSlots: TimeSlot[];
  onSelectTimeSlot: (slot: TimeSlot) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-1.5 overflow-y-auto p-1">
      {timeSlots.map((slot) => (
        <button
          key={slot.id}
          type="button"
          onClick={() => onSelectTimeSlot(slot)}
          disabled={slot.isDisabled}
          className={cn(
            'text-sm font-medium px-2 py-1.5 rounded-md border transition-colors',
            slot.isSelected
              ? 'bg-primary text-primary-foreground border-primary'
              : slot.isHighlighted
                ? 'bg-primary/20 text-primary border-primary/30'
                : 'bg-background hover:bg-muted/10',
            slot.isDisabled && 'opacity-50 cursor-not-allowed',
          )}
        >
          {slot.time}
        </button>
      ))}
    </div>
  );
}

// Helper function to convert time string to minutes
function timeToMinutes(timeString: string): number {
  const parts = timeString.split(' ');
  if (parts.length !== 2) return 0;

  const [time, period] = parts;
  if (!time || !period) return 0;

  const timeParts = time.split(':');
  if (timeParts.length !== 2) return 0;

  const [hourStr, minuteStr] = timeParts;
  if (!hourStr || !minuteStr) return 0;

  let hour = parseInt(hourStr, 10);
  const minute = parseInt(minuteStr, 10);

  // Convert to 24-hour format
  if (period.toLowerCase() === 'pm' && hour < 12) hour += 12;
  if (period.toLowerCase() === 'am' && hour === 12) hour = 0;

  return hour * 60 + minute;
}

// Helper function to check basic validation conditions
function checkBasicValidation(
  timeSlots: TimeSlot[],
  selectedIndex: number,
): ValidationStatus | null {
  // If no time slot selected
  if (selectedIndex === -1) {
    return {
      isValid: true,
      message: null,
      type: null,
    };
  }

  // If no slots available
  if (timeSlots.length === 0) {
    return {
      isValid: false,
      message: 'No time slots available for this date.',
      type: 'warning',
    };
  }

  // Get the selected slot and verify it exists
  const selectedSlot = timeSlots[selectedIndex];
  if (!selectedSlot) {
    return {
      isValid: false,
      message: 'Selected time slot is no longer available.',
      type: 'error',
    };
  }

  // If all basic checks pass, return null to continue validation
  return null;
}

// Function to find consecutive needed slots
function findConsecutiveSlots(
  timeSlots: TimeSlot[],
  selectedIndex: number,
  requiredSlots: number,
): { neededSlots: TimeSlot[]; gapFound: boolean } {
  const selectedSlot = timeSlots[selectedIndex];
  if (!selectedSlot) {
    return { neededSlots: [], gapFound: false };
  }

  const neededSlots: TimeSlot[] = [selectedSlot];
  let prevSlotMinutes = selectedSlot.minutes;
  let gapFound = false;

  // Check consecutive slots
  for (
    let i = selectedIndex + 1;
    i < timeSlots.length && neededSlots.length < requiredSlots;
    i++
  ) {
    const currentSlot = timeSlots[i];
    if (!currentSlot) continue;

    if (currentSlot.minutes - prevSlotMinutes > 30) {
      gapFound = true;
      break;
    }

    neededSlots.push(currentSlot);
    prevSlotMinutes = currentSlot.minutes;
  }

  return { neededSlots, gapFound };
}

// Function to check if a service fits within professional's hours
function validateTimeSlotSelection(
  timeSlots: TimeSlot[],
  selectedIndex: number,
  requiredSlots: number,
): ValidationStatus {
  // Run basic validation first
  const basicValidation = checkBasicValidation(timeSlots, selectedIndex);
  if (basicValidation) return basicValidation;

  // Find consecutive slots
  const { neededSlots, gapFound } = findConsecutiveSlots(
    timeSlots,
    selectedIndex,
    requiredSlots,
  );

  // Check if we have enough slots
  if (neededSlots.length < requiredSlots) {
    if (gapFound) {
      return {
        isValid: false,
        message: `This service requires ${formatDuration(requiredSlots * 30)} and can't be scheduled due to a gap in availability.`,
        type: 'error',
      };
    }
    return {
      isValid: false,
      message: `This service requires ${formatDuration(requiredSlots * 30)} but there's not enough time available at the end of the day.`,
      type: 'error',
    };
  }

  // Last slot in the needed slots array should exist if we made it this far
  const lastSlot = neededSlots[neededSlots.length - 1];
  if (!lastSlot) {
    return {
      isValid: false,
      message: 'Error calculating service end time.',
      type: 'error',
    };
  }

  // If we got here, the selection is valid
  return {
    isValid: true,
    message: `This service will take ${formatDuration(requiredSlots * 30)}, ending at ${lastSlot.time}.`,
    type: 'info',
  };
}

// Function to disable time slots that don't have enough consecutive availability
function disableInvalidTimeSlots(
  timeSlots: TimeSlot[],
  requiredSlots: number,
): TimeSlot[] {
  const updatedSlots = [...timeSlots];

  // For each slot, check if there are enough consecutive slots after it
  for (let i = 0; i < updatedSlots.length; i++) {
    // Count available consecutive slots starting from this one
    let availableConsecutiveSlots = 1;
    let lastMinutes = updatedSlots[i]?.minutes || 0;

    for (let j = i + 1; j < updatedSlots.length; j++) {
      const currentSlot = updatedSlots[j];
      // Skip if slot is undefined
      if (!currentSlot) continue;

      // Check if this slot is consecutive (within 30 min of the previous one)
      if (currentSlot.minutes - lastMinutes <= 30) {
        availableConsecutiveSlots++;
        lastMinutes = currentSlot.minutes;
      } else {
        break; // Gap found, stop counting
      }
    }

    // If there aren't enough consecutive slots, disable this slot
    if (availableConsecutiveSlots < requiredSlots && updatedSlots[i]) {
      updatedSlots[i]!.isDisabled = true;
    }
  }

  return updatedSlots;
}

// Function to highlight selected time slots
function highlightSelectedTimeSlots(
  timeSlots: TimeSlot[],
  selectedIndex: number,
  requiredSlots: number,
): TimeSlot[] {
  const updatedSlots = [...timeSlots];

  // If no selection, return as is
  if (selectedIndex < 0) return updatedSlots;

  // Mark slots that would be occupied by the service
  for (let i = 0; i < updatedSlots.length; i++) {
    // Skip if this slot is outside the service duration window
    if (i < selectedIndex || i >= selectedIndex + requiredSlots) {
      continue;
    }

    // Skip if slot is undefined
    if (!updatedSlots[i]) continue;

    // Check continuity - first slot is always continuous
    let isContinuous = i === selectedIndex;

    // For subsequent slots, check gap with previous slot
    if (!isContinuous && i > 0 && i > selectedIndex) {
      const currentSlot = updatedSlots[i];
      const prevSlot = updatedSlots[i - 1];

      // Only if both exist and the gap is reasonable
      if (currentSlot && prevSlot) {
        isContinuous = currentSlot.minutes - prevSlot.minutes <= 30;
      }
    }

    if (isContinuous) {
      updatedSlots[i]!.isHighlighted = true;
    }
  }

  return updatedSlots;
}

// Enhanced time slots processing with validation
function useProcessedTimeSlots(
  availableTimeSlots: string[] | undefined,
  selectedDate: Date | undefined,
  selectedTimeSlot: string | undefined,
  requiredSlots: number,
): {
  timeSlots: TimeSlot[];
  validationStatus: ValidationStatus;
} {
  return useMemo(() => {
    // Handle case when no time slots or date is selected
    if (!availableTimeSlots || !selectedDate) {
      return {
        timeSlots: [],
        validationStatus: {
          isValid: true,
          message: null,
          type: null,
        },
      };
    }

    // Check if service duration exceeds all available slots
    if (requiredSlots > availableTimeSlots.length) {
      return {
        timeSlots: [],
        validationStatus: {
          isValid: false,
          message: `This service requires ${formatDuration(requiredSlots * 30)}, but the professional doesn't have enough available time slots.`,
          type: 'error',
        },
      };
    }

    // Create indexed time slots
    const indexedSlots = availableTimeSlots.map((slot) => ({
      id: slot,
      time: slot,
      minutes: timeToMinutes(slot),
      isSelected: slot === selectedTimeSlot,
      isDisabled: false,
      isHighlighted: false,
    }));

    // Sort slots by time
    indexedSlots.sort((a, b) => a.minutes - b.minutes);

    // Find selected slot index
    const selectedIndex = indexedSlots.findIndex((slot) => slot.isSelected);

    // Disable slots that don't have enough consecutive availability
    const disabledSlots = disableInvalidTimeSlots(indexedSlots, requiredSlots);

    // Highlight slots based on service duration
    const processedSlots = highlightSelectedTimeSlots(
      disabledSlots,
      selectedIndex,
      requiredSlots,
    );

    // Validate the current selection
    const validationStatus = validateTimeSlotSelection(
      processedSlots,
      selectedIndex,
      requiredSlots,
    );

    return {
      timeSlots: processedSlots,
      validationStatus,
    };
  }, [availableTimeSlots, selectedDate, selectedTimeSlot, requiredSlots]);
}

// DatePicker subcomponent
function DatePickerSection({
  selectedDate,
  onSelectDate,
  availableDays,
  isLoading,
}: {
  selectedDate: Date | undefined;
  onSelectDate: (date: Date | undefined) => void;
  availableDays: string[];
  isLoading?: boolean;
}) {
  // Use local state to track selected date
  const [localSelectedDate, setLocalSelectedDate] = useState<Date | undefined>(
    selectedDate,
  );

  // Sync with parent state when parent state changes
  useEffect(() => {
    if (selectedDate !== localSelectedDate) {
      setLocalSelectedDate(selectedDate);
    }
  }, [selectedDate]);

  // Handle local date selection
  const handleDateSelect = (date: Date | undefined) => {
    setLocalSelectedDate(date);
    onSelectDate(date);
  };

  // Convert day names to day numbers for calendar logic
  const dayNameToNumber = (dayName: string): number => {
    const days = [
      'sunday',
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
    ];
    const index = days.findIndex((day) => day === dayName.toLowerCase());
    return index !== -1 ? index : -1;
  };

  // Convert available day names to day numbers
  const availableDayNumbers = useMemo(() => {
    return availableDays
      .map((dayName) => dayNameToNumber(dayName))
      .filter((dayNum) => dayNum !== -1);
  }, [availableDays]);

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <Typography variant="h4" className="text-sm font-medium">
          Available Dates
        </Typography>
      </div>

      <div className="flex justify-start">
        {isLoading ? (
          <div className="border rounded-md p-2 w-[242px] h-[279.2px] flex items-center justify-center">
            <Typography variant="small" className="text-muted-foreground">
              Loading available dates...
            </Typography>
          </div>
        ) : (
          <Calendar
            mode="single"
            selected={localSelectedDate}
            onSelect={handleDateSelect}
            defaultMonth={localSelectedDate || new Date()}
            disabled={(date) => {
              // Can't book in the past
              if (date < new Date()) return true;

              // Check if day is in available days
              if (availableDayNumbers.length > 0) {
                // Get the day of week as a number where Sunday is 0 and Monday is 1
                const dayOfWeek = date.getDay();
                return !availableDayNumbers.includes(dayOfWeek);
              }

              // Default behavior if no availableDays are provided
              return date.getDay() === 0 || date.getDay() === 6; // Exclude weekends
            }}
            className="border rounded-md p-2"
          />
        )}
      </div>
    </div>
  );
}

// Time slots container component
function TimeSlotsContainer({
  selectedDate,
  timeSlots,
  onSelectTimeSlot,
  totalDurationMinutes,
  validationStatus,
  isLoading,
}: {
  selectedDate: Date | undefined;
  timeSlots: TimeSlot[];
  onSelectTimeSlot: (slot: TimeSlot) => void;
  totalDurationMinutes: number;
  validationStatus: ValidationStatus;
  isLoading?: boolean;
}) {
  return (
    <div className="w-full h-full min-h-20 flex flex-col">
      <div className="flex w-full justify-between items-center mb-2">
        <Typography variant="h4" className="text-sm font-medium">
          Available Times
        </Typography>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          <span>Duration: {formatDuration(totalDurationMinutes)}</span>
        </div>
      </div>

      {validationStatus.message && validationStatus.type && !isLoading && (
        <div className="mb-2">
          <Alert
            variant={
              validationStatus.type === 'error' ? 'destructive' : undefined
            }
            className="py-2"
          >
            <div className="flex items-center space-x-2 text-xs">
              <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
              <AlertDescription>{validationStatus.message}</AlertDescription>
            </div>
          </Alert>
        </div>
      )}

      <div className="flex-1 border rounded-md p-2 overflow-hidden">
        {selectedDate ? (
          isLoading ? (
            <div className="h-full flex items-center justify-center">
              <Typography variant="small" className="text-muted-foreground">
                Loading available time slots...
              </Typography>
            </div>
          ) : timeSlots.length > 0 ? (
            <TimeSlotsPicker
              timeSlots={timeSlots}
              onSelectTimeSlot={onSelectTimeSlot}
            />
          ) : (
            <div className="h-full flex items-center justify-center">
              <Typography variant="small" className="text-muted-foreground">
                No available time slots for this date
              </Typography>
            </div>
          )
        ) : (
          <div className="h-full flex items-center justify-center">
            <Typography variant="small" className="text-muted-foreground">
              Please select a date first
            </Typography>
          </div>
        )}
      </div>
    </div>
  );
}

// Custom hook to manage date state synchronization
function useSynchronizedDateState(
  selectedDate: Date | undefined,
  onSelectDate: (date: Date | undefined) => void,
) {
  // Use local state to track date independently
  const [localDate, setLocalDate] = useState<Date | undefined>(selectedDate);

  // Sync with parent props when they change
  useEffect(() => {
    if (selectedDate !== localDate) {
      setLocalDate(selectedDate);
    }
  }, [selectedDate, localDate]);

  // When local date changes, update parent
  const handleLocalDateChange = (date: Date | undefined) => {
    setLocalDate(date);
    onSelectDate(date);
  };

  return { localDate, handleLocalDateChange };
}

export function BookingFormDateTimePicker({
  selectedDate,
  onSelectDate,
  availableDays,
  availableTimeSlots = [],
  selectedTimeSlot,
  onSelectTimeSlot,
  service,
  selectedExtraServices,
  isLoading = false,
  isCalendarLoading = false,
  professionalTimezone,
  clientTimezone,
}: BookingFormDateTimePickerProps) {
  // Use synchronized date state
  const { localDate, handleLocalDateChange } = useSynchronizedDateState(
    selectedDate,
    onSelectDate,
  );

  // Calculate total duration in minutes
  const totalDurationMinutes = useMemo(() => {
    const extraServicesDuration = selectedExtraServices.reduce(
      (total, extraService) => total + extraService.duration,
      0,
    );
    return service.duration + extraServicesDuration;
  }, [service.duration, selectedExtraServices]);

  // Number of 30-minute slots needed for the service
  const requiredSlots = Math.ceil(totalDurationMinutes / 30);

  // Process time slots with validation
  const { timeSlots, validationStatus } = useProcessedTimeSlots(
    availableTimeSlots,
    selectedDate,
    selectedTimeSlot,
    requiredSlots,
  );

  // Handle slot selection
  const handleSlotSelect = (slot: TimeSlot) => {
    if (slot.isDisabled) return;
    onSelectTimeSlot(slot.time);
  };

  return (
    <div className="space-y-2">
      <div className="space-y-1">
        <Typography className="font-medium">Select Date & Time</Typography>

        {/* Timezone Information */}
        {clientTimezone && (
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>
              Times shown in your timezone ({clientTimezone})
              {professionalTimezone &&
                professionalTimezone !== clientTimezone && (
                  <span> • Professional is in {professionalTimezone}</span>
                )}
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-4 md:gap-6">
        {/* Calendar section */}
        <div className="w-full flex justify-start md:block">
          <DatePickerSection
            selectedDate={localDate}
            onSelectDate={handleLocalDateChange}
            availableDays={availableDays}
            isLoading={isCalendarLoading}
          />
        </div>

        {/* Time slots section */}
        <TimeSlotsContainer
          selectedDate={localDate}
          timeSlots={timeSlots}
          onSelectTimeSlot={handleSlotSelect}
          totalDurationMinutes={totalDurationMinutes}
          validationStatus={validationStatus}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
