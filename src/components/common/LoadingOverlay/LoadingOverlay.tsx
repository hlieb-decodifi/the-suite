'use client';

import * as React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '@/utils/cn';
import { Loader } from '@/components/common/Loader';
import { type LoadingOverlayProps } from './types';

export const loadingOverlayVariants = cva(
  'fixed inset-0 flex items-center justify-center z-50 transition-opacity',
  {
    variants: {
      variant: {
        default: 'bg-background/80 backdrop-blur-sm',
        light: 'bg-background/50 backdrop-blur-sm',
        dark: 'bg-background/95 backdrop-blur-sm',
        solid: 'bg-background',
      },
      position: {
        center: 'items-center justify-center',
        top: 'items-start justify-center pt-[30vh]',
        bottom: 'items-end justify-center pb-[30vh]',
      },
    },
    defaultVariants: {
      variant: 'default',
      position: 'center',
    },
  },
);

/**
 * A full-page loading overlay with background that can be shown while content is loading
 */
export function LoadingOverlay({
  className,
  variant,
  position,
  isLoading = true,
  loaderSize = 'large',
  loadingText,
  speed = 'normal',
  ...props
}: LoadingOverlayProps) {
  if (!isLoading) return null;

  return (
    <div
      className={cn(loadingOverlayVariants({ variant, position, className }))}
      role="status"
      aria-label="Loading"
      {...props}
    >
      <div className="flex flex-col items-center gap-4">
        <Loader size={loaderSize} speed={speed} />
        {loadingText && (
          <p className="text-foreground/80 font-medium text-sm md:text-base">
            {loadingText}
          </p>
        )}
      </div>
    </div>
  );
}
