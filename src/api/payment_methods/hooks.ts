import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/components/ui/use-toast';
import {
  getAvailablePaymentMethodsAction,
  getProfessionalPaymentMethodsAction,
  updateProfessionalPaymentMethodsAction,
} from './index';

// Define query keys as constants for consistency
export const QUERY_KEYS = {
  availableMethods: () => ['paymentMethods', 'available'],
  professionalMethods: (userId: string) => ['paymentMethods', 'professional', userId],
};

export function useAvailablePaymentMethods(enabled: boolean = true) {
  return useQuery({
    queryKey: QUERY_KEYS.availableMethods(),
    queryFn: async () => {
      const result = await getAvailablePaymentMethodsAction();
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch available payment methods');
      }
      return result.methods;
    },
    staleTime: 1000 * 60 * 60, // 1 hour - these rarely change
    enabled: enabled,
  });
}

export function useProfessionalPaymentMethods(userId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.professionalMethods(userId),
    queryFn: async () => {
      const result = await getProfessionalPaymentMethodsAction(userId);
      if (!result.success) {
        // Don't throw error if it was just profile not found
        if (result.error === 'Professional profile not found.') {
          return [];
        }
        throw new Error(result.error || 'Failed to fetch professional payment methods');
      }
      return result.methods;
    },
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
      const result = await updateProfessionalPaymentMethodsAction({
        userId,
        selectedMethodIds,
      });
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to update payment methods');
      }
      return result;
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