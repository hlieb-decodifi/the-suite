'use client';

import { ContactHoursFormValues } from '@/components/forms/ContactHoursForm';
import { ContactHoursModal } from '@/components/modals/ContactHoursModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Typography } from '@/components/ui/typography';
import { User } from '@supabase/supabase-js';
import { Pencil } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/use-toast';
import { updateWorkingHoursAction } from '@/server/domains/working_hours/actions';
import { WorkingHoursEntry } from '@/types/working_hours';
import { formatTime } from '@/utils';

// Helper function to safely format time strings that might be null
function safeFormatTime(timeString: string | null): string {
  if (!timeString) return 'Invalid Time';

  // First convert UTC time to local time, then format it
  // const localTime = convertToLocal(timeString);
  const localTime = timeString;
  return localTime ? formatTime(localTime) : 'Invalid Time';
}

// Update component props type
export type ContactSectionProps = {
  user: User;
  workingHours: WorkingHoursEntry[] | null;
  isLoading: boolean;
  isEditable?: boolean;
};

// Helper to format form values back to display string
const formatHoursForDisplay = (
  hours: WorkingHoursEntry, // Use WorkingHoursEntry type
): string => {
  // Check for enabled and valid times upfront
  if (!hours.enabled || !hours.startTime || !hours.endTime) {
    return 'Closed';
  }

  // Basic AM/PM formatting using our utility with null safety
  const formattedStartTime = safeFormatTime(hours.startTime);
  const formattedEndTime = safeFormatTime(hours.endTime);

  // Handle potential invalid time results from formatTime
  if (
    formattedStartTime === 'Invalid Time' ||
    formattedEndTime === 'Invalid Time'
  ) {
    return 'Invalid Time Range'; // Or handle error appropriately
  }

  return `${formattedStartTime} - ${formattedEndTime}`;
};

export function ContactSection({
  user,
  workingHours, // Use prop
  isLoading, // Use prop
  isEditable = true,
}: ContactSectionProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localWorkingHours, setLocalWorkingHours] = useState<
    WorkingHoursEntry[] | null
  >(workingHours);

  // Effect to sync prop changes to local state
  useEffect(() => {
    setLocalWorkingHours(workingHours);
  }, [workingHours]);

  const handleEditClick = () => {
    setIsModalOpen(true);
  };

  const handleSave = async (formData: ContactHoursFormValues) => {
    setIsSubmitting(true);

    // Convert local times to UTC before saving
    const hoursToSave: WorkingHoursEntry[] = formData.hours.map((h) => {
      // Add logging to compare local time vs UTC time
      if (h.enabled && h.startTime && h.endTime) {
        console.log(`[Working Hours] Day: ${h.day}`);
        console.log(
          `[Working Hours] Local start time: ${h.startTime}, end time: ${h.endTime}`,
        );

        // const utcStartTime = convertToUTC(h.startTime);
        const utcStartTime = h.startTime;
        // const utcEndTime = convertToUTC(h.endTime);
        const utcEndTime = h.endTime;

        console.log(
          `[Working Hours] UTC start time: ${utcStartTime}, end time: ${utcEndTime}`,
        );
        console.log('------');

        return {
          day: h.day,
          enabled: h.enabled,
          startTime: utcStartTime,
          endTime: utcEndTime,
        };
      }

      // If disabled or missing times, just pass through the values
      return {
        day: h.day,
        enabled: h.enabled ?? false,
        startTime: h.startTime ?? null,
        endTime: h.endTime ?? null,
      };
    });

    const result = await updateWorkingHoursAction(user.id, hoursToSave);
    setIsSubmitting(false);

    if (result.success) {
      setLocalWorkingHours(hoursToSave); // Update local state optimistically or after fetch?
      // Consider if parent needs to refetch or be notified
      setIsModalOpen(false);
      toast({ description: 'Working hours updated successfully.' });
    } else {
      toast({
        title: 'Error saving working hours',
        description: result.error || 'Could not save working hours.',
        variant: 'destructive',
      });
    }
  };

  return (
    <>
      <Card className="border border-border">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <Typography variant="h3" className="font-bold text-foreground">
            Working Hours
          </Typography>
          {isEditable && (
            <Button
              variant="outline"
              size="icon"
              onClick={handleEditClick}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              disabled={isLoading || !localWorkingHours}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}
        </CardHeader>
        <CardContent className="pt-2">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 7 }).map((_, i) => (
                <Skeleton key={i} className="h-5 w-full" />
              ))}
            </div>
          ) : localWorkingHours ? (
            <div className="space-y-2">
              {localWorkingHours.map((dayHours) => (
                <div
                  key={dayHours.day}
                  className="flex justify-between text-sm"
                >
                  <Typography variant="small" className="text-muted-foreground">
                    {dayHours.day}
                  </Typography>
                  <Typography variant="small" className="text-foreground">
                    {formatHoursForDisplay(dayHours)}
                  </Typography>
                </div>
              ))}
            </div>
          ) : (
            <Typography variant="small" className="text-muted-foreground">
              Could not load working hours.
            </Typography>
          )}
        </CardContent>
      </Card>

      <ContactHoursModal
        isOpen={isModalOpen}
        onOpenChange={setIsModalOpen}
        onSubmitSuccess={handleSave}
        defaultValues={localWorkingHours}
        isSubmitting={isSubmitting}
      />
    </>
  );
}
