import { useState } from 'react';
import { ChevronUp } from 'lucide-react';
import { Typography } from '@/components/ui/typography';
import { Button } from '@/components/ui/button';
import { ServiceListItem } from '@/components/templates/ServicesTemplate/types';
import { BookingFormServiceCard } from './BookingFormServiceCard';

export type BookingFormExtraServicesProps = {
  extraServices: ServiceListItem[];
  isLoadingExtraServices: boolean;
  form: {
    watch: (name: 'extraServiceIds') => string[] | undefined;
    setValue: (name: 'extraServiceIds', value: string[]) => void;
  };
};

// Helper component for rendering loading state
function LoadingExtraServices() {
  return (
    <div className="p-4 border rounded-md bg-muted/10 flex items-center justify-center">
      <Typography variant="small" className="text-muted-foreground">
        Loading additional services...
      </Typography>
    </div>
  );
}

// Helper component for rendering no services available
function NoExtraServices() {
  return (
    <div className="p-4 border rounded-md bg-muted/10">
      <Typography variant="small" className="text-muted-foreground">
        No additional services available
      </Typography>
    </div>
  );
}

// Helper component for rendering the list of services
function ExtraServicesList({
  extraServices,
  form,
}: {
  extraServices: ServiceListItem[];
  form: {
    watch: (name: 'extraServiceIds') => string[] | undefined;
    setValue: (name: 'extraServiceIds', value: string[]) => void;
  };
}) {
  return (
    <div className="space-y-2">
      {extraServices.map((extraService) => (
        <BookingFormServiceCard
          key={extraService.id}
          id={extraService.id}
          name={extraService.name}
          description={extraService.description}
          duration={extraService.duration}
          price={extraService.price}
          isSelected={
            form.watch('extraServiceIds')?.includes(extraService.id) || false
          }
          onSelect={(id, checked) => {
            const extraServiceIds = form.watch('extraServiceIds') || [];
            if (checked) {
              form.setValue('extraServiceIds', [...extraServiceIds, id]);
            } else {
              form.setValue(
                'extraServiceIds',
                extraServiceIds.filter((value) => value !== id),
              );
            }
          }}
        />
      ))}
    </div>
  );
}

// Helper component for the collapsed summary
function CollapsedSummary({
  selectedCount,
  totalAvailable,
  onExpand,
}: {
  selectedCount: number;
  totalAvailable: number;
  onExpand: () => void;
}) {
  return (
    <div className="border rounded-md px-4 py-3 bg-muted/5">
      <div className="flex items-center justify-between">
        {selectedCount > 0 ? (
          <Typography variant="small" className="text-muted-foreground">
            <span className="font-medium text-foreground">{selectedCount}</span>{' '}
            additional service{selectedCount !== 1 ? 's' : ''} selected
          </Typography>
        ) : (
          <Typography variant="small" className="text-muted-foreground">
            {totalAvailable} additional service{totalAvailable !== 1 ? 's' : ''}{' '}
            available
          </Typography>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs font-medium text-primary"
          onClick={onExpand}
        >
          {selectedCount > 0 ? 'Manage selections' : 'Browse options'}
        </Button>
      </div>
    </div>
  );
}

export function BookingFormExtraServices({
  extraServices,
  isLoadingExtraServices,
  form,
}: BookingFormExtraServicesProps) {
  // Track if extra services section is expanded - default to collapsed
  const [isExpanded, setIsExpanded] = useState(false);

  // Count of selected extra services
  const selectedExtraServicesCount = form.watch('extraServiceIds')?.length || 0;

  // If no services and not loading, don't render anything
  if (extraServices.length === 0 && !isLoadingExtraServices) {
    return null;
  }

  return (
    <div className="space-y-2">
      {/* Header with toggle control */}
      <div className="flex items-center justify-between">
        {isExpanded && (
          <Button
            variant="ghost"
            size="sm"
            type="button"
            className="h-6 px-2 gap-1 text-xs font-medium text-primary hover:text-primary"
            onClick={() => setIsExpanded(false)}
          >
            <ChevronUp className="size-3" />
            <span>Hide options</span>
          </Button>
        )}
      </div>

      {/* Content - either expanded list or collapsed summary */}
      {isExpanded ? (
        <>
          {isLoadingExtraServices ? (
            <LoadingExtraServices />
          ) : extraServices.length > 0 ? (
            <ExtraServicesList extraServices={extraServices} form={form} />
          ) : (
            <NoExtraServices />
          )}
        </>
      ) : (
        <CollapsedSummary
          selectedCount={selectedExtraServicesCount}
          totalAvailable={extraServices.length}
          onExpand={() => setIsExpanded(true)}
        />
      )}
    </div>
  );
}
