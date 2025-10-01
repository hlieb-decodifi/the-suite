'use client';

import { useProfile } from '@/api/profiles/hooks';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Typography } from '@/components/ui/typography';
import { useToast } from '@/components/ui/use-toast';
import { createOrGetConversationEnhanced } from '@/server/domains/messages/actions';
import { cn } from '@/utils';
import { User } from '@supabase/supabase-js';
import {
  AlertTriangle,
  Edit,
  Eye,
  EyeOff,
  LayoutDashboard,
  MessageCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

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
  allowMessages?: boolean;
  isCurrentUserClient?: boolean;
  hasSharedAppointments?: boolean;
  professionalId?: string;
  unreadMessagesCount?: number;
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
  allowMessages = false,
  isCurrentUserClient = false,
  hasSharedAppointments = false,
  professionalId,
}: ProfilePageHeaderProps) {
  const [showBlockingDialog, setShowBlockingDialog] = useState(false);
  const [isMessageLoading, setIsMessageLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

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

  const handleMessageClick = async () => {
    if (!professionalId) return;

    setIsMessageLoading(true);
    try {
      const result = await createOrGetConversationEnhanced(professionalId);
      if (result.success && result.conversation) {
        // Redirect to dashboard messages with the conversation
        router.push(
          `/dashboard/messages?conversation=${result.conversation.id}`,
        );
      } else {
        console.error('Failed to create conversation:', result.error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description:
            result.error ||
            'Failed to create conversation. Please try again later.',
        });
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast({
        title: 'Error',
        description: 'Failed to create conversation. Please try again later.',
      });
    } finally {
      setIsMessageLoading(false);
    }
  };

  // Show message button in two cases:
  // 1. If users have shared appointments (regardless of allow_messages setting)
  // 2. If no shared appointments but professional allows messages and current user is client
  const showMessageButton =
    isPublicView &&
    isCurrentUserClient &&
    professionalId &&
    (hasSharedAppointments || allowMessages);

  return (
    <>
      <div className="flex flex-col md:flex-row justify-between items-start mb-6 gap-4">
        <div>
          <Typography
            variant="h2"
            className="leading-5 border-none font-bold text-foreground"
          >
            {showLoading ? <Skeleton className="h-5 w-60" /> : displayTitle}
          </Typography>
          <Typography className="text-muted-foreground" as="div">
            {showLoading ? (
              <Skeleton className="mt-2 h-5 w-96" />
            ) : (
              displaySubtitle
            )}
          </Typography>
        </div>
        {!isPublicView && (
          <div className="flex flex-col md:flex-row items-stretch gap-3 w-full md:w-auto">
            {!isPreviewMode && (
              <Link href="/dashboard">
                <Button variant="outline" className="w-full md:w-auto relative">
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
              >
                {isPublished ? 'Unpublish Profile' : 'Publish Profile'}
              </Button>
            )}
          </div>
        )}
        {/* Message Button and Close Preview for Public View */}
        {isPublicView && (
          <div className="flex items-center gap-3">
            {showMessageButton && (
              <Button
                variant="default"
                className="flex items-center gap-1.5"
                onClick={handleMessageClick}
                disabled={isMessageLoading}
              >
                <MessageCircle className="h-4 w-4" />
                {isMessageLoading ? 'Loading...' : 'Message'}
              </Button>
            )}
            {onClosePreview && (
              <Button
                variant="outline"
                className="bg-background flex items-center gap-1.5"
                onClick={onClosePreview}
              >
                <Edit className="h-4 w-4" />
                Edit Profile
              </Button>
            )}
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
          <span className="flex justify-end gap-3 mt-6">
            <Button
              variant="outline"
              onClick={() => setShowBlockingDialog(false)}
            >
              Cancel
            </Button>
            <Link href="/profile/subscription">
              <Button onClick={() => setShowBlockingDialog(false)}>
                Complete Setup
              </Button>
            </Link>
          </span>
        </DialogContent>
      </Dialog>
    </>
  );
}
