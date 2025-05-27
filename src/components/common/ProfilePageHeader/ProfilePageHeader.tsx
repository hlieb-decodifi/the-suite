'use client';

import { Button } from '@/components/ui/button';
import { Typography } from '@/components/ui/typography';
import { Eye, EyeOff, LayoutDashboard, AlertTriangle, X } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useProfile } from '@/api/profiles/hooks';
import { User } from '@supabase/supabase-js';
import Link from 'next/link';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/utils';

// Type for ProfilePageHeader props
export type ProfilePageHeaderProps = {
  isPublished?: boolean;
  onPublishToggle?: () => void;
  onPreview?: () => void;
  onClosePreview?: (() => void) | undefined;
  isPreviewMode?: boolean;
  isPublicView?: boolean;
  title?: string;
  isLoading?: boolean;
  user?: User;
  isSubscribed?: boolean;
  connectStatus?: {
    isConnected: boolean;
    accountId?: string;
    connectStatus?: string;
  } | null;
};

export function ProfilePageHeader({
  isPublished = false,
  onPublishToggle,
  onPreview,
  onClosePreview,
  isPreviewMode = false,
  isPublicView = false,
  title = 'Professional Profile',
  isLoading = false,
  user,
  isSubscribed = false,
  connectStatus = null,
}: ProfilePageHeaderProps) {
  const [showBlockingDialog, setShowBlockingDialog] = useState(false);

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

  // Determine if publishing is allowed
  const canPublish =
    !isSubscribed ||
    (isSubscribed && connectStatus?.connectStatus === 'complete');

  const handlePublishClick = () => {
    if (
      !canPublish &&
      isSubscribed &&
      connectStatus?.connectStatus !== 'complete'
    ) {
      setShowBlockingDialog(true);
    } else if (onPublishToggle) {
      onPublishToggle();
    }
  };

  const handlePreviewClick = () => {
    if (onPreview) {
      onPreview();
    }
  };

  return (
    <>
      <div className="flex flex-col md:flex-row justify-between items-start mb-6 gap-4">
        <div>
          <Typography
            variant="h2"
            className="leading-5 border-none font-bold text-foreground"
          >
            {showLoading ? <Skeleton className="h-10 w-60" /> : displayTitle}
          </Typography>
          <Typography className="text-muted-foreground">
            {showLoading ? <Skeleton className="h-5 w-96" /> : displaySubtitle}
          </Typography>
        </div>
        {!isPublicView && (
          <div className="flex flex-col md:flex-row items-stretch gap-3 w-full md:w-auto">
            {!isPreviewMode && (
              <Link href="/dashboard">
                <Button variant="outline" className="w-full md:w-auto">
                  <LayoutDashboard size={16} className="mr-2" />
                  Go to Dashboard
                </Button>
              </Link>
            )}
            {onPreview && (
              <Button
                variant="outline"
                className="bg-background flex items-center gap-1.5 w-full md:w-auto"
                onClick={handlePreviewClick}
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
            {!isPreviewMode && (
              <Button
                variant={isPublished ? 'default' : 'outline'}
                className={cn(
                  'w-full md:w-auto',
                  isPublished
                    ? 'bg-primary'
                    : canPublish
                      ? 'bg-background border-primary text-primary'
                      : 'bg-background border-gray-300 text-gray-500',
                )}
                onClick={handlePublishClick}
                disabled={!canPublish && !isPublished}
              >
                {isPublished ? 'Unpublish Profile' : 'Publish Profile'}
              </Button>
            )}
          </div>
        )}
        {/* Close Preview Button for Public View */}
        {isPublicView && onClosePreview && (
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              className="bg-background flex items-center gap-1.5"
              onClick={onClosePreview}
            >
              <X className="h-4 w-4" />
              Close Preview
            </Button>
          </div>
        )}
      </div>

      {/* Blocking Dialog for Incomplete Stripe Connect */}
      <Dialog open={showBlockingDialog} onOpenChange={setShowBlockingDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Stripe Connect Required
            </DialogTitle>
            <DialogDescription className="space-y-3">
              <p>
                To publish your profile and start receiving payments, you need
                to complete your Stripe Connect setup.
              </p>
              <p>
                This allows you to securely receive payments from clients
                directly to your bank account.
              </p>
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-6">
            <Button
              variant="outline"
              onClick={() => setShowBlockingDialog(false)}
            >
              Cancel
            </Button>
            <Link href="/profile?tab=subscription">
              <Button onClick={() => setShowBlockingDialog(false)}>
                Complete Setup
              </Button>
            </Link>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
