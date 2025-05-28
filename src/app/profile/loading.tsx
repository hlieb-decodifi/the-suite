import { Skeleton } from '@/components/ui/skeleton';

export default function ProfileLoading() {
  return (
    <div className="mx-auto">
      {/* Page Header Skeleton */}
      <div className="flex flex-col md:flex-row justify-between items-start mb-6 gap-4">
        <div>
          <Skeleton className="h-10 w-60" />
          <Skeleton className="h-5 w-96 mt-2" />
        </div>
        <div className="flex flex-col md:flex-row items-stretch gap-3 w-full md:w-auto">
          <Skeleton className="h-10 w-full md:w-32" />
        </div>
      </div>

      {/* Content Area Skeleton */}
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Main Content Area */}
          <div className="md:col-span-2 space-y-8">
            {/* Header Section */}
            <div className="space-y-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>

            {/* Overview Section */}
            <div className="space-y-4">
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          </div>

          {/* Sidebar */}
          <div className="md:col-span-1 space-y-8">
            {/* Contact Section */}
            <div className="space-y-4">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-20 w-full" />
            </div>

            {/* Location Section */}
            <div className="space-y-4">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-16 w-full" />
            </div>

            {/* Payment Methods Section */}
            <div className="space-y-4">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-12 w-full" />
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        <div className="space-y-4">
          <Skeleton className="h-6 w-24" />
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
