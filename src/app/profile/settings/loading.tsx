export default function SettingsLoading() {
  return (
    <div className="mx-auto w-full">
      <div className="mx-auto">
        <div className="space-y-6">
          {/* Header skeleton */}
          <div>
            <div className="h-8 w-24 bg-muted animate-pulse rounded mb-2" />
            <div className="h-5 w-80 bg-muted animate-pulse rounded" />
          </div>

          {/* Form skeleton */}
          <div className="space-y-6">
            {/* Deposit toggle section */}
            <div className="space-y-4">
              <div className="h-6 w-32 bg-muted animate-pulse rounded" />
              <div className="flex items-center space-x-3">
                <div className="h-6 w-11 bg-muted animate-pulse rounded-full" />
                <div className="h-5 w-40 bg-muted animate-pulse rounded" />
              </div>
            </div>

            {/* Deposit type section */}
            <div className="space-y-4">
              <div className="h-6 w-28 bg-muted animate-pulse rounded" />
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="h-4 w-4 bg-muted animate-pulse rounded-full" />
                  <div className="h-5 w-24 bg-muted animate-pulse rounded" />
                </div>
                <div className="flex items-center space-x-3">
                  <div className="h-4 w-4 bg-muted animate-pulse rounded-full" />
                  <div className="h-5 w-20 bg-muted animate-pulse rounded" />
                </div>
              </div>
            </div>

            {/* Deposit value section */}
            <div className="space-y-4">
              <div className="h-6 w-32 bg-muted animate-pulse rounded" />
              <div className="h-10 w-full bg-muted animate-pulse rounded" />
            </div>

            {/* Payment method section */}
            <div className="space-y-4">
              <div className="h-6 w-40 bg-muted animate-pulse rounded" />
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="h-4 w-4 bg-muted animate-pulse rounded-full" />
                  <div className="h-5 w-48 bg-muted animate-pulse rounded" />
                </div>
                <div className="flex items-center space-x-3">
                  <div className="h-4 w-4 bg-muted animate-pulse rounded-full" />
                  <div className="h-5 w-52 bg-muted animate-pulse rounded" />
                </div>
                <div className="flex items-center space-x-3">
                  <div className="h-4 w-4 bg-muted animate-pulse rounded-full" />
                  <div className="h-5 w-20 bg-muted animate-pulse rounded" />
                </div>
              </div>
            </div>

            {/* Submit button skeleton */}
            <div className="h-10 w-32 bg-muted animate-pulse rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}
