'use client';

import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { Typography } from '@/components/ui/typography';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Clock, Pencil, Trash2, Copy } from 'lucide-react';
import { ServiceUI, ServiceLimitInfo } from '@/types/services';
import { cn } from '@/utils/cn';
import { ExpandableText } from '@/components/common/ExpandableText/ExpandableText';
import { ServiceModal } from '@/components/modals/ServiceModal';
import { ConfirmDeleteModal } from '@/components/modals/ConfirmDeleteModal';
import { ServiceForm, ServiceFormValues } from '@/components/forms/ServiceForm';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useToast } from '@/components/ui/use-toast';
import {
  upsertServiceAction,
  deleteServiceAction,
} from './ProfileServicesPage';

export type ProfileServicesPageClientProps = {
  user: User;
  initialServices: ServiceUI[];
  initialPagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  initialSearch: string;
  isEditable?: boolean;
  serviceLimitInfo?: ServiceLimitInfo | null;
};

// ServiceCard component
function ServiceCard({
  service,
  onEdit,
  onDelete,
  onDuplicate,
  isUpdating = false,
  isBeingEdited = false,
  isEditable = true,
  isDeletable = true,
  isAtLimit = false,
}: {
  service: ServiceUI;
  onEdit: (service: ServiceUI) => void;
  onDelete: () => void;
  onDuplicate?: (service: ServiceUI) => void;
  isUpdating?: boolean;
  isBeingEdited?: boolean;
  isEditable?: boolean;
  isDeletable?: boolean;
  isAtLimit?: boolean;
}) {
  return (
    <Card
      className={cn(
        'border relative',
        isUpdating && 'opacity-70',
        isBeingEdited
          ? 'border-primary ring-1 ring-primary/20 shadow-sm'
          : 'border-border',
      )}
    >
      {isUpdating && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-background/50 rounded-md">
          <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <Typography
              variant="large"
              className="font-semibold text-foreground"
            >
              {service.name}
            </Typography>
            <div className="flex items-center gap-3">
              <Typography variant="p" className="leading-tight font-medium">
                ${service.price.toFixed(2)}
              </Typography>
              <div className="flex items-center space-x-1">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <Typography
                  variant="p"
                  className="leading-tight text-muted-foreground"
                >
                  {service.duration}
                </Typography>
              </div>
            </div>
          </div>
          <div className="flex space-x-1">
            {isEditable && onDuplicate && (
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'h-8 w-8',
                  isAtLimit
                    ? 'text-muted-foreground/50 cursor-not-allowed'
                    : 'text-muted-foreground',
                )}
                onClick={() => onDuplicate(service)}
                disabled={isUpdating || isAtLimit}
                title={
                  isAtLimit
                    ? 'Cannot duplicate - service limit reached'
                    : 'Duplicate service'
                }
              >
                <Copy className="h-4 w-4" />
              </Button>
            )}
            {isEditable && (
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'h-8 w-8',
                  isBeingEdited ? 'text-primary' : 'text-muted-foreground',
                )}
                onClick={() => onEdit(service)}
                disabled={isUpdating}
                title="Edit service"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            {isDeletable && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={onDelete}
                disabled={isUpdating}
                title="Delete service"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        {service.description && (
          <ExpandableText
            text={service.description}
            maxLines={2}
            className="mt-1.5"
            variant="small"
            textClassName="text-muted-foreground text-justify"
          />
        )}
      </CardContent>
    </Card>
  );
}

// InlineServiceForm component
function InlineServiceForm({
  onSubmitSuccess,
  editingService,
  onCancel,
  serviceLimitInfo,
}: {
  onSubmitSuccess: (data: ServiceFormValues & { id?: string }) => void;
  editingService: ServiceUI | null;
  onCancel: () => void;
  serviceLimitInfo?: ServiceLimitInfo | null;
}) {
  const isEditMode = !!editingService?.id; // Only true edit mode if service has an ID
  const isDuplicateMode = !!editingService && !editingService.id; // Has service data but no ID
  const [submitCount, setSubmitCount] = useState(0);

  // Get service limit info
  const maxServices = serviceLimitInfo?.maxServices || 50;
  const currentCount = serviceLimitInfo?.currentCount || 0;
  const remaining = serviceLimitInfo?.remaining || maxServices - currentCount;

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

    if (!isEditMode) {
      setSubmitCount((prev) => prev + 1);
    }
  };

  const formKey = isEditMode
    ? `edit-${editingService.id}`
    : isDuplicateMode
      ? `duplicate-${editingService.name}-${submitCount}`
      : `new-service-${submitCount}`;

  // Determine the form title
  const getFormTitle = () => {
    if (isEditMode) return 'Edit service';
    if (isDuplicateMode) return 'Duplicate service';
    return 'Add new service';
  };

  return (
    <Card
      className={cn(
        'border bg-background h-full',
        isEditMode || isDuplicateMode
          ? 'border-primary ring-1 ring-primary/20 shadow-sm'
          : 'border-muted',
      )}
    >
      <CardContent className="p-6">
        <div className="mb-4">
          <Typography variant="h3" className="font-semibold">
            {getFormTitle()}
          </Typography>
        </div>

        {/* Warning for new services when close to limit */}
        {!isEditMode && remaining > 0 && remaining <= 3 && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
            <Typography variant="small" className="text-amber-800">
              {remaining === 1
                ? "This will be your last service. You'll reach the limit after saving."
                : `Only ${remaining} services remaining before reaching your limit.`}
            </Typography>
          </div>
        )}

        <div key={formKey}>
          <ServiceForm
            onSubmitSuccess={handleFormSubmitSuccess}
            {...(isEditMode || isDuplicateMode ? { onCancel } : {})}
            defaultValues={defaultValues}
          />
        </div>
      </CardContent>
    </Card>
  );
}

export function ProfileServicesPageClient({
  user,
  initialServices,
  isEditable = true,
  serviceLimitInfo,
}: ProfileServicesPageClientProps) {
  // State
  const [services, setServices] = useState<ServiceUI[]>(initialServices);
  const [editingService, setEditingService] = useState<ServiceUI | null>(null);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState<ServiceUI | null>(
    null,
  );
  const [isSubmittingService, setIsSubmittingService] = useState(false);
  const [isDeletingService, setIsDeletingService] = useState(false);

  // Hooks
  const isMobile = useMediaQuery('(max-width: 1023px)');
  const { toast } = useToast();

  // Calculate remaining slots
  const maxServices = serviceLimitInfo?.maxServices || 50;
  const currentCount = serviceLimitInfo?.currentCount || services.length;
  const isAtLimit = serviceLimitInfo?.isAtLimit || currentCount >= maxServices;

  // On mobile, open modal when editingService changes
  useEffect(() => {
    if (isMobile && editingService && isEditable) {
      setIsServiceModalOpen(true);
    }
  }, [editingService, isMobile, isEditable]);

  // Service handlers
  const handleAddServiceClick = () => {
    // Check if at limit before allowing service creation
    if (isAtLimit) {
      toast({
        title: 'Service limit reached',
        description: `You have reached the maximum limit of ${maxServices} services. ${
          maxServices === 50
            ? 'Contact support at support@thesuite.com to increase your limit.'
            : 'Please delete an existing service first.'
        }`,
        variant: 'destructive',
      });
      return;
    }

    setEditingService(null);
    if (isMobile) {
      setIsServiceModalOpen(true);
    }
  };

  const handleEditService = (service: ServiceUI) => {
    if (!isEditable) return;
    setEditingService(service);
    if (isMobile) {
      setIsServiceModalOpen(true);
    }
  };

  const handleCancelEdit = () => {
    setEditingService(null);
    setIsServiceModalOpen(false);
  };

  const handleDeleteServiceClick = (service: ServiceUI) => {
    if (!isEditable) return;
    setServiceToDelete(service);
    setIsConfirmDeleteOpen(true);
  };

  const handleDuplicateService = (service: ServiceUI) => {
    if (!isEditable) return;

    // Check if at limit before allowing service duplication
    if (isAtLimit) {
      toast({
        title: 'Service limit reached',
        description: `You have reached the maximum limit of ${maxServices} services. ${
          maxServices === 50
            ? 'Contact support at support@thesuite.com to increase your limit.'
            : 'Please delete an existing service first.'
        }`,
        variant: 'destructive',
      });
      return;
    }

    // Create a new service object with copied data but without ID
    const duplicatedService: ServiceUI = {
      ...service,
      id: '', // Clear ID so it creates a new service
      name: `${service.name} (Copy)`, // Add "(Copy)" suffix to name
    };

    // Set as editing service to open in form
    setEditingService(duplicatedService);

    if (isMobile) {
      setIsServiceModalOpen(true);
    }

    toast({
      title: 'Service duplicated',
      description: `"${service.name}" has been duplicated. Make any changes and save.`,
    });
  };

  const handleConfirmDeleteService = async () => {
    if (!serviceToDelete) return;

    setIsDeletingService(true);
    try {
      const result = await deleteServiceAction({
        userId: user.id,
        serviceId: serviceToDelete.id,
      });

      if (result.success) {
        setServices((prev) => prev.filter((s) => s.id !== serviceToDelete.id));
        toast({
          title: 'Service deleted',
          description: `"${serviceToDelete.name}" has been deleted successfully.`,
        });

        // If we're deleting the service we're editing, reset it
        if (editingService?.id === serviceToDelete.id) {
          setEditingService(null);
        }
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to delete service',
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred while deleting the service',
        variant: 'destructive',
      });
    } finally {
      setIsDeletingService(false);
      setIsConfirmDeleteOpen(false);
      setServiceToDelete(null);
    }
  };

  const handleServiceFormSubmitSuccess = async (
    data: ServiceFormValues & { id?: string },
  ) => {
    setIsSubmittingService(true);
    try {
      const result = await upsertServiceAction({
        userId: user.id,
        data,
      });

      if (result.success && result.service) {
        if (data.id) {
          // Update existing service
          setServices((prev) =>
            prev.map((s) => (s.id === data.id ? result.service! : s)),
          );
          toast({
            title: 'Service updated',
            description: `"${result.service.name}" has been updated successfully.`,
          });
        } else {
          // Add new service at the top of the list
          setServices((prev) => [result.service!, ...prev]);
          toast({
            title: 'Service added',
            description: `"${result.service.name}" has been added successfully.`,
          });
        }

        // Reset edit state on successful save
        setEditingService(null);
        setIsServiceModalOpen(false);
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to save service',
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred while saving the service',
        variant: 'destructive',
      });
    } finally {
      setIsSubmittingService(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <Typography variant="h2" className="font-bold text-foreground">
            Services
          </Typography>
          <Typography className="text-muted-foreground">
            {isEditable
              ? 'Manage the services you offer'
              : 'Services offered by this professional'}
          </Typography>
        </div>

        {/* Mobile Add Button - Only in edit mode */}
        {isMobile && isEditable && (
          <Button
            onClick={handleAddServiceClick}
            className="flex items-center gap-1"
            disabled={isAtLimit || isSubmittingService}
          >
            <Plus className="h-4 w-4" />
            Add Service
          </Button>
        )}
      </div>

      {isAtLimit && isEditable && (
        <div className="bg-amber-50 border border-amber-200 rounded-md p-4">
          <Typography
            variant="h5"
            className="font-semibold text-amber-800 mb-2"
          >
            You've reached your service limit
          </Typography>
          <div className="space-y-1">
            <Typography variant="muted" className="text-amber-700">
              You currently have {maxServices} services, which is your current
              limit.
            </Typography>
            <Typography variant="muted" className="text-amber-700">
              <>
                To add more services, please reach out to our support team at{' '}
                <a
                  href="mailto:support@thesuite.com"
                  className="font-medium text-amber-800 underline hover:no-underline"
                >
                  support@thesuite.com
                </a>{' '}
                and we'll be happy to help increase your limit.
              </>
            </Typography>
          </div>
        </div>
      )}

      {/* Mobile View - Just the services list */}
      {isMobile ? (
        services.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {services.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                onEdit={handleEditService}
                onDelete={() => handleDeleteServiceClick(service)}
                onDuplicate={handleDuplicateService}
                isUpdating={
                  isSubmittingService && editingService?.id === service.id
                }
                isBeingEdited={editingService?.id === service.id}
                isEditable={isEditable}
                isDeletable={isEditable}
                isAtLimit={isAtLimit}
              />
            ))}
          </div>
        ) : (
          <Card className="border border-border bg-background/50">
            <CardContent className="p-6 text-center">
              <Typography variant="h4" className="text-muted-foreground mb-2">
                No Services Yet
              </Typography>
              <Typography className="text-muted-foreground mb-4">
                {isEditable
                  ? 'Click "Add Service" to offer your first service to clients.'
                  : "This professional hasn't added any services yet."}
              </Typography>
            </CardContent>
          </Card>
        )
      ) : (
        // Desktop View - Split Layout or just list in view mode
        <div
          className={isEditable ? 'grid lg:grid-cols-[1fr_500px] gap-6' : ''}
        >
          {/* Services List */}
          <div
            className={
              isEditable
                ? 'space-y-4 lg:space-y-4 max-h-[650px] lg:max-h-none overflow-y-auto lg:overflow-visible pb-4'
                : 'gap-4 grid grid-cols-1'
            }
          >
            {services.length > 0 ? (
              <>
                {services.map((service) => (
                  <ServiceCard
                    key={service.id}
                    service={service}
                    onEdit={handleEditService}
                    onDelete={() => handleDeleteServiceClick(service)}
                    onDuplicate={handleDuplicateService}
                    isUpdating={
                      isSubmittingService && editingService?.id === service.id
                    }
                    isBeingEdited={editingService?.id === service.id}
                    isEditable={isEditable}
                    isDeletable={isEditable}
                    isAtLimit={isAtLimit}
                  />
                ))}
              </>
            ) : (
              <Card className="border border-muted bg-background/50">
                <CardContent className="p-6 text-center">
                  <Typography
                    variant="h4"
                    className="text-muted-foreground mb-2"
                  >
                    No Services Yet
                  </Typography>
                  <Typography className="text-muted-foreground mb-4">
                    {isEditable
                      ? 'Use the form to add your first service.'
                      : "This professional hasn't added any services yet."}
                  </Typography>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Service Form (Right Side) - Only in edit mode */}
          {isEditable && (
            <div className="lg:sticky lg:top-24 lg:self-start lg:max-h-[calc(100vh-150px)] lg:border-l lg:pl-6">
              <InlineServiceForm
                onSubmitSuccess={handleServiceFormSubmitSuccess}
                editingService={editingService}
                onCancel={handleCancelEdit}
                serviceLimitInfo={serviceLimitInfo || null}
              />
            </div>
          )}
        </div>
      )}

      {/* Service Modal for Mobile/Tablet - Only in edit mode */}
      {isEditable && (
        <ServiceModal
          isOpen={isServiceModalOpen}
          onOpenChange={(open) => {
            if (!isSubmittingService) {
              setIsServiceModalOpen(open);
              if (!open) {
                setEditingService(null);
              }
            }
          }}
          onSubmitSuccess={handleServiceFormSubmitSuccess}
          service={editingService}
          isSubmitting={isSubmittingService}
        />
      )}

      {/* Confirm Delete Modal - Only in edit mode */}
      {isEditable && (
        <ConfirmDeleteModal
          isOpen={isConfirmDeleteOpen}
          onOpenChange={isDeletingService ? () => {} : setIsConfirmDeleteOpen}
          onConfirm={handleConfirmDeleteService}
          itemName={serviceToDelete?.name ?? 'this service'}
          title="Delete Service?"
          description={`Are you sure you want to delete the service "${serviceToDelete?.name ?? 'this service'}"? This action cannot be undone.`}
          isDeleting={isDeletingService}
        />
      )}
    </div>
  );
}
