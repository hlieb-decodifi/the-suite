'use client';

import { useState } from 'react';
import { User } from '@supabase/supabase-js';
import { Typography } from '@/components/ui/typography';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, Plus, Pencil, Trash2 } from 'lucide-react';

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
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
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
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => onEdit(service.id)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={() => onDelete(service.id)}
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

export function ServicesSection({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  user,
}: ServicesSectionProps) {
  const [isAddingService, setIsAddingService] = useState(false);

  // Mock data - would come from API in a real app
  const services = [
    {
      id: '1',
      name: 'Haircut',
      price: 45.0,
      duration: '45 min',
      description:
        'Professional haircut includes consultation, wash, cut, and style.',
    },
    {
      id: '2',
      name: 'Hair Coloring',
      price: 85.0,
      duration: '120 min',
      description:
        'Full hair coloring service with premium products. Includes wash and style.',
    },
    {
      id: '3',
      name: 'Blow Dry & Style',
      price: 35.0,
      duration: '30 min',
      description: 'Professional blow dry and styling with premium products.',
    },
  ];

  const handleEditService = (id: string) => {
    // Would handle editing service in a real app
    console.log('Edit service', id);
  };

  const handleDeleteService = (id: string) => {
    // Would handle deleting service in a real app
    console.log('Delete service', id);
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
          onClick={() => setIsAddingService(true)}
          className="flex items-center gap-1"
        >
          <Plus className="h-4 w-4" />
          Add Service
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {services.map((service) => (
          <ServiceCard
            key={service.id}
            service={service}
            onEdit={handleEditService}
            onDelete={handleDeleteService}
          />
        ))}
      </div>

      {isAddingService && (
        <Card className="border border-primary bg-background p-4">
          <Typography variant="h3" className="font-bold text-foreground mb-4">
            Add New Service
          </Typography>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setIsAddingService(false)}>
              Cancel
            </Button>
            <Button onClick={() => setIsAddingService(false)}>
              Save Service
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
