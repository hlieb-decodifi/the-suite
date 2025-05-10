import { Card, CardContent } from '@/components/ui/card';
import { Typography } from '@/components/ui/typography';
import { cn } from '@/utils/cn';
import { ImageIcon } from 'lucide-react';

export type PortfolioEmptyStateProps = {
  isEditable?: boolean;
};

export function PortfolioEmptyState({
  isEditable = true,
}: PortfolioEmptyStateProps) {
  return (
    <Card className={cn('border bg-background/50')}>
      <CardContent className="flex flex-col items-center justify-center p-6 text-center">
        <div className="rounded-full bg-muted p-3 mb-3">
          <ImageIcon className="h-6 w-6 text-muted-foreground" />
        </div>
        <Typography variant="h4" className="text-muted-foreground mb-2">
          No Portfolio Photos
        </Typography>
        <Typography className="text-muted-foreground mb-4">
          {isEditable
            ? 'Upload photos to showcase your work and attract more clients.'
            : "This professional hasn't added any portfolio photos yet."}
        </Typography>
      </CardContent>
    </Card>
  );
}
