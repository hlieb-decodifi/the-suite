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
import { getUserTimezone } from '@/utils/timezone';

// Helper function to safely format time strings that might be null
function safeFormatTime(timeString: string | null): string {
  if (!timeString) return 'Invalid Time';

  // First convert UTC time to local time, then format it
  // const localTime = convertToLocal(timeString);
  const localTime = timeString;
  return localTime ? formatTime(localTime) : 'Invalid Time';
}

// Updated props to include timezone
type ContactSectionProps = {
  user: User;
  workingHours: WorkingHoursEntry[] | null;
  timezone?: string;
  isLoading: boolean;
  isEditable?: boolean;
};

export function ContactSection({
  user,
  workingHours, // Use prop
  timezone = '',
  isLoading, // Use prop
  isEditable = true,
}: ContactSectionProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localWorkingHours, setLocalWorkingHours] = useState<
    WorkingHoursEntry[] | null
  >(workingHours);

  // Determine effective timezone: use DB timezone if set, otherwise use browser timezone
  const effectiveTimezone = timezone || getUserTimezone();

  // Effect to sync prop changes to local state
  useEffect(() => {
    setLocalWorkingHours(workingHours);
  }, [workingHours]);

  const handleEditClick = () => {
    setIsModalOpen(true);
  };

  const handleSave = async (
    formData: ContactHoursFormValues & { timezone: string },
  ) => {
    setIsSubmitting(true);

    // Working hours are now stored with timezone information
    const hoursToSave: WorkingHoursEntry[] = formData.hours.map((h) => {
      return {
        day: h.day,
        enabled: h.enabled ?? false,
        startTime: h.startTime ?? null,
        endTime: h.endTime ?? null,
      };
    });

    const result = await updateWorkingHoursAction(
      user.id,
      hoursToSave,
      formData.timezone,
    );
    setIsSubmitting(false);

    if (result.success) {
      setLocalWorkingHours(hoursToSave);
      setIsModalOpen(false);
      toast({ description: 'Working hours updated successfully.' });
    } else {
      toast({
        variant: 'destructive',
        title: 'Error saving working hours',
        description: result.error || 'An unexpected error occurred',
      });
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Typography variant="h3" className="font-bold text-foreground">
              Working Hours
            </Typography>
            {isEditable && (
              <Button variant="outline" size="sm" onClick={handleEditClick}>
                <Pencil className="h-4 w-4" />
              </Button>
            )}
          </div>
          <Typography variant="small" className="text-muted-foreground">
            Timezone: {effectiveTimezone}
            {!timezone && (
              <span className="text-xs opacity-75">
                {' '}
                (detected from browser)
              </span>
            )}
          </Typography>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 7 }).map((_, index) => (
                <div key={index} className="flex justify-between">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ))}
            </div>
          ) : localWorkingHours && localWorkingHours.length > 0 ? (
            <div className="space-y-2">
              {localWorkingHours.map((day) => (
                <div
                  key={day.day}
                  className="flex items-center justify-between py-1"
                >
                  <Typography variant="small" className="font-medium">
                    {day.day}
                  </Typography>
                  <Typography variant="small" className="text-muted-foreground">
                    {day.enabled && day.startTime && day.endTime
                      ? `${safeFormatTime(day.startTime)} - ${safeFormatTime(day.endTime)}`
                      : 'Closed'}
                  </Typography>
                </div>
              ))}
            </div>
          ) : (
            <Typography variant="small" className="text-muted-foreground">
              No working hours set
            </Typography>
          )}
        </CardContent>
      </Card>

      <ContactHoursModal
        isOpen={isModalOpen}
        onOpenChange={setIsModalOpen}
        onSubmitSuccess={handleSave}
        defaultValues={localWorkingHours}
        currentTimezone={timezone} // Pass the actual DB timezone (might be empty)
        isSubmitting={isSubmitting}
      />
    </>
  );
}
