/* eslint-disable max-lines-per-function */
import { useState } from 'react';
import { Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { Typography } from '@/components/ui/typography';
import { Checkbox } from '@/components/ui/checkbox';
import { formatCurrency } from '@/utils/formatCurrency';
import { formatDuration } from '@/utils/formatDuration';
import { Button } from '@/components/ui/button';
import { cn } from '@/utils';

export type BookingFormServiceCardProps = {
  id: string;
  name: string;
  description?: string;
  duration: number;
  price: number;
  isSelected?: boolean;
  onSelect?: (id: string, checked: boolean) => void;
  isPrimary?: boolean;
};

export function BookingFormServiceCard({
  id,
  name,
  description,
  duration,
  price,
  isSelected,
  onSelect,
  isPrimary = false,
}: BookingFormServiceCardProps) {
  // Determine if we need a checkbox (for additional services) or not (for main service)
  const hasCheckbox = onSelect !== undefined;

  // Internal state for description expansion
  const [isExpanded, setIsExpanded] = useState(false);

  // Toggle description visibility
  const toggleDescription = () => {
    setIsExpanded((prev) => !prev);
  };

  return (
    <div
      className={cn(
        'rounded-md transition-colors',
        isPrimary
          ? 'border-2 border-primary/20 bg-primary/5'
          : 'border bg-muted/5 hover:bg-muted/10',
      )}
    >
      <div className="p-2 flex items-center gap-2">
        {hasCheckbox && (
          <Checkbox
            id={`service-${id}`}
            className="mt-0.5"
            checked={isSelected || false}
            onCheckedChange={(checked) => onSelect?.(id, checked === true)}
          />
        )}

        <div className="flex flex-1 justify-between items-center min-w-0">
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <label
                htmlFor={hasCheckbox ? `service-${id}` : undefined}
                className={cn(
                  'font-medium truncate',
                  hasCheckbox && 'cursor-pointer',
                )}
              >
                {name}
              </label>
              <div className="flex items-center text-xs text-muted-foreground shrink-0 whitespace-nowrap">
                <Clock className="h-3 w-3 mr-0.5" />
                <span>{formatDuration(duration)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 ml-2 shrink-0">
            <Typography className="font-medium text-primary">
              {formatCurrency(price)}
            </Typography>

            {description ? (
              <Button
                variant="ghost"
                size="icon"
                type="button"
                className="h-6 w-6 p-0"
                onClick={toggleDescription}
                aria-label={
                  isExpanded ? 'Hide description' : 'Show description'
                }
              >
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            ) : (
              !isPrimary && <div className="w-6 h-6" aria-hidden="true" />
            )}
          </div>
        </div>
      </div>

      {description && isExpanded && (
        <div
          className={cn(
            'p-2 pt-0 text-sm text-muted-foreground border-t border-muted/20',
            hasCheckbox && 'pl-8',
          )}
        >
          {description}
        </div>
      )}
    </div>
  );
}
