/* eslint-disable max-lines-per-function */
'use client';

import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { ContactHoursFormValues } from '@/components/forms/ContactHoursForm';
import { ContactHoursModal } from '@/components/modals/ContactHoursModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Typography } from '@/components/ui/typography';
import { Pencil } from 'lucide-react';

import { toast } from '@/components/ui/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { WorkingHoursEntry } from '@/types/working_hours';
import { updateWorkingHoursAction } from '@/server/domains/working_hours/actions';

// Update component props type
export type ContactSectionProps = {
  user: User;
  workingHours: WorkingHoursEntry[] | null;
  isLoading: boolean;
};

// Helper to format form values back to display string
const formatHoursForDisplay = (
  hours: WorkingHoursEntry, // Use WorkingHoursEntry type
): string => {
  // Check for enabled and valid times upfront
  if (!hours.enabled || !hours.startTime || !hours.endTime) {
    return 'Closed';
  }

  // Basic AM/PM formatting (can be improved with date library if needed)
  const formatTime = (time: string): string => {
    const parts = time.split(':');
    // Add basic check for parts length
    if (parts.length !== 2 || parts[0] === undefined || parts[1] === undefined)
      return 'Invalid Time';
    const hour = parseInt(parts[0], 10);
    const minuteStr = parts[1]; // Keep as string
    if (isNaN(hour)) return 'Invalid Time';

    const ampm = hour < 12 ? 'AM' : 'PM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minuteStr} ${ampm}`;
  };

  // Now startTime and endTime are guaranteed to be strings here
  const formattedStartTime = formatTime(hours.startTime);
  const formattedEndTime = formatTime(hours.endTime);

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
    const hoursToSave: WorkingHoursEntry[] = formData.hours.map((h) => ({
      day: h.day,
      enabled: h.enabled ?? false,
      startTime: h.startTime ?? null,
      endTime: h.endTime ?? null,
    }));

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
          <Button
            variant="ghost"
            size="icon"
            onClick={handleEditClick}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            disabled={isLoading || !localWorkingHours}
          >
            <Pencil className="h-4 w-4" />
          </Button>
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
