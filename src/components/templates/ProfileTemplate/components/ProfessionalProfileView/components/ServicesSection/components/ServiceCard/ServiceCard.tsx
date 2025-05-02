import { Card, CardContent } from '@/components/ui/card';
import { Typography } from '@/components/ui/typography';
import { Button } from '@/components/ui/button';
import { Clock, Pencil, Trash2 } from 'lucide-react';
import { ServiceUI } from '@/types/services';

export type ServiceCardProps = {
  service: ServiceUI;
  onEdit: (service: ServiceUI) => void;
  onDelete: () => void;
  isUpdating?: boolean;
};

export function ServiceCard({
  service,
  onEdit,
  onDelete,
  isUpdating = false,
}: ServiceCardProps) {
  return (
    <Card
      className={`border border-border relative ${isUpdating ? 'opacity-70' : ''}`}
    >
      {isUpdating && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-background/50 rounded-md">
          <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <div>
            <Typography variant="h4" className="font-bold text-foreground">
              {service.name}
            </Typography>
            <div className="flex items-center space-x-1 mt-1">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <Typography variant="small" className="text-muted-foreground">
                {service.duration}
              </Typography>
            </div>
            <Typography className="mt-2">
              ${service.price.toFixed(2)}
            </Typography>
          </div>
          <div className="flex space-x-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground"
              onClick={() => onEdit(service)}
              disabled={isUpdating}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={onDelete}
              disabled={isUpdating}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {service.description && (
          <Typography className="mt-3 text-muted-foreground">
            {service.description}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
