'use client';

import { Typography } from '@/components/ui/typography';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus } from 'lucide-react';
import { ServiceCard } from './components/ServiceCard';
import { ServiceCardSkeleton } from './components/ServiceCardSkeleton';
import { ServiceUI } from '@/api/services/actions';

export type ServicesSectionProps = {
  services: ServiceUI[];
  isLoading: boolean;
  onAddService: () => void;
  onEditService: (service: ServiceUI) => void;
  onDeleteService: (service: ServiceUI) => void;
};

export function ServicesSection({
  services,
  isLoading,
  onAddService,
  onEditService,
  onDeleteService,
}: ServicesSectionProps) {
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
          onClick={onAddService}
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
              onEdit={onEditService}
              onDelete={() => onDeleteService(service)}
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
    </div>
  );
}
