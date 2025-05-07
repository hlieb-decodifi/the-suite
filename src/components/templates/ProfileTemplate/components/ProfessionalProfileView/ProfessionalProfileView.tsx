/* eslint-disable max-lines-per-function */
'use client';

import {
  useProfile,
  useToggleProfilePublishStatus,
  useUpdateSubscription,
} from '@/api/profiles/hooks';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Typography } from '@/components/ui/typography';
import { cn } from '@/utils/cn';
import { User } from '@supabase/supabase-js';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  PageHeader,
  PortfolioSection,
  ProfileTabContent,
  ServicesSection,
  SubscriptionSection,
  SubscriptionTooltip,
} from './components';

// Define tab options
const EDIT_MODE_TABS = ['profile', 'services', 'portfolio', 'subscription'];
const PREVIEW_MODE_TABS = ['profile', 'services', 'portfolio'];

export type ProfessionalProfileViewProps = {
  user: User;
};

export function ProfessionalProfileView({
  user,
}: ProfessionalProfileViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Preview mode state
  const [isEditable, setIsEditable] = useState(true);

  // Get valid tabs based on current mode
  const validTabs = isEditable ? EDIT_MODE_TABS : PREVIEW_MODE_TABS;

  // Tab state
  const initialTab = searchParams.get('tab') || 'profile';
  const currentTab = validTabs.includes(initialTab) ? initialTab : 'profile';
  const [activeTab, setActiveTab] = useState(currentTab);

  // Update activeTab when isEditable changes
  useEffect(() => {
    // If we're switching to preview mode and current tab is subscription,
    // change to profile tab
    if (!isEditable && activeTab === 'subscription') {
      setActiveTab('profile');
    }
  }, [isEditable, activeTab]);

  // Use React Query hook for profile data
  const {
    data: profileData,
    isLoading: isLoadingProfile,
    error: profileError,
  } = useProfile(user.id);

  // Profile publish toggle mutation
  const { mutate: togglePublishStatus } = useToggleProfilePublishStatus();

  // Subscription mutation
  const { mutate: updateSubscription } = useUpdateSubscription();

  // --- Handlers ---
  // Tab change handler
  const handleTabChange = (newTab: string) => {
    if (validTabs.includes(newTab)) {
      setActiveTab(newTab);
      router.replace(`?tab=${newTab}`, { scroll: false });
    }
  };

  // Publish toggle handler
  const handlePublishToggle = () => {
    const newPublishState = !(profileData?.isPublished ?? false);
    togglePublishStatus({
      userId: user.id,
      isPublished: newPublishState,
    });
  };

  // Preview handler - toggles edit mode
  const handlePreview = () => {
    // Toggle isEditable state for preview mode
    setIsEditable(!isEditable);
  };

  // Subscribe handler
  const handleSubscribe = () => {
    updateSubscription(user.id);
    handleTabChange('subscription');
  };

  // Portfolio edit handler
  const handleEditPortfolio = () => {
    if (isEditable) {
      handleTabChange('portfolio');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // --- Render Logic ---
  // Show main loading skeleton if profile data isn't loaded yet
  if (isLoadingProfile) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-8 w-full max-w-md" />
        <Skeleton className="h-60 w-full" />
      </div>
    );
  }

  // Handle case where profile data failed to load
  if (profileError || !profileData) {
    return (
      <Typography>
        Error loading profile. Please try again later.
        {profileError instanceof Error && (
          <div className="text-sm text-destructive">{profileError.message}</div>
        )}
      </Typography>
    );
  }

  const isSubscribed = profileData.isSubscribed ?? false;

  return (
    <div className="space-y-8">
      <PageHeader
        isPublished={profileData.isPublished ?? false}
        onPublishToggle={handlePublishToggle}
        onPreview={handlePreview}
        isPreviewMode={!isEditable}
      />

      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="w-full"
      >
        <TabsList className="gap-1 w-full max-w-md mb-8 bg-muted/50 p-1 rounded-full">
          {validTabs.map((tab) => (
            <TabsTrigger
              key={tab}
              value={tab}
              className={cn(
                'border-primary flex items-center justify-center gap-1.5 flex-1 rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground capitalize',
                tab === 'subscription' &&
                  !isSubscribed &&
                  'border border-primary/50',
              )}
            >
              {tab === 'subscription' && !isSubscribed ? (
                <div className="flex items-center">
                  {tab}
                  <SubscriptionTooltip
                    isSubscribed={isSubscribed}
                    activeTab={activeTab}
                  />
                </div>
              ) : (
                tab
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent
          value="profile"
          forceMount
          className={activeTab !== 'profile' ? 'hidden' : ''}
        >
          <ProfileTabContent
            user={user}
            onPublishToggle={handlePublishToggle}
            onEditPortfolio={handleEditPortfolio}
            isEditable={isEditable}
          />
        </TabsContent>

        <TabsContent
          value="services"
          forceMount
          className={activeTab !== 'services' ? 'hidden' : ''}
        >
          <ServicesSection user={user} isEditable={isEditable} />
        </TabsContent>

        <TabsContent
          value="portfolio"
          forceMount
          className={activeTab !== 'portfolio' ? 'hidden' : ''}
        >
          <PortfolioSection user={user} isEditable={isEditable} />
        </TabsContent>

        {isEditable && (
          <TabsContent
            value="subscription"
            forceMount
            className={activeTab !== 'subscription' ? 'hidden' : ''}
          >
            <SubscriptionSection
              user={user}
              isSubscribed={isSubscribed}
              onSubscribe={handleSubscribe}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
