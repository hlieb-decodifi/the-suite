import { Card, CardContent } from '@/components/ui/card';
import { Typography } from '@/components/ui/typography';
import { Button } from '@/components/ui/button';
import { Clock, Pencil, Trash2 } from 'lucide-react';
import { ServiceUI } from '@/types/services';
import { cn } from '@/utils/cn';
import { ExpandableText } from '@/components/common/ExpandableText/ExpandableText';

export type ServiceCardProps = {
  service: ServiceUI;
  onEdit: (service: ServiceUI) => void;
  onDelete: () => void;
  isUpdating?: boolean;
  isBeingEdited?: boolean;
  isEditable?: boolean;
  isDeletable?: boolean;
};

export function ServiceCard({
  service,
  onEdit,
  onDelete,
  isUpdating = false,
  isBeingEdited = false,
  isEditable = true,
  isDeletable = true,
}: ServiceCardProps) {
  return (
    <Card
      className={cn(
        'border relative',
        isUpdating && 'opacity-70',
        isBeingEdited
          ? 'border-primary ring-1 ring-primary/20 shadow-sm'
          : 'border-border',
      )}
    >
      {isUpdating && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-background/50 rounded-md">
          <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <Typography
              variant="large"
              className="font-semibold text-foreground"
            >
              {service.name}
            </Typography>
            <div className="flex items-center gap-3">
              <Typography variant="p" className="leading-tight font-medium">
                ${service.price.toFixed(2)}
              </Typography>
              <div className="flex items-center space-x-1">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <Typography
                  variant="p"
                  className="leading-tight text-muted-foreground"
                >
                  {service.duration}
                </Typography>
              </div>
            </div>
          </div>
          <div className="flex space-x-1">
            {isEditable && (
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'h-8 w-8',
                  isBeingEdited ? 'text-primary' : 'text-muted-foreground',
                )}
                onClick={() => onEdit(service)}
                disabled={isUpdating}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            {isDeletable && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={onDelete}
                disabled={isUpdating}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        {service.description && (
          <ExpandableText
            text={service.description}
            maxLines={2}
            className="mt-1.5"
            variant="small"
            textClassName="text-muted-foreground text-justify"
          />
        )}
      </CardContent>
    </Card>
  );
}
