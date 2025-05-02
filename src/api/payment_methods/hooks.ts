import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/components/ui/use-toast';
import {
  getAvailablePaymentMethods,
  getProfessionalPaymentMethods,
  updateProfessionalPaymentMethods,
} from './api';

// Define query keys as constants for consistency
export const QUERY_KEYS = {
  availableMethods: () => ['paymentMethods', 'available'],
  professionalMethods: (userId: string) => ['paymentMethods', 'professional', userId],
};

export function useAvailablePaymentMethods(enabled: boolean = true) {
  return useQuery({
    queryKey: QUERY_KEYS.availableMethods(),
    queryFn: () => getAvailablePaymentMethods(),
    staleTime: 1000 * 60 * 60, // 1 hour - these rarely change
    enabled: enabled,
  });
}

export function useProfessionalPaymentMethods(userId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.professionalMethods(userId),
    queryFn: () => getProfessionalPaymentMethods(userId),
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!userId,
  });
}

export function useUpdateProfessionalPaymentMethods() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      userId, 
      selectedMethodIds 
    }: { 
      userId: string; 
      selectedMethodIds: string[];
    }) => {
      return updateProfessionalPaymentMethods({
        userId,
        selectedMethodIds,
      });
    },
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.professionalMethods(userId) });
      toast({ description: 'Payment methods updated successfully.' });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Error saving payment methods',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
      });
    },
  });
} 