import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  ContactHoursForm,
  ContactHoursFormValues,
} from '@/components/forms/ContactHoursForm';
import { TimezoneSelector } from '@/components/forms/TimezoneSelector/TimezoneSelector';
import { WorkingHoursEntry } from '@/types/working_hours';
import { getUserTimezone } from '@/utils/timezone';
import { useRef, useState, useEffect } from 'react';
import { Typography } from '@/components/ui/typography';

export type ContactHoursModalProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  // Callback receives the validated & structured form data with timezone
  onSubmitSuccess: (
    data: ContactHoursFormValues & { timezone: string },
  ) => Promise<void> | void;
  // Update defaultValues type
  defaultValues?: WorkingHoursEntry[] | null;
  currentTimezone?: string;
  isSubmitting?: boolean;
};

export function ContactHoursModal({
  isOpen,
  onOpenChange,
  onSubmitSuccess,
  defaultValues,
  currentTimezone,
  isSubmitting,
}: ContactHoursModalProps) {
  const formRef = useRef<HTMLFormElement>(null);

  // Default to user's browser timezone if no current timezone is set
  const defaultTimezone = currentTimezone || getUserTimezone();
  const [selectedTimezone, setSelectedTimezone] =
    useState<string>(defaultTimezone);

  // Update timezone when currentTimezone prop changes
  useEffect(() => {
    if (currentTimezone) {
      setSelectedTimezone(currentTimezone);
    } else {
      // If no timezone in DB, use browser timezone
      setSelectedTimezone(getUserTimezone());
    }
  }, [currentTimezone]);

  // Reset timezone to browser timezone when modal opens if no current timezone
  useEffect(() => {
    if (isOpen && !currentTimezone) {
      setSelectedTimezone(getUserTimezone());
    }
  }, [isOpen, currentTimezone]);

  // Handle modal closure prevention during submission
  const handleOpenChange = (open: boolean) => {
    if (!isSubmitting) {
      onOpenChange(open);
    }
  };

  const handleSubmit = () => {
    if (formRef.current) {
      formRef.current.requestSubmit();
    }
  };

  const handleCancel = () => {
    handleOpenChange(false);
  };

  // Wrap the form submission to include timezone
  const handleFormSubmitSuccess = (data: ContactHoursFormValues) => {
    onSubmitSuccess({ ...data, timezone: selectedTimezone });
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        className="flex flex-col sm:max-w-[600px] max-h-[90vh]"
        onOpenAutoFocus={(e) => {
          // Prevent auto-focus on first element when dialog opens
          e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>Edit Working Hours</DialogTitle>
          <DialogDescription>
            Update your weekly working hours and timezone.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Timezone Selector */}
          <div className="px-1 pb-4 border-b border-border">
            <div className="space-y-2">
              <Typography
                variant="small"
                className="font-medium text-muted-foreground"
              >
                Timezone
              </Typography>
              <TimezoneSelector
                value={selectedTimezone}
                onChange={setSelectedTimezone}
                disabled={!!isSubmitting}
              />
              <Typography
                variant="small"
                className="text-muted-foreground text-xs"
              >
                Set your working hours in your local timezone
              </Typography>
            </div>
          </div>

          {/* Header Row - Adjust column spans */}
          <div className="grid grid-cols-7 gap-x-4 px-1 pb-2 pt-4 border-b border-border">
            <Typography
              variant="small"
              className="col-span-1 font-medium text-muted-foreground"
            >
              Day
            </Typography>
            <Typography
              variant="small"
              className="col-span-1 text-center font-medium text-muted-foreground"
            >
              Status
            </Typography>
            <div className="col-span-1" />
            <Typography
              variant="small"
              className="col-span-2 font-medium text-muted-foreground"
            >
              Start Time
            </Typography>
            <Typography
              variant="small"
              className="col-span-2 font-medium text-muted-foreground"
            >
              End Time
            </Typography>
          </div>

          <div className="flex-1 overflow-y-auto pt-1 min-h-0">
            <ContactHoursForm
              ref={formRef}
              onSubmitSuccess={handleFormSubmitSuccess}
              defaultValues={defaultValues ?? null}
            />
          </div>
        </div>

        <DialogFooter className="flex-shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
