import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { HeaderForm, HeaderFormValues } from '@/components/forms/HeaderForm';

export type HeaderModalProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSubmitSuccess: (data: HeaderFormValues) => Promise<void> | void;
  defaultValues?: Partial<HeaderFormValues> | undefined;
};

export function HeaderModal({
  isOpen,
  onOpenChange,
  onSubmitSuccess,
  defaultValues,
}: HeaderModalProps) {
  // This handler will be passed to the form.
  // It closes the modal after the form's internal submit logic succeeds.
  const handleFormSubmitSuccess = async (data: HeaderFormValues) => {
    await onSubmitSuccess(data); // Call the actual update logic passed from parent
    onOpenChange(false); // Close modal
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Professional Information</DialogTitle>
          <DialogDescription>
            Update your name, profession, bio, phone, and social links.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <HeaderForm
            onSubmitSuccess={handleFormSubmitSuccess}
            onCancel={() => onOpenChange(false)} // Close modal on cancel
            defaultValues={defaultValues}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
