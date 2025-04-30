import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  ContactHoursForm,
  ContactHoursFormValues,
  // ContactHoursDefaultInput, // No longer needed for props
} from '@/components/forms/ContactHoursForm';
import { WorkingHoursEntry } from '@/api/working_hours/actions'; // Import type

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
  // Handle modal closure prevention during submission
  const handleOpenChange = (open: boolean) => {
    if (!isSubmitting) {
      onOpenChange(open);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Working Hours</DialogTitle>
          <DialogDescription>
            Update your weekly working hours.
          </DialogDescription>
        </DialogHeader>

        <ContactHoursForm
          onSubmitSuccess={onSubmitSuccess}
          onCancel={() => handleOpenChange(false)} // Use the guarded handler
          defaultValues={defaultValues ?? null}
          // Note: isSubmitting prop is passed to the form hook internally, not needed here
        />
      </DialogContent>
    </Dialog>
  );
}
