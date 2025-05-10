import { CalendarIcon, ClockIcon } from 'lucide-react';
import { formatDate, formatTime } from '@/utils';
import { cn } from '@/utils';

export type DashboardTemplateDateTimeProps = {
  date: Date;
  time?: string;
  showIcons?: boolean;
  className?: string;
  variant?: 'default' | 'compact' | 'inline';
};

/**
 * A consistent component for displaying date and time across dashboard widgets
 */
export function DashboardTemplateDateTime({
  date,
  time,
  showIcons = false,
  className,
  variant = 'default',
}: DashboardTemplateDateTimeProps) {
  const formattedDate = formatDate(date);
  const formattedTime = time ? formatTime(time) : null;

  if (variant === 'inline') {
    return (
      <span className={cn('text-xs text-muted-foreground', className)}>
        {formattedDate}
        {formattedTime && ` at ${formattedTime}`}
      </span>
    );
  }

  if (variant === 'compact') {
    return (
      <div
        className={cn(
          'flex items-center space-x-1 text-xs text-muted-foreground',
          className,
        )}
      >
        {showIcons && <CalendarIcon className="h-3 w-3" />}
        <span>{formattedDate}</span>
        {formattedTime && (
          <>
            {showIcons && <ClockIcon className="h-3 w-3 ml-1" />}
            <span>{formattedTime}</span>
          </>
        )}
      </div>
    );
  }

  // Default variant
  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex items-center space-x-1 text-xs text-muted-foreground">
        {showIcons && <CalendarIcon className="h-3 w-3" />}
        <span>{formattedDate}</span>
      </div>
      {formattedTime && (
        <div className="flex items-center space-x-1 text-xs text-muted-foreground">
          {showIcons && <ClockIcon className="h-3 w-3" />}
          <span>{formattedTime}</span>
        </div>
      )}
    </div>
  );
}
