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
  // ContactHoursDefaultInput, // No longer needed for props
} from '@/components/forms/ContactHoursForm';
import { WorkingHoursEntry } from '@/types/working_hours';
import { useRef } from 'react';
import { Typography } from '@/components/ui/typography';

export type ContactHoursModalProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  // Callback receives the validated & structured form data
  onSubmitSuccess: (data: ContactHoursFormValues) => Promise<void> | void;
  // Update defaultValues type
  defaultValues?: WorkingHoursEntry[] | null;
  isSubmitting?: boolean;
};

export function ContactHoursModal({
  isOpen,
  onOpenChange,
  onSubmitSuccess,
  defaultValues,
  isSubmitting, // Added isSubmitting prop
}: ContactHoursModalProps) {
  const formRef = useRef<HTMLFormElement>(null);

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

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="flex flex-col sm:max-w-[600px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Edit Working Hours</DialogTitle>
          <DialogDescription>
            Update your weekly working hours.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header Row - Adjust column spans */}
          <div className="grid grid-cols-7 gap-x-4 px-1 pb-2 border-b border-border">
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
              onSubmitSuccess={onSubmitSuccess}
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
