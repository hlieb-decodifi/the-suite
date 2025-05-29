import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function DashboardAppointmentsLoading() {
  return (
    <div className="space-y-6">
      {/* Header with title and filter button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-10 w-24" />
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center space-x-1 overflow-x-auto pb-1">
        <Tabs defaultValue="upcoming" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="upcoming" disabled>
              <Skeleton className="h-4 w-20" />
            </TabsTrigger>
            <TabsTrigger value="today" disabled>
              <Skeleton className="h-4 w-20" />
            </TabsTrigger>
            <TabsTrigger value="completed" disabled>
              <Skeleton className="h-4 w-20" />
            </TabsTrigger>
            <TabsTrigger value="cancelled" disabled>
              <Skeleton className="h-4 w-20" />
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Appointment Cards */}
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-0">
              <div className="p-4">
                {/* Card Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div className="flex flex-col gap-1">
                    <Skeleton className="h-6 w-40" />
                    <div className="flex items-center gap-1.5">
                      <Skeleton className="h-4 w-4 rounded-full" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  </div>
                  <Skeleton className="h-6 w-24 rounded-full" />
                </div>

                {/* Card Details */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-5 rounded-full" />
                    <div>
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-5 w-24 mt-1" />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-5 rounded-full" />
                    <div>
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-5 w-32 mt-1" />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-5 rounded-full" />
                    <div>
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-5 w-24 mt-1" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Footer */}
              <div className="flex justify-end gap-2 p-4 pt-0">
                <Skeleton className="h-9 w-28" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
