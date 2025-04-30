import { Card, CardContent } from '@/components/ui/card';
import { Typography } from '@/components/ui/typography';
import { Button } from '@/components/ui/button';
import { Clock, Pencil, Trash2 } from 'lucide-react';
import { ServiceUI } from '@/api/services/actions';

export type ServiceCardProps = {
  service: ServiceUI;
  onEdit: (service: ServiceUI) => void;
  onDelete: () => void;
};

export function ServiceCard({ service, onEdit, onDelete }: ServiceCardProps) {
  return (
    <Card className="border border-border">
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
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={onDelete}
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
