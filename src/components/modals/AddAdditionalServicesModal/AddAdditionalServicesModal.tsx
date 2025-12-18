'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Typography } from '@/components/ui/typography';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Loader2, Clock } from 'lucide-react';
import { formatCurrency } from '@/utils/formatCurrency';
import { formatDuration } from '@/utils/formatDuration';
import { useToast } from '@/components/ui/use-toast';
import { getServices } from '@/api/services/api';
import { addAdditionalServices } from '@/components/pages/BookingDetailPage/actions';

export type ServiceOption = {
  id: string;
  name: string;
  price: number;
  duration: string;
  description: string;
};

export type AddAdditionalServicesModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (result: {
    newTotal: number;
    servicesAdded: Array<{
      id: string;
      name: string;
      price: number;
      duration: number;
    }>;
  }) => void;
  appointmentId: string;
  professionalUserId: string;
  currentServices: Array<{ service_id: string; services: { name: string } }>;
};

export function AddAdditionalServicesModal({
  isOpen,
  onClose,
  onSuccess,
  appointmentId,
  professionalUserId,
  currentServices,
}: AddAdditionalServicesModalProps) {
  const [availableServices, setAvailableServices] = useState<ServiceOption[]>(
    [],
  );
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingServices, setIsLoadingServices] = useState(false);
  const { toast } = useToast();

  // Get currently booked service IDs to filter them out
  const currentServiceIds = currentServices.map((bs) => bs.service_id);

  useEffect(() => {
    if (isOpen) {
      loadAvailableServices();
    }
  }, [isOpen, professionalUserId]);

  const loadAvailableServices = async () => {
    setIsLoadingServices(true);
    try {
      const services = await getServices({
        userId: professionalUserId,
        page: 1,
        pageSize: 100, // Get all services
      });

      // Filter out services that are already in the booking
      const availableServices = services.filter(
        (service) => !currentServiceIds.includes(service.id),
      );

      setAvailableServices(availableServices);
    } catch (error) {
      console.error('Error loading services:', error);
      toast({
        title: 'Error',
        description: 'Failed to load available services',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingServices(false);
    }
  };

  const handleServiceSelection = (serviceId: string, checked: boolean) => {
    if (checked) {
      setSelectedServiceIds((prev) => [...prev, serviceId]);
    } else {
      setSelectedServiceIds((prev) => prev.filter((id) => id !== serviceId));
    }
  };

  const handleAddServices = async () => {
    if (selectedServiceIds.length === 0) {
      toast({
        title: 'No services selected',
        description: 'Please select at least one service to add',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await addAdditionalServices({
        appointmentId,
        additionalServiceIds: selectedServiceIds,
      });

      if (result.success && result.newTotal && result.servicesAdded) {
        toast({
          title: 'Services added successfully',
          description: `Added ${result.servicesAdded.length} service(s). New total: ${formatCurrency(result.newTotal)}`,
        });
        onSuccess({
          newTotal: result.newTotal,
          servicesAdded: result.servicesAdded,
        });
        onClose();
      } else {
        toast({
          title: 'Error adding services',
          description: result.error || 'Failed to add services',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error adding services:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const selectedServices = availableServices.filter((service) =>
    selectedServiceIds.includes(service.id),
  );

  const totalAdditionalCost = selectedServices.reduce(
    (total, service) => total + service.price,
    0,
  );

  const totalAdditionalDuration = selectedServices.reduce((total, service) => {
    // Convert duration string like "2h 30m" to minutes
    const duration = service.duration;
    const hours = duration.match(/(\d+)h/)?.[1] || '0';
    const minutes = duration.match(/(\d+)m/)?.[1] || '0';
    return total + parseInt(hours) * 60 + parseInt(minutes);
  }, 0);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-w-3xl w-full max-h-[90vh] flex flex-col"
        closeButton={false}
      >
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-xl">Add Additional Services</DialogTitle>
          <DialogDescription>
            Select additional services to add to this appointment
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col overflow-hidden">
          {isLoadingServices ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
              <Typography className="ml-2">Loading services...</Typography>
            </div>
          ) : availableServices.length === 0 ? (
            <div className="text-center py-8">
              <Typography variant="muted">
                No additional services available to add
              </Typography>
            </div>
          ) : (
            <>
              {/* Available Services - Scrollable Section */}
              <div className="flex-1 overflow-auto space-y-4 pr-2">
                <Typography className="font-medium sticky top-0 bg-background py-2 z-10">
                  Available Services
                </Typography>
                <div className="space-y-4">
                  {availableServices.map((service) => (
                    <div
                      key={service.id}
                      className="flex items-start gap-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <Checkbox
                        id={service.id}
                        checked={selectedServiceIds.includes(service.id)}
                        onCheckedChange={(checked) =>
                          handleServiceSelection(service.id, checked as boolean)
                        }
                        className="mt-1"
                      />
                      <div className="flex-1 space-y-2">
                        <label
                          htmlFor={service.id}
                          className="text-base font-medium leading-none cursor-pointer block"
                        >
                          {service.name}
                        </label>
                        {service.description && (
                          <Typography
                            variant="small"
                            className="text-muted-foreground"
                          >
                            {service.description}
                          </Typography>
                        )}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <Typography className="text-muted-foreground">
                              Duration:
                            </Typography>
                            <Typography className="font-medium">
                              {service.duration}
                            </Typography>
                          </div>
                          <div className="flex items-center gap-2">
                            <Typography className="text-muted-foreground">
                              Price:
                            </Typography>
                            <Typography className="font-medium">
                              {formatCurrency(service.price)}
                            </Typography>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Selection Summary - Fixed at Bottom */}
              {selectedServices.length > 0 && (
                <div className="flex-shrink-0 pt-4 border-t bg-background">
                  <div className="space-y-3">
                    <Typography className="font-medium">
                      Selected Services Summary
                    </Typography>
                    <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                      {selectedServices.map((service) => (
                        <div
                          key={service.id}
                          className="flex justify-between items-center"
                        >
                          <Typography variant="small">
                            {service.name}
                          </Typography>
                          <Typography variant="small" className="font-medium">
                            {formatCurrency(service.price)}
                          </Typography>
                        </div>
                      ))}
                      <Separator />
                      <div className="flex justify-between items-center">
                        <Typography className="font-medium">
                          Total Additional Cost:
                        </Typography>
                        <Typography className="font-medium text-primary">
                          {formatCurrency(totalAdditionalCost)}
                        </Typography>
                      </div>
                      <div className="flex justify-between items-center">
                        <Typography className="font-medium">
                          Additional Duration:
                        </Typography>
                        <Typography className="font-medium">
                          {formatDuration(totalAdditionalDuration)}
                        </Typography>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter className="flex-shrink-0">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleAddServices}
            disabled={isLoading || selectedServiceIds.length === 0}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Adding Services...
              </>
            ) : (
              `Add ${selectedServiceIds.length} Service${selectedServiceIds.length !== 1 ? 's' : ''}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
