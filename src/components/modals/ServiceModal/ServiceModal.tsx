import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  // DialogFooter, // Removed unused import
} from '@/components/ui/dialog';
import {
  ServiceForm,
  ServiceFormValues,
  ServiceFormProps,
} from '@/components/forms/ServiceForm';
import { UseServiceFormProps } from '@/components/forms/ServiceForm/useServiceForm'; // Import hook props type

// Type for the raw service data coming in (might have string duration)
export type InputServiceData = {
  id: string;
  name: string;
  price: number;
  duration: string; // Assume original duration is always string
  description: string;
};

export type ServiceModalProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  // Callback receives validated form data + the ID if it was an edit
  onSubmitSuccess: (data: ServiceFormValues & { id?: string }) => void;
  // Accept the full Service object or null for adding
  service?: InputServiceData | null;
  isSubmitting?: boolean; // Add loading state prop
};

export function ServiceModal({
  isOpen,
  onOpenChange,
  onSubmitSuccess,
  service,
  isSubmitting = false, // Default to false
}: ServiceModalProps) {
  const isEditMode = !!service?.id;

  // Handle form submission internally and pass up
  const handleFormSubmitSuccess = (data: ServiceFormValues) => {
    // Conditionally add id only if it exists
    const submitData: ServiceFormValues & { id?: string } = {
      ...data,
      ...(service?.id && { id: service.id }),
    };
    onSubmitSuccess(submitData);
  };

  // Prepare default values for the ServiceForm, matching UseServiceFormProps expectation
  const formDefaultValues: UseServiceFormProps['defaultValues'] = service
    ? {
        name: service.name,
        price: service.price,
        description: service.description,
        duration: service.duration, // Pass the original string for parsing by the hook
      }
    : undefined; // Pass undefined if not editing

  // Cast ServiceFormProps to include isSubmitting for type safety
  const serviceFormProps: ServiceFormProps & { isSubmitting?: boolean } = {
    onSubmitSuccess: handleFormSubmitSuccess,
    onCancel: () => {
      if (!isSubmitting) onOpenChange(false);
    },
    defaultValues: formDefaultValues,
    isSubmitting: isSubmitting,
  };

  return (
    // Prevent closing via overlay click or escape key when submitting
    <Dialog open={isOpen} onOpenChange={isSubmitting ? () => {} : onOpenChange}>
      <DialogContent
        className="sm:max-w-[480px]"
        onInteractOutside={(e) => {
          if (isSubmitting) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (isSubmitting) e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? 'Edit Service' : 'Add New Service'}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? 'Update the details for this service.'
              : 'Enter the details for the new service you want to offer.'}
          </DialogDescription>
        </DialogHeader>

        <ServiceForm {...serviceFormProps} />
      </DialogContent>
    </Dialog>
  );
}
