import { ServiceFormValues } from '@/components/forms/ServiceForm';
import { toast } from '@/components/ui/use-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { deleteService, getServices, upsertService } from './api';
import type { ServiceUI } from './types';

// Define query keys as constants for consistency
export const QUERY_KEYS = {
  services: (userId: string) => ['services', userId],
};

export function useServices(userId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.services(userId),
    queryFn: () => getServices(userId),
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!userId,
  });
}

export function useUpsertService() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ 
      userId, 
      data 
    }: { 
      userId: string; 
      data: ServiceFormValues & { id?: string };
    }) => upsertService(userId, data),
    onSuccess: (data, { userId }) => {
      // Invalidate relevant queries on success
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.services(userId) });
      toast({ 
        description: data.id 
          ? `Service "${data.name}" has been updated.` 
          : `Service "${data.name}" has been added.` 
      });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Error saving service',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
      });
    },
  });
}

export function useDeleteService() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ 
      userId, 
      serviceId,
    }: { 
      userId: string; 
      serviceId: string;
      serviceName: string;
    }) => deleteService(userId, serviceId),
    onMutate: async ({ userId, serviceId, serviceName }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.services(userId) });
      
      // Snapshot the previous value
      const previousServices = queryClient.getQueryData<ServiceUI[]>(QUERY_KEYS.services(userId));
      
      // Optimistically update to the new value
      if (previousServices) {
        queryClient.setQueryData<ServiceUI[]>(
          QUERY_KEYS.services(userId), 
          previousServices.filter(service => service.id !== serviceId)
        );
      }
      
      return { previousServices, serviceName };
    },
    onSuccess: (_, { serviceName }) => {
      toast({ 
        description: `Service "${serviceName}" has been successfully deleted.` 
      });
    },
    onError: (err, { userId }, context) => {
      // If the mutation fails, roll back
      if (context?.previousServices) {
        queryClient.setQueryData(QUERY_KEYS.services(userId), context.previousServices);
      }
      
      toast({
        variant: 'destructive',
        title: 'Error deleting service',
        description: err instanceof Error ? err.message : 'An unexpected error occurred',
      });
    },
    onSettled: (_, __, { userId }) => {
      // Refetch after error or success
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.services(userId) });
    },
  });
} 