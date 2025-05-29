import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';

export default function DashboardMessagesLoading() {
  return (
    <div className="space-y-6">
      {/* Page Title */}
      <Skeleton className="h-8 w-32" />

      {/* Message Card */}
      <Card>
        <CardContent className="flex flex-col items-center justify-center text-center py-16">
          <Skeleton className="h-24 w-24 rounded-full mb-4" />
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-80 mb-1" />
          <Skeleton className="h-4 w-72 mb-1" />
          <Skeleton className="h-4 w-64 mb-4" />
          <Skeleton className="h-4 w-48" />
        </CardContent>
      </Card>
    </div>
  );
}
