'use client';

import {
  deleteServiceAction,
  getServicesAction,
  ServiceUI,
  upsertServiceAction,
} from '@/api/services/actions';
import { ServiceFormValues } from '@/components/forms/ServiceForm';
import { ConfirmDeleteModal } from '@/components/modals/ConfirmDeleteModal';
import { ServiceModal } from '@/components/modals/ServiceModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Typography } from '@/components/ui/typography';
import { toast } from '@/components/ui/use-toast';
import { User } from '@supabase/supabase-js';
import { Loader2, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ServiceCard } from './components/ServiceCard';

export type ServicesSectionProps = {
  user: User;
};

export function ServicesSection({ user }: ServicesSectionProps) {
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceUI | null>(null);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState<ServiceUI | null>(
    null,
  );
  const [services, setServices] = useState<ServiceUI[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchServices = async () => {
      setIsLoading(true);
      const result = await getServicesAction(user.id);

      if (result.success) {
        setServices(result.services || []);
      } else {
        toast({
          title: 'Error loading services',
          description: result.error || 'An unexpected error occurred.',
          variant: 'destructive',
        });
        setServices([]);
      }

      setIsLoading(false);
    };

    fetchServices();
  }, [user.id]);

  const handleAddServiceClick = () => {
    setEditingService(null);
    setIsServiceModalOpen(true);
  };

  const handleEditService = (service: ServiceUI) => {
    setEditingService(service);
    setIsServiceModalOpen(true);
  };

  const handleDeleteClick = (service: ServiceUI) => {
    setServiceToDelete(service);
    setIsConfirmDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!serviceToDelete) return;

    setIsDeleting(true);
    const result = await deleteServiceAction(user.id, serviceToDelete.id);
    setIsDeleting(false);

    if (result.success) {
      setServices((prev) => prev.filter((s) => s.id !== serviceToDelete.id));
      toast({
        title: 'Service deleted',
        description: `"${serviceToDelete.name}" has been successfully deleted.`,
      });
      setIsConfirmDeleteOpen(false);
      setServiceToDelete(null);
    } else {
      toast({
        title: 'Error deleting service',
        description: result.error || 'Could not delete the service.',
        variant: 'destructive',
      });
    }
  };

  const handleModalSubmitSuccess = async (
    data: ServiceFormValues & { id?: string },
  ) => {
    setIsSubmitting(true);
    const result = await upsertServiceAction(user.id, data);
    setIsSubmitting(false);

    if (result.success && result.service) {
      if (data.id) {
        setServices((prev) =>
          prev.map((s) => (s.id === data.id ? result.service! : s)),
        );
        toast({
          title: 'Service updated',
          description: `"${result.service.name}" has been updated.`,
        });
      } else {
        setServices((prev) => [result.service!, ...prev]);
        toast({
          title: 'Service added',
          description: `"${result.service.name}" has been added.`,
        });
      }
      setIsServiceModalOpen(false);
    } else {
      toast({
        title: 'Error saving service',
        description: result.error || 'Could not save the service.',
        variant: 'destructive',
      });
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
            Manage the services you offer (up to 10)
          </Typography>
        </div>
        <Button
          onClick={handleAddServiceClick}
          className="flex items-center gap-1"
          disabled={isLoading || services.length >= 10}
        >
          <Plus className="h-4 w-4" />
          Add Service
        </Button>
      </div>

      {!isLoading && services.length >= 10 && (
        <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-amber-800">
          <Typography className="text-sm">
            You have reached the maximum limit of 10 services. To add a new
            service, please delete an existing one first.
          </Typography>
        </div>
      )}

      {isLoading ? (
        <Card className="border border-border">
          <CardContent className="p-6 flex justify-center items-center space-x-2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <Typography className="text-muted-foreground">
              Loading services...
            </Typography>
          </CardContent>
        </Card>
      ) : services.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {services.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              onEdit={handleEditService}
              onDelete={() => handleDeleteClick(service)}
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

      <ServiceModal
        isOpen={isServiceModalOpen}
        onOpenChange={(open) => {
          if (!isSubmitting) setIsServiceModalOpen(open);
        }}
        onSubmitSuccess={handleModalSubmitSuccess}
        service={editingService}
        isSubmitting={isSubmitting}
      />

      <ConfirmDeleteModal
        isOpen={isConfirmDeleteOpen}
        onOpenChange={(open) => {
          if (!isDeleting) setIsConfirmDeleteOpen(open);
        }}
        onConfirm={confirmDelete}
        itemName={serviceToDelete?.name ?? 'this service'}
        title="Delete Service?"
        description={`Are you sure you want to delete the service "${serviceToDelete?.name ?? 'this service'}"? This action cannot be undone.`}
        isDeleting={isDeleting}
      />
    </div>
  );
}
