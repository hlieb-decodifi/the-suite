/* eslint-disable max-lines-per-function */
'use client';

import { useState } from 'react';
import { User } from '@supabase/supabase-js';
import { Typography } from '@/components/ui/typography';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus } from 'lucide-react';
import { ServiceCard } from './components/ServiceCard';
import { ServiceCardSkeleton } from './components/ServiceCardSkeleton';
import { ServiceModal } from '@/components/modals/ServiceModal';
import { ConfirmDeleteModal } from '@/components/modals/ConfirmDeleteModal';
import { ServiceFormValues } from '@/components/forms/ServiceForm';
import { ServiceUI } from '@/types/services';
import {
  useServices,
  useUpsertService,
  useDeleteService,
} from '@/api/services/hooks';

export type ServicesSectionProps = {
  user: User;
};

export function ServicesSection({ user }: ServicesSectionProps) {
  // State for modals
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceUI | null>(null);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState<ServiceUI | null>(
    null,
  );

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

  // Service handlers
  const handleAddServiceClick = () => {
    setEditingService(null);
    setIsServiceModalOpen(true);
  };

  const handleEditService = (service: ServiceUI) => {
    setEditingService(service);
    setIsServiceModalOpen(true);
  };

  const handleDeleteServiceClick = (service: ServiceUI) => {
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

    setIsConfirmDeleteOpen(false);
    setServiceToDelete(null);
  };

  const handleServiceModalSubmitSuccess = (
    data: ServiceFormValues & { id?: string },
  ) => {
    upsertService({
      userId: user.id,
      data,
    });

    setIsServiceModalOpen(false);
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
            Manage the services you offer (up to 10)
          </Typography>
        </div>
        <Button
          onClick={handleAddServiceClick}
          className="flex items-center gap-1"
          disabled={
            isLoadingServices || services.length >= 10 || isSubmittingService
          }
        >
          <Plus className="h-4 w-4" />
          Add Service
        </Button>
      </div>

      {!isLoadingServices && services.length >= 10 && (
        <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-amber-800">
          <Typography className="text-sm">
            You have reached the maximum limit of 10 services. To add a new
            service, please delete an existing one first.
          </Typography>
        </div>
      )}

      {isLoadingServices ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ServiceCardSkeleton />
          <ServiceCardSkeleton />
        </div>
      ) : services.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {services.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              onEdit={handleEditService}
              onDelete={() => handleDeleteServiceClick(service)}
            />
          ))}
        </div>
      ) : (
        <Card className="border border-dashed border-border bg-background/50">
          <CardContent className="p-6 text-center">
            <Typography variant="h4" className="text-muted-foreground mb-2">
              No Services Yet
            </Typography>
            <Typography className="text-muted-foreground mb-4">
              Click "Add Service" to offer your first service to clients.
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Service Modal */}
      <ServiceModal
        isOpen={isServiceModalOpen}
        onOpenChange={isSubmittingService ? () => {} : setIsServiceModalOpen}
        onSubmitSuccess={handleServiceModalSubmitSuccess}
        service={editingService}
        isSubmitting={isSubmittingService}
      />

      {/* Confirm Delete Modal */}
      <ConfirmDeleteModal
        isOpen={isConfirmDeleteOpen}
        onOpenChange={isDeletingService ? () => {} : setIsConfirmDeleteOpen}
        onConfirm={handleConfirmDeleteService}
        itemName={serviceToDelete?.name ?? 'this service'}
        title="Delete Service?"
        description={`Are you sure you want to delete the service "${serviceToDelete?.name ?? 'this service'}"? This action cannot be undone.`}
        isDeleting={isDeletingService}
      />
    </div>
  );
}
