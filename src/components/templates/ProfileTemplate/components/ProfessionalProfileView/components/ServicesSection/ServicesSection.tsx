'use client';

import { useState } from 'react';
import { User } from '@supabase/supabase-js';
import { Typography } from '@/components/ui/typography';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, Plus, Pencil, Trash2 } from 'lucide-react';
import { ServiceModal } from '@/components/modals/ServiceModal';
import { ConfirmDeleteModal } from '@/components/modals/ConfirmDeleteModal';
import { ServiceFormValues } from '@/components/forms/ServiceForm';

export type ServicesSectionProps = {
  user: User;
};

// Define a type for service
type Service = {
  id: string;
  name: string;
  price: number;
  duration: string;
  description: string;
};

// This helper component reduces the main component's line count
function ServiceCard({
  service,
  onEdit,
  onDelete,
}: {
  service: Service;
  onEdit: (service: Service) => void;
  onDelete: () => void;
}) {
  return (
    <Card className="border border-border">
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <div>
            <Typography variant="h4" className="font-bold text-foreground">
              {service.name}
            </Typography>
            <div className="flex items-center space-x-1 mt-1">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <Typography variant="small" className="text-muted-foreground">
                {service.duration}
              </Typography>
            </div>
            <Typography className="mt-2">
              ${service.price.toFixed(2)}
            </Typography>
          </div>
          <div className="flex space-x-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground"
              onClick={() => onEdit(service)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {service.description && (
          <Typography className="mt-3 text-muted-foreground">
            {service.description}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

// Helper to format duration from numbers to string (move to utils?)
const formatDuration = (hours?: number, minutes?: number): string => {
  const h = hours ?? 0;
  const m = minutes ?? 0;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  if (m > 0) return `${m}m`;
  return '0m'; // Return a default like '0m' if both are 0
};

export function ServicesSection({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  user,
}: ServicesSectionProps) {
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState<Service | null>(null);

  const [services, setServices] = useState<Service[]>([
    {
      id: '1',
      name: 'Haircut',
      price: 45.0,
      duration: '45m',
      description:
        'Professional haircut includes consultation, wash, cut, and style.',
    },
    {
      id: '2',
      name: 'Hair Coloring',
      price: 85.0,
      duration: '2h',
      description:
        'Full hair coloring service with premium products. Includes wash and style.',
    },
    {
      id: '3',
      name: 'Blow Dry & Style',
      price: 35.0,
      duration: '30m',
      description: 'Professional blow dry and styling with premium products.',
    },
  ]);

  const handleAddServiceClick = () => {
    setEditingService(null);
    setIsServiceModalOpen(true);
  };

  const handleEditService = (service: Service) => {
    setEditingService(service);
    setIsServiceModalOpen(true);
  };

  const handleDeleteClick = (service: Service) => {
    setServiceToDelete(service);
    setIsConfirmDeleteOpen(true);
  };

  const confirmDelete = () => {
    if (!serviceToDelete) return;

    console.log('Confirmed delete service', serviceToDelete.id);
    setServices((prev) => prev.filter((s) => s.id !== serviceToDelete.id));

    setIsConfirmDeleteOpen(false);
    setServiceToDelete(null);
  };

  const handleModalSubmitSuccess = (
    data: ServiceFormValues & { id?: string },
  ) => {
    const durationString = formatDuration(
      data.durationHours,
      data.durationMinutes,
    );

    if (data.id) {
      const updatedService: Service = {
        id: data.id,
        name: data.name,
        price: data.price,
        duration: durationString,
        description: data.description ?? '',
      };
      setServices((prev) =>
        prev.map((s) => (s.id === data.id ? updatedService : s)),
      );
    } else {
      const newService: Service = {
        id: crypto.randomUUID(),
        name: data.name,
        price: data.price,
        duration: durationString,
        description: data.description ?? '',
      };
      setServices((prev) => [...prev, newService]);
    }
    setIsServiceModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <Typography variant="h2" className="font-bold text-foreground">
            Services
          </Typography>
          <Typography className="text-muted-foreground">
            Manage the services you offer to your clients
          </Typography>
        </div>
        <Button
          onClick={handleAddServiceClick}
          className="flex items-center gap-1"
        >
          <Plus className="h-4 w-4" />
          Add Service
        </Button>
      </div>

      {/* Conditional Rendering: Grid or Placeholder */}
      {services.length > 0 ? (
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
            {/* Optional: Add the button here too for easier access */}
            {/* <Button 
              onClick={handleAddServiceClick}
              className="flex items-center gap-1 mx-auto"
            >
              <Plus className="h-4 w-4" />
              Add Service
            </Button> */}
          </CardContent>
        </Card>
      )}

      {/* Service Add/Edit Modal */}
      <ServiceModal
        isOpen={isServiceModalOpen}
        onOpenChange={setIsServiceModalOpen}
        onSubmitSuccess={handleModalSubmitSuccess}
        service={editingService}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={isConfirmDeleteOpen}
        onOpenChange={setIsConfirmDeleteOpen}
        onConfirm={confirmDelete}
        itemName={serviceToDelete?.name ?? 'this service'}
        title="Delete Service?"
        description={`Are you sure you want to delete the service "${serviceToDelete?.name ?? 'this service'}"? This action cannot be undone.`}
      />
    </div>
  );
}
