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
  LocationForm,
  LocationFormValues,
} from '@/components/forms/LocationForm';
import { useRef } from 'react';
import type { User } from '@supabase/supabase-js';

export type LocationModalProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSubmitSuccess: (data: LocationFormValues) => Promise<void> | void;
  defaultValues?: LocationFormValues | undefined;
  user: User;
  isSubmitting?: boolean;
};

export function LocationModal({
  isOpen,
  onOpenChange,
  onSubmitSuccess,
  defaultValues,
  user,
  isSubmitting,
}: LocationModalProps) {
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

  const handleFormSubmitSuccess = async (data: LocationFormValues) => {
    await onSubmitSuccess(data);
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
          <DialogTitle>Edit Location</DialogTitle>
          <DialogDescription>
            Update your business location and address details.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-1 py-4">
          <LocationForm
            ref={formRef}
            user={user}
            onSubmit={handleFormSubmitSuccess}
            onCancel={handleCancel}
            hideButtons={true}
            {...(defaultValues && { initialData: defaultValues })}
          />
        </div>

        <DialogFooter className="flex-shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isSubmitting}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button 
            type="button" 
            onClick={handleSubmit} 
            disabled={isSubmitting}
            className="w-full sm:w-auto"
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
