/* eslint-disable max-lines-per-function */
'use client';

import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { Typography } from '@/components/ui/typography';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus } from 'lucide-react';
import {
  ServiceCard,
  ServiceCardSkeleton,
  InlineServiceForm,
} from './components';
import { ServiceModal } from '@/components/modals/ServiceModal';
import { ConfirmDeleteModal } from '@/components/modals/ConfirmDeleteModal';
import { ServiceFormValues } from '@/components/forms/ServiceForm';
import { ServiceUI } from '@/types/services';
import {
  useServices,
  useUpsertService,
  useDeleteService,
} from '@/api/services/hooks';
import { useMediaQuery } from '@/hooks/useMediaQuery';

export type ServicesSectionProps = {
  user: User;
  isEditable?: boolean;
};

export function ServicesSection({
  user,
  isEditable = true,
}: ServicesSectionProps) {
  // State
  const [editingService, setEditingService] = useState<ServiceUI | null>(null);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState<ServiceUI | null>(
    null,
  );

  // Check if we're on mobile/tablet
  const isMobile = useMediaQuery('(max-width: 1023px)');

  // Pagination state - we could add UI controls for these later
  const [page] = useState(1);
  const pageSize = 20; // Large enough to show all services for now

  // React Query hooks
  const {
    data: services = [],
    isFetching: isLoadingServices,
    error: servicesError,
  } = useServices({
    userId: user.id,
    page,
    pageSize,
  });

  const { mutate: upsertService, isPending: isSubmittingService } =
    useUpsertService();

  const { mutate: deleteService, isPending: isDeletingService } =
    useDeleteService();

  // Calculate remaining slots
  const MAX_SERVICES = 50;
  const remainingSlots = MAX_SERVICES - services.length;

  // On mobile, open modal when editingService changes
  useEffect(() => {
    if (isMobile && editingService && isEditable) {
      setIsServiceModalOpen(true);
    }
  }, [editingService, isMobile, isEditable]);

  // Service handlers
  const handleAddServiceClick = () => {
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

  const handleConfirmDeleteService = async () => {
    if (!serviceToDelete) return;

    deleteService({
      userId: user.id,
      serviceId: serviceToDelete.id,
      serviceName: serviceToDelete.name,
    });

    // If we're deleting the service we're editing, reset it
    if (editingService?.id === serviceToDelete.id) {
      setEditingService(null);
    }

    setIsConfirmDeleteOpen(false);
    setServiceToDelete(null);
  };

  const handleServiceFormSubmitSuccess = (
    data: ServiceFormValues & { id?: string },
  ) => {
    upsertService(
      {
        userId: user.id,
        data,
      },
      {
        onSuccess: () => {
          // Reset edit state on successful save
          setEditingService(null);
          setIsServiceModalOpen(false);
        },
      },
    );
  };

  // Error handling
  if (servicesError) {
    return (
      <Typography className="text-destructive">
        Error loading services. Please try again later.
        {servicesError instanceof Error && (
          <div className="text-sm">{servicesError.message}</div>
        )}
      </Typography>
    );
  }

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
            disabled={
              isLoadingServices || remainingSlots <= 0 || isSubmittingService
            }
          >
            <Plus className="h-4 w-4" />
            Add Service
          </Button>
        )}
      </div>

      {!isLoadingServices && remainingSlots <= 0 && isEditable && (
        <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-amber-800">
          <Typography className="text-sm">
            You have reached the maximum limit of {MAX_SERVICES} services. To
            add a new service, please delete an existing one first.
          </Typography>
        </div>
      )}

      {/* Mobile View - Just the services list */}
      {isMobile ? (
        isLoadingServices ? (
          <div className="grid grid-cols-1 gap-4">
            <ServiceCardSkeleton />
            <ServiceCardSkeleton />
          </div>
        ) : services.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {services.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                onEdit={handleEditService}
                onDelete={() => handleDeleteServiceClick(service)}
                isUpdating={
                  isSubmittingService && editingService?.id === service.id
                }
                isBeingEdited={editingService?.id === service.id}
                isEditable={isEditable}
                isDeletable={isEditable}
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
                ? 'space-y-4 lg:space-y-4 max-h-[650px] lg:max-h-none overflow-y-auto lg:overflow-visible pr-2 pb-4'
                : 'gap-4 grid grid-cols-1'
            }
          >
            {isLoadingServices ? (
              <>
                <ServiceCardSkeleton />
                <ServiceCardSkeleton />
              </>
            ) : services.length > 0 ? (
              <>
                {services.map((service) => (
                  <ServiceCard
                    key={service.id}
                    service={service}
                    onEdit={handleEditService}
                    onDelete={() => handleDeleteServiceClick(service)}
                    isUpdating={
                      isSubmittingService && editingService?.id === service.id
                    }
                    isBeingEdited={editingService?.id === service.id}
                    isEditable={isEditable}
                    isDeletable={isEditable}
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
