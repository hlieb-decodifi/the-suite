'use client';

import * as React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '@/utils/cn';

import { type LoaderProps } from './types';

export const loaderVariants = cva(
  'rounded-full border-4 border-solid border-muted',
  {
    variants: {
      size: {
        small: 'h-4 w-4 border-2',
        default: 'h-8 w-8 border-4',
        large: 'h-12 w-12 border-[6px]',
        xl: 'h-20 w-20 border-[8px]',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  },
);

/**
 * A customizable loading spinner component
 */
export function Loader({
  className,
  size,
  speed = 'normal',
  ...props
}: LoaderProps) {
  // Determine animation speed class
  const animationClass =
    speed === 'slow'
      ? 'animate-custom-spin-slow'
      : speed === 'fast'
        ? 'animate-custom-spin-fast'
        : 'animate-custom-spin';

  return (
    <div className="relative flex items-center justify-center" {...props}>
      {/* Static background circle */}
      <div
        className={cn(loaderVariants({ size, className }))}
        aria-hidden="true"
      />

      {/* Spinner element */}
      <div
        className={cn(
          'absolute rounded-full border-t-primary border-l-transparent border-r-transparent border-b-transparent border-solid',
          animationClass,
          {
            'h-4 w-4 border-2': size === 'small',
            'h-8 w-8 border-4': size === 'default' || !size,
            'h-12 w-12 border-[6px]': size === 'large',
            'h-20 w-20 border-[8px]': size === 'xl',
          },
        )}
        role="status"
        aria-label="Loading"
      />
    </div>
  );
}
