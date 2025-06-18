import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { HeaderForm, HeaderFormValues } from '@/components/forms/HeaderForm';
import { useState, useRef } from 'react';

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
  const [isPending, setIsPending] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // This handler will be passed to the form.
  // It closes the modal after the form's internal submit logic succeeds.
  const handleFormSubmitSuccess = async (data: HeaderFormValues) => {
    try {
      await onSubmitSuccess(data); // Call the actual update logic passed from parent
      onOpenChange(false); // Close modal
    } catch (error) {
      // Error handling is done within the form, just don't close modal
      console.error('Form submission error:', error);
    }
  };

  const handleSave = () => {
    if (formRef.current) {
      formRef.current.requestSubmit();
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col p-0">
        {/* Fixed Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <DialogTitle>Edit Professional Information</DialogTitle>
          <DialogDescription>
            Update your name, profession, bio, phone, and social links.
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <HeaderForm
            ref={formRef}
            onSubmitSuccess={handleFormSubmitSuccess}
            onPendingChange={setIsPending}
            defaultValues={defaultValues}
            hideButtons={true}
          />
        </div>

        {/* Fixed Footer */}
        <DialogFooter className="px-6 pb-6 pt-4 border-t border-border">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={isPending}>
            {isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
