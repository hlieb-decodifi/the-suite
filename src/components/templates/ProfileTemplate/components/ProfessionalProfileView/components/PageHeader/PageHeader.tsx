/* eslint-disable max-lines-per-function */
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Typography } from '@/components/ui/typography';
import { Eye, EyeOff, LayoutDashboard } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useProfile } from '@/api/profiles/hooks';
import { User } from '@supabase/supabase-js';
import Link from 'next/link';

// Type for PageHeader props
export type PageHeaderProps = {
  isPublished?: boolean;
  onPublishToggle?: () => void;
  onPreview?: () => void;
  isPreviewMode?: boolean;
  isPublicView?: boolean;
  title?: string;
  isLoading?: boolean;
  user?: User;
};

export function PageHeader({
  isPublished = false,
  onPublishToggle,
  onPreview,
  isPreviewMode = false,
  isPublicView = false,
  title = 'Professional Profile',
  isLoading = false,
  user,
}: PageHeaderProps) {
  // Fetch profile data if we have a user ID
  const { data: profileData, isFetching: isProfileLoading } = useProfile(
    user?.id || '',
  );

  // Only use profile data in preview mode and when user ID is available
  const shouldUseProfileName = isPreviewMode && !!profileData && !!user?.id;

  // If in preview mode and we have profile data, use the professional's name
  const displayTitle = shouldUseProfileName
    ? `${profileData.firstName || ''} ${profileData.lastName || ''}`.trim()
    : title;

  // Loading state combines parent loading state and profile loading
  const showLoading =
    isLoading || (isPreviewMode && isProfileLoading && !!user?.id);

  // If we're in public view, subtitle should be about the professional profile
  const displaySubtitle = isPreviewMode
    ? 'Professional service provider profile'
    : 'Manage your professional profile information and services';

  return (
    <div className="space-y-2 mb-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <Typography
          variant="h2"
          className="leading-5 border-none font-bold text-foreground"
        >
          {showLoading ? <Skeleton className="h-10 w-60" /> : displayTitle}
        </Typography>
        {!isPublicView && (
          <div className="flex items-center gap-3">
            {!isPreviewMode && (
              <Link href="/dashboard">
                <Button variant="outline">
                  <LayoutDashboard size={16} />
                  Go to Dashboard
                </Button>
              </Link>
            )}
            {onPreview && (
              <Button
                variant="outline"
                className="bg-background flex items-center gap-1.5"
                onClick={onPreview}
              >
                {isPreviewMode ? (
                  <>
                    <EyeOff className="h-4 w-4" />
                    Exit Preview
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4" />
                    Preview Profile
                  </>
                )}
              </Button>
            )}
            {!isPreviewMode && onPublishToggle && (
              <Button
                variant={isPublished ? 'default' : 'outline'}
                className={
                  isPublished
                    ? 'bg-primary'
                    : 'bg-background border-primary text-primary'
                }
                onClick={onPublishToggle}
              >
                {isPublished ? 'Unpublish Profile' : 'Publish Profile'}
              </Button>
            )}
          </div>
        )}
      </div>
      <Typography className="text-muted-foreground">
        {showLoading ? <Skeleton className="h-5 w-96" /> : displaySubtitle}
      </Typography>
      <Separator className="my-4" />
    </div>
  );
}
