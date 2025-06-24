import { useCallback, useEffect, useState } from 'react';
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
  const [serviceFee, setServiceFee] = useState(1.00); // Default fallback

  // Load service fee from database on component mount
  useEffect(() => {
    async function loadServiceFee() {
      try {
        const { getServiceFeeAction } = await import('@/server/domains/admin/actions');
        const result = await getServiceFeeAction();
        if (result.success && result.fee) {
          setServiceFee(result.fee);
        }
      } catch (error) {
        console.error('Failed to load service fee:', error);
        // Keep default value of 1.00
      }
    }
    
    loadServiceFee();
  }, []);

  return useCallback(() => {
    // Base service price
    let total = service.price;
    
    // Add extra services
    const selectedExtraServiceIds = form.watch('extraServiceIds') || [];
    const extraServicesTotal = extraServices
      .filter(extraService => selectedExtraServiceIds.includes(extraService.id))
      .reduce((sum, extraService) => sum + extraService.price, 0);
    
    total += extraServicesTotal;
    
    // Add service fee from database
    total += serviceFee;
    
    // Add tip
    const tipAmount = form.watch('tipAmount') || 0;
    total += tipAmount;
    
    return total;
  }, [service.price, extraServices, form, serviceFee]);
} 