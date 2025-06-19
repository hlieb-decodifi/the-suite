'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/utils/cn';

export type MessageBadgeProps = {
  count: number;
  size?: 'sm' | 'md';
  variant?: 'default' | 'active';
  className?: string;
};

export function MessageBadge({
  count,
  size = 'md',
  variant = 'default',
  className,
}: MessageBadgeProps) {
  if (count <= 0) return null;

  const displayCount = count > 9 ? '9+' : count.toString();

  return (
    <Badge
      className={cn(
        'font-medium border',
        {
          // Size variants
          'h-4 px-1.5 text-xs': size === 'sm',
          'h-5 px-1.5 text-xs': size === 'md',

          // Color variants
          'bg-primary text-white border-primary': variant === 'default',
          'bg-white text-primary border-white/20': variant === 'active',
        },
        className,
      )}
    >
      {displayCount}
    </Badge>
  );
}
