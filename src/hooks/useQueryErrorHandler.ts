'use client';

import { useToast } from '@/components/ui/use-toast';
import { formatErrorMessage, getErrorTitle } from '@/utils/errorHandler';
import { UseMutationResult, UseQueryResult } from '@tanstack/react-query';

/**
 * Hook that provides error handling functions for React Query operations
 */
export function useQueryErrorHandler() {
  const { toast } = useToast();

  /**
   * Handler for query/mutation errors
   */
  const handleError = (error: unknown) => {
    toast({
      variant: 'destructive',
      title: getErrorTitle(error),
      description: formatErrorMessage(error),
    });
  };

  /**
   * Utility to easily handle the result of a mutation
   */
  const handleMutationResult = <TData, TError, TVariables, TContext>(
    mutationResult: UseMutationResult<TData, TError, TVariables, TContext>,
    options?: {
      onSuccess?: (data: TData) => void;
    },
  ) => {
    if (mutationResult.isError && mutationResult.error) {
      handleError(mutationResult.error);
    } else if (mutationResult.isSuccess && options?.onSuccess) {
      options.onSuccess(mutationResult.data);
    }
  };

  /**
   * Utility to easily handle the result of a query
   */
  const handleQueryResult = <TData, TError>(
    queryResult: UseQueryResult<TData, TError>,
  ) => {
    if (queryResult.isError && queryResult.error) {
      handleError(queryResult.error);
    }
  };

  return {
    handleError,
    onError: handleError, // same function but named to match React Query convention
    handleMutationResult,
    handleQueryResult,
  };
}
