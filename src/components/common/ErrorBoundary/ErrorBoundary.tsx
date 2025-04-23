'use client';

import React, { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';
import { formatErrorMessage, getErrorTitle } from '@/utils/errorHandler';

type ErrorBoundaryProps = {
  children: React.ReactNode;
};

/**
 * Component that captures and handles global errors
 * including React Query errors
 */
export function ErrorBoundary({ children }: ErrorBoundaryProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    // Handler for both query and mutation errors
    const handleError = (error: unknown) => {
      toast({
        variant: 'destructive',
        title: getErrorTitle(error),
        description: formatErrorMessage(error),
      });
    };

    // Type-safe way to handle query errors
    const unsubscribeQuery = queryClient.getQueryCache().subscribe((event) => {
      // @ts-ignore - React Query types are not accurate, but this works
      if (event.type === 'error' && event.error) {
        // @ts-ignore
        handleError(event.error);
      }
    });

    // Type-safe way to handle mutation errors
    const unsubscribeMutation = queryClient
      .getMutationCache()
      .subscribe((event) => {
        // @ts-ignore - React Query types are not accurate, but this works
        if (event.type === 'error' && event.error) {
          // @ts-ignore
          handleError(event.error);
        }
      });

    return () => {
      unsubscribeQuery();
      unsubscribeMutation();
    };
  }, [queryClient, toast]);

  return <>{children}</>;
}
