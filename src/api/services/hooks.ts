import { toast } from '@/components/ui/use-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { deleteService, getServices, upsertService } from './api';
import type { 
  DeleteServiceParams, 
  ServiceParams, 
  ServiceUI, 
  UpsertServiceParams 
} from '@/types/services';

// Define query keys as constants for consistency
export const QUERY_KEYS = {
  all: ['services'] as const,
  lists: () => [...QUERY_KEYS.all, 'list'] as const,
  list: (filters: ServiceParams) => [
    ...QUERY_KEYS.lists(),
    filters,
  ] as const,
  details: () => [...QUERY_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...QUERY_KEYS.details(), id] as const,
};

/**
 * Hook to fetch services with optional pagination and search
 */
export function useServices({
  userId,
  page = 1,
  pageSize = 20,
  search = '',
  enabled = true,
}: ServiceParams & { enabled?: boolean }) {
  return useQuery({
    queryKey: QUERY_KEYS.list({ userId, page, pageSize, search }),
    queryFn: () => getServices({ userId, page, pageSize, search }),
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!userId && enabled,
    placeholderData: (previousData) => previousData, // Use previous data as placeholder
  });
}

// Helper function for optimistic updates when creating/updating a service
function getOptimisticUpdate(data: UpsertServiceParams['data'], oldServices: ServiceUI[] = []) {
  if (data.id) {
    // Update existing service
    return oldServices.map(service => 
      service.id === data.id 
        ? { 
            ...service,
            name: data.name,
            description: data.description || '',
            price: data.price,
          } 
        : service
    );
  } else {
    // Add new service with temporary ID
    const tempId = `temp-${Date.now()}`;
    return [
      {
        id: tempId,
        name: data.name,
        description: data.description || '',
        price: data.price,
        duration: 'Saving...', // Placeholder until we get real data
        is_archived: false,
        archived_at: null,
      },
      ...oldServices,
    ];
  }
}

/**
 * Hook for creating or updating a service with optimistic updates
 */
export function useUpsertService() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (params: UpsertServiceParams) => upsertService(params),
    
    // When mutate is called:
    onMutate: async ({ userId, data }) => {
      const queryKey = QUERY_KEYS.list({ userId });
      
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey });
      
      // Snapshot the previous value
      const previousServices = queryClient.getQueryData<ServiceUI[]>(queryKey);
      
      // Perform optimistic update if we have previous data
      if (previousServices) {
        queryClient.setQueryData<ServiceUI[]>(
          queryKey, 
          getOptimisticUpdate(data, previousServices)
        );
      }
      
      return { previousServices };
    },
    
    // If the mutation succeeds, we don't need to roll back
    onSuccess: (_, { data: serviceData }) => {
      // Show success toast
      toast({ 
        description: serviceData.id 
          ? `Service "${serviceData.name}" has been updated.` 
          : `Service "${serviceData.name}" has been added.` 
      });
      
      // Invalidate relevant queries after success
      queryClient.invalidateQueries({ 
        queryKey: QUERY_KEYS.lists() 
      });
    },
    
    // If the mutation fails, roll back to the previous value
    onError: (error, { userId }, context) => {
      if (context?.previousServices) {
        queryClient.setQueryData(
          QUERY_KEYS.list({ userId }), 
          context.previousServices
        );
      }
      
      toast({
        variant: 'destructive',
        title: 'Error saving service',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
      });
    },
  });
}

/**
 * Hook for deleting a service with optimistic updates
 */
export function useDeleteService() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (params: DeleteServiceParams) => 
      deleteService({
        userId: params.userId,
        serviceId: params.serviceId,
      }),
      
    onMutate: async ({ userId, serviceId, serviceName }) => {
      const queryKey = QUERY_KEYS.list({ userId });
      
      // Cancel any outgoing refetches 
      await queryClient.cancelQueries({ queryKey });
      
      // Snapshot the previous value
      const previousServices = queryClient.getQueryData<ServiceUI[]>(queryKey);
      
      // Optimistically update to the new value
      if (previousServices) {
        queryClient.setQueryData<ServiceUI[]>(
          queryKey, 
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
        queryClient.setQueryData(
          QUERY_KEYS.list({ userId }), 
          context.previousServices
        );
      }
      
      toast({
        variant: 'destructive',
        title: 'Error deleting service',
        description: err instanceof Error ? err.message : 'An unexpected error occurred',
      });
    },
    
    onSettled: () => {
      // Refetch after error or success
      queryClient.invalidateQueries({ 
        queryKey: QUERY_KEYS.lists()
      });
    },
  });
} 