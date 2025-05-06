'use client';

import { ServiceForm, ServiceFormValues } from '@/components/forms/ServiceForm';
import { Card, CardContent } from '@/components/ui/card';
import { Typography } from '@/components/ui/typography';
import { ServiceUI } from '@/types/services';
import { useRef, useState } from 'react';

type InlineServiceFormProps = {
  onSubmitSuccess: (data: ServiceFormValues & { id?: string }) => void;
  editingService: ServiceUI | null;
  onCancel: () => void;
};

export function InlineServiceForm({
  onSubmitSuccess,
  editingService,
  onCancel,
}: InlineServiceFormProps) {
  const formRef = useRef<HTMLDivElement>(null);
  const isEditMode = !!editingService;
  // Counter to track submissions and force re-render
  const [submitCount, setSubmitCount] = useState(0);

  // Prepare default values for the ServiceForm
  const defaultValues = editingService
    ? {
        name: editingService.name,
        price: editingService.price,
        description: editingService.description,
        duration: editingService.duration,
      }
    : undefined;

  const handleFormSubmitSuccess = (data: ServiceFormValues) => {
    const submitData: ServiceFormValues & { id?: string } = {
      ...data,
      ...(editingService?.id && { id: editingService.id }),
    };
    onSubmitSuccess(submitData);

    // Increment the submit count to force a form reset
    if (!isEditMode) {
      setSubmitCount((prev) => prev + 1);
    }
  };

  // Create a key that changes when a new service is submitted
  const formKey = isEditMode
    ? `edit-${editingService.id}`
    : `new-service-${submitCount}`;

  return (
    <Card className="border border-muted bg-background h-full" ref={formRef}>
      <CardContent className="p-6">
        <Typography variant="h3" className="font-semibold mb-6">
          {isEditMode ? 'Edit service' : 'Add new service'}
        </Typography>

        <div key={formKey}>
          <ServiceForm
            onSubmitSuccess={handleFormSubmitSuccess}
            // Only pass onCancel when in edit mode
            {...(isEditMode ? { onCancel } : {})}
            defaultValues={defaultValues}
          />
        </div>
      </CardContent>
    </Card>
  );
}
