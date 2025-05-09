import { useCallback } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { BookingFormValues } from './schema';
import { ServiceListItem } from '@/components/templates/ServicesTemplate/types';

type UseCalculateTotalPriceProps = {
  service: ServiceListItem;
  extraServices: ServiceListItem[];
  form: UseFormReturn<BookingFormValues>;
};

export function useCalculateTotalPrice({
  service,
  extraServices,
  form,
}: UseCalculateTotalPriceProps) {
  return useCallback(() => {
    // Base service price
    let total = service.price;
    
    // Add extra services
    const selectedExtraServiceIds = form.watch('extraServiceIds') || [];
    const extraServicesTotal = extraServices
      .filter(extraService => selectedExtraServiceIds.includes(extraService.id))
      .reduce((sum, extraService) => sum + extraService.price, 0);
    
    total += extraServicesTotal;
    
    // Add service fee
    const serviceFee = 1.00; // Fixed $1 service fee
    total += serviceFee;
    
    // Add tip
    const tipAmount = form.watch('tipAmount') || 0;
    total += tipAmount;
    
    return total;
  }, [service.price, extraServices, form]);
} 