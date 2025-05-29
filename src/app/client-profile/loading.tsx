import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export default function ClientProfileLoading() {
  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Account section */}
        <div className="md:col-span-1">
          <Card className="border-border overflow-hidden">
            <div className="bg-gradient-to-r from-primary/30 to-primary/20 h-16" />
            <CardHeader className="-mt-8 flex flex-col items-center pb-2">
              <Skeleton className="h-24 w-24 rounded-full border-4 border-white" />
              <Skeleton className="h-6 w-48 mt-4" />
              <Skeleton className="h-4 w-36 mt-2" />
            </CardHeader>
            <CardContent className="pt-2">
              <Separator className="my-4" />
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Separator className="my-3" />
                <Skeleton className="h-10 w-full" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main content */}
        <div className="md:col-span-2 space-y-6">
          {/* Personal Details section */}
          <Card>
            <CardHeader className="min-h-16 flex flex-row items-center justify-between space-y-0 pb-2 border-b">
              <div className="flex items-center">
                <Skeleton className="h-5 w-5 mr-2" />
                <Skeleton className="h-5 w-40" />
              </div>
              <Skeleton className="h-8 w-20" />
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-full" />
                </div>
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-full" />
              </div>
            </CardContent>
          </Card>

          {/* Location section */}
          <Card>
            <CardHeader className="min-h-16 flex flex-row items-center justify-between space-y-0 pb-2 border-b">
              <div className="flex items-center">
                <Skeleton className="h-5 w-5 mr-2" />
                <Skeleton className="h-5 w-32" />
              </div>
              <Skeleton className="h-8 w-20" />
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-full" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-full" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
