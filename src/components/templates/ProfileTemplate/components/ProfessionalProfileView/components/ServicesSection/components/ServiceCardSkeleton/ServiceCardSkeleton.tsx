import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function ServiceCardSkeleton() {
  return (
    <Card className="border border-border">
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-3/5 bg-muted" />{' '}
            {/* Title placeholder */}
            <div className="flex items-center space-x-1">
              <Skeleton className="h-4 w-4 rounded-full bg-muted" />{' '}
              {/* Icon placeholder */}
              <Skeleton className="h-4 w-1/4 bg-muted" />{' '}
              {/* Duration placeholder */}
            </div>
            <Skeleton className="h-5 w-1/3 bg-muted" />{' '}
            {/* Price placeholder */}
          </div>
          <div className="flex space-x-1">
            <Skeleton className="h-8 w-8 bg-muted" />{' '}
            {/* Edit button placeholder */}
            <Skeleton className="h-8 w-8 bg-muted" />{' '}
            {/* Delete button placeholder */}
          </div>
        </div>
        <Skeleton className="h-4 w-full mt-3 bg-muted" />{' '}
        {/* Description line 1 */}
        <Skeleton className="h-4 w-4/5 mt-1 bg-muted" />{' '}
        {/* Description line 2 */}
      </CardContent>
    </Card>
  );
}
