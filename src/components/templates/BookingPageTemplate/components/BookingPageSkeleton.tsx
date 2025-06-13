import { Skeleton } from '@/components/ui/skeleton';

export function BookingPageSkeleton() {
  return (
    <div className="p-6 space-y-8">
      {/* Timezone info skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-3 w-64" />
      </div>

      {/* Main form content skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left column - Service details and form */}
        <div className="space-y-6">
          {/* Selected service skeleton */}
          <div className="space-y-3">
            <Skeleton className="h-5 w-32" />
            <div className="p-4 border rounded-lg space-y-3">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-full" />
              <div className="flex justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
              </div>
            </div>
          </div>

          {/* Extra services skeleton */}
          <div className="space-y-3">
            <Skeleton className="h-5 w-36" />
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex items-center space-x-3 p-3 border rounded-lg"
                >
                  <Skeleton className="h-4 w-4" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          </div>

          {/* Payment method skeleton */}
          <div className="space-y-3">
            <Skeleton className="h-5 w-32" />
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="flex items-center space-x-3 p-3 border rounded-lg"
                >
                  <Skeleton className="h-4 w-4 rounded-full" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column - Date and time picker */}
        <div className="space-y-6">
          {/* Date picker skeleton */}
          <div className="space-y-3">
            <Skeleton className="h-5 w-36" />
            <div className="border rounded-lg p-4">
              <Skeleton className="h-64 w-full" />
            </div>
          </div>

          {/* Time slots skeleton */}
          <div className="space-y-3">
            <Skeleton className="h-5 w-36" />
            <div className="border rounded-lg p-4">
              <div className="grid grid-cols-3 gap-2">
                {Array.from({ length: 12 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Notes section skeleton */}
      <div className="space-y-3">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-20 w-full" />
      </div>

      {/* Tip section skeleton */}
      <div className="space-y-3">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Price summary skeleton */}
      <div className="space-y-3">
        <Skeleton className="h-5 w-32" />
        <div className="border rounded-lg p-4 space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </div>

      {/* Action button skeleton */}
      <Skeleton className="h-12 w-full" />
    </div>
  );
}
