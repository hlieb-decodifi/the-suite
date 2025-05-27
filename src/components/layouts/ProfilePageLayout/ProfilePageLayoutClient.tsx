'use client';

import { User } from '@supabase/supabase-js';
import { useTransition } from 'react';
import { usePathname } from 'next/navigation';
import { toast } from '@/components/ui/use-toast';
import { ProfilePageHeader } from '@/components/common/ProfilePageHeader';
import { TabNavigation, type TabItem } from '@/components/common/TabNavigation';
import { SubscriptionTooltip } from '@/components/common/SubscriptionTooltip';
import { toggleProfilePublishStatus, type UserData } from './ProfilePageLayout';

type ConnectStatus = {
  isConnected: boolean;
  accountId?: string;
  connectStatus?: string;
} | null;

export type ProfilePageLayoutClientProps = {
  user: User;
  userData: UserData;
  connectStatus: ConnectStatus;
  children: React.ReactNode;
};

export function ProfilePageLayoutClient({
  user,
  userData,
  connectStatus,
  children,
}: ProfilePageLayoutClientProps) {
  const [isPending, startTransition] = useTransition();
  const pathname = usePathname();

  // Determine active tab from pathname
  const getActiveTabFromPath = (path: string): string => {
    if (path === '/profile' || path === '/profile/') return 'profile';
    if (path.includes('/profile/services')) return 'services';
    if (path.includes('/profile/portfolio')) return 'portfolio';
    if (path.includes('/profile/subscription')) return 'subscription';
    return 'profile';
  };

  const activeTab = getActiveTabFromPath(pathname);

  const handlePublishToggle = () => {
    startTransition(async () => {
      try {
        const result = await toggleProfilePublishStatus(
          user.id,
          !userData.isPublished,
        );

        if (result.success) {
          toast({
            description: result.message,
          });
          // Note: We could add optimistic updates here if needed
          // For now, the page will refresh on navigation
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
    window.location.href = `/professional/${user.id}`;
  };

  const isSubscribed = userData.subscriptionStatus === true;
  const isConnected = connectStatus?.connectStatus === 'complete';
  const isPublished = userData.isPublished === true;

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
      key: 'subscription',
      label: 'subscription',
      href: '/profile/subscription',
      isActive: activeTab === 'subscription',
      ...((!isSubscribed || !isConnected) && {
        badge: (
          <SubscriptionTooltip
            isSubscribed={isSubscribed}
            activeTab={activeTab}
          />
        ),
      }),
      ...(!isSubscribed && {
        className: 'border border-primary/50',
      }),
    },
  ];

  return (
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
      />

      <div className="w-full">
        {/* Tab Navigation */}
        <TabNavigation tabs={tabs} variant="link" className="mb-8" />

        {/* Tab Content */}
        <div>{children}</div>
      </div>
    </div>
  );
}
