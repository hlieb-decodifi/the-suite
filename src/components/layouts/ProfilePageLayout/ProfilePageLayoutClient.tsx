'use client';

import { User } from '@supabase/supabase-js';
import { useTransition, useOptimistic, useState } from 'react';
import { usePathname } from 'next/navigation';
import { toast } from '@/components/ui/use-toast';
import { ProfilePageHeader } from '@/components/common/ProfilePageHeader';
import { TabNavigation, type TabItem } from '@/components/common/TabNavigation';
import { SubscriptionTooltip } from '@/components/common/SubscriptionTooltip';
import {
  toggleProfilePublishStatus,
  type UserData,
  type ProfileValidationData,
} from './ProfilePageLayout';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Clock, CreditCard } from 'lucide-react';
import { Typography } from '@/components/ui/typography';

type ConnectStatus = {
  isConnected: boolean;
  accountId?: string;
  connectStatus?: string;
} | null;

type ProfilePageLayoutClientProps = {
  children: React.ReactNode;
  user: User;
  userData: UserData;
  connectStatus: ConnectStatus;
  validationData: ProfileValidationData;
  unreadMessagesCount?: number;
};

// Validation functions
function hasWorkingHours(
  workingHours: ProfileValidationData['workingHours'],
): boolean {
  return workingHours.some((hour) => hour.enabled === true);
}

function hasPaymentMethods(
  paymentMethods: ProfileValidationData['paymentMethods'],
): boolean {
  return paymentMethods.length > 0;
}

function validateProfileForPublishing(validationData: ProfileValidationData): {
  isValid: boolean;
  missingRequirements: string[];
} {
  const missingRequirements: string[] = [];

  if (!hasWorkingHours(validationData.workingHours)) {
    missingRequirements.push('At least one working day must be selected');
  }

  if (!hasPaymentMethods(validationData.paymentMethods)) {
    missingRequirements.push('At least one payment method must be selected');
  }

  return {
    isValid: missingRequirements.length === 0,
    missingRequirements,
  };
}

export function ProfilePageLayoutClient({
  user,
  userData,
  connectStatus,
  validationData,
  children,
  unreadMessagesCount = 0,
}: ProfilePageLayoutClientProps) {
  const [isPending, startTransition] = useTransition();
  const [showValidationDialog, setShowValidationDialog] = useState(false);
  const [missingRequirements, setMissingRequirements] = useState<string[]>([]);
  const pathname = usePathname();

  // Optimistic state for publish status
  const [optimisticUserData, setOptimisticUserData] = useOptimistic(
    userData,
    (state, newIsPublished: boolean) => ({
      ...state,
      isPublished: newIsPublished,
    }),
  );

  // Determine active tab from pathname
  const getActiveTabFromPath = (path: string): string => {
    if (path === '/profile' || path === '/profile/') return 'profile';
    if (path.includes('/profile/services')) return 'services';
    if (path.includes('/profile/portfolio')) return 'portfolio';
    if (path.includes('/profile/subscription')) return 'subscription';
    if (path.includes('/profile/settings')) return 'settings';
    return 'profile';
  };

  const activeTab = getActiveTabFromPath(pathname);

  const handlePublishToggle = () => {
    const newPublishStatus = !optimisticUserData.isPublished;

    // If trying to publish, validate first
    if (newPublishStatus) {
      const validation = validateProfileForPublishing(validationData);
      if (!validation.isValid) {
        setMissingRequirements(validation.missingRequirements);
        setShowValidationDialog(true);
        return;
      }
    }

    startTransition(async () => {
      // Optimistically update the UI
      setOptimisticUserData(newPublishStatus);

      try {
        const result = await toggleProfilePublishStatus(
          user.id,
          newPublishStatus,
        );

        if (result.success) {
          toast({
            description: result.message,
          });
        } else {
          toast({
            variant: 'destructive',
            title: 'Error',
            description: result.message,
          });
        }
      } catch {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'An unexpected error occurred',
        });
      }
    });
  };

  const handlePreview = () => {
    // Navigate to the public profile view in the same tab
    window.location.href = `/professionals/${user.id}`;
  };

  const isSubscribed = optimisticUserData.subscriptionStatus === true;
  const isConnected = connectStatus?.connectStatus === 'complete';
  const isPublished = optimisticUserData.isPublished === true;

  // Create tabs array for TabNavigation component
  const tabs: TabItem[] = [
    {
      key: 'profile',
      label: 'profile',
      href: '/profile',
      isActive: activeTab === 'profile',
    },
    {
      key: 'services',
      label: 'services',
      href: '/profile/services',
      isActive: activeTab === 'services',
    },
    {
      key: 'portfolio',
      label: 'portfolio',
      href: '/profile/portfolio',
      isActive: activeTab === 'portfolio',
    },
    {
      key: 'settings',
      label: 'settings',
      href: '/profile/settings',
      isActive: activeTab === 'settings',
    },
    {
      key: 'subscription',
      label: 'subscription',
      href: '/profile/subscription',
      isActive: activeTab === 'subscription',
      ...((!isSubscribed || !isConnected) && {
        badge: (
          <SubscriptionTooltip
            isConnected={isConnected}
            isSubscribed={isSubscribed}
            activeTab={activeTab}
          />
        ),
        className: 'border border-primary/50',
      }),
      ...(!isSubscribed && {
        className: 'border border-primary/50',
      }),
    },
  ];

  return (
    <>
      <div className="w-full">
        <ProfilePageHeader
          isPublished={isPublished}
          onPublishToggle={handlePublishToggle}
          onPreview={handlePreview}
          isPreviewMode={false}
          isPublicView={false}
          user={user}
          isSubscribed={isSubscribed}
          connectStatus={connectStatus}
          isLoading={isPending}
          unreadMessagesCount={unreadMessagesCount}
        />

        <div className="w-full">
          {/* Tab Navigation */}
          <TabNavigation tabs={tabs} variant="link" className="mb-8" />

          {/* Tab Content */}
          <div>{children}</div>
        </div>
      </div>

      {/* Validation Requirements Dialog */}
      <Dialog
        open={showValidationDialog}
        onOpenChange={setShowValidationDialog}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Profile Requirements Missing
            </DialogTitle>
            <DialogDescription>
              To publish your profile, you need to complete the following
              requirements:
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {missingRequirements.map((requirement, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg"
              >
                {requirement.includes('working day') ? (
                  <Clock className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                ) : (
                  <CreditCard className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                )}
                <Typography className="text-sm text-foreground">
                  {requirement}
                </Typography>
              </div>
            ))}
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowValidationDialog(false)}
              className="w-full sm:w-auto"
            >
              Close
            </Button>
            <Button
              onClick={() => {
                setShowValidationDialog(false);
                // Navigate to the profile tab where users can set working hours and payment methods
                window.location.href = '/profile';
              }}
              className="w-full sm:w-auto"
            >
              Complete Profile
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
