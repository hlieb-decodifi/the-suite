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
  ContactHoursDefaultInput, // Type for initial data
} from '@/components/forms/ContactHoursForm';

export type ContactHoursModalProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  // Callback receives the validated & structured form data
  onSubmitSuccess: (data: ContactHoursFormValues) => void;
  // Default values should be in the format expected by the form's hook
  defaultValues?: ContactHoursDefaultInput;
};

export function ContactHoursModal({
  isOpen,
  onOpenChange,
  onSubmitSuccess,
  defaultValues,
}: ContactHoursModalProps) {
  // This handler is called by the form upon successful validation and submission
  const handleFormSubmitSuccess = (data: ContactHoursFormValues) => {
    onSubmitSuccess(data); // Pass the validated data up
    onOpenChange(false); // Close the modal
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      {/* Consider DialogContent className for width/height if needed */}
      {/* e.g., sm:max-w-[600px] */}
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Working Hours</DialogTitle>
          <DialogDescription>
            Update your weekly working hours.
          </DialogDescription>
        </DialogHeader>

        <ContactHoursForm
          // Pass the handler that includes closing the modal
          onSubmitSuccess={handleFormSubmitSuccess}
          // onCancel should just close the modal
          onCancel={() => onOpenChange(false)}
          defaultValues={defaultValues}
        />
      </DialogContent>
    </Dialog>
  );
}
