import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  // DialogFooter, // Removed unused import
} from '@/components/ui/dialog';
import { ServiceForm, ServiceFormValues } from '@/components/forms/ServiceForm';
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
};

export function ServiceModal({
  isOpen,
  onOpenChange,
  onSubmitSuccess,
  service,
}: ServiceModalProps) {
  const isEditMode = !!service?.id;

  const handleFormSubmitSuccess = (data: ServiceFormValues) => {
    // Conditionally add id only if it exists
    const submitData: ServiceFormValues & { id?: string } = {
      ...data,
      ...(service?.id && { id: service.id }),
    };
    onSubmitSuccess(submitData);
    onOpenChange(false); // Close the modal on success
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

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
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

        {/* 
          Render the form. It needs onSubmitSuccess and onCancel.
          Pass defaultValues if in edit mode.
        */}
        <ServiceForm
          onSubmitSuccess={handleFormSubmitSuccess}
          onCancel={() => onOpenChange(false)} // Basic cancel closes modal
          // Pass the correctly typed defaults
          defaultValues={formDefaultValues}
        />

        {/* 
          Alternatively, form buttons could be here using DialogFooter 
          if they weren't part of the ServiceForm itself. 
        */}
        {/* <DialogFooter>
            <Button variant="outline">Cancel</Button>
            <Button>Save changes</Button>
          </DialogFooter> */}
      </DialogContent>
    </Dialog>
  );
}
