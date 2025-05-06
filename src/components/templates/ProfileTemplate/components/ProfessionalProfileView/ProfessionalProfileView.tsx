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
import { User } from '@supabase/supabase-js';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import {
  PageHeader,
  PortfolioSection,
  ProfileTabContent,
  ServicesSection,
  SubscriptionSection,
} from './components';

const VALID_TABS = ['profile', 'services', 'portfolio', 'subscription'];

export type ProfessionalProfileViewProps = {
  user: User;
};

export function ProfessionalProfileView({
  user,
}: ProfessionalProfileViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Tab state
  const initialTab = searchParams.get('tab') || 'profile';
  const currentTab = VALID_TABS.includes(initialTab) ? initialTab : 'profile';
  const [activeTab, setActiveTab] = useState(currentTab);

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
    if (VALID_TABS.includes(newTab)) {
      setActiveTab(newTab);
      router.replace(`?tab=${newTab}`, { scroll: false });
    }
  };

  // Publish toggle handler
  const handlePublishToggle = () => {
    if (!profileData?.isSubscribed) {
      handleTabChange('subscription');
      return;
    }

    const newPublishState = !(profileData?.isPublished ?? false);
    togglePublishStatus({
      userId: user.id,
      isPublished: newPublishState,
    });
  };

  // Subscribe handler
  const handleSubscribe = () => {
    updateSubscription(user.id);
    handleTabChange('subscription');
  };

  // Portfolio edit handler
  const handleEditPortfolio = () => {
    handleTabChange('portfolio');
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

  return (
    <div className="space-y-8">
      <PageHeader
        isPublished={profileData.isPublished ?? false}
        isSubscribed={profileData.isSubscribed ?? false}
        onPublishToggle={handlePublishToggle}
        onSubscribe={handleSubscribe}
      />

      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="w-full"
      >
        <TabsList className="w-full max-w-md mb-8 bg-muted/50 p-1 rounded-full">
          {VALID_TABS.map((tab) => (
            <TabsTrigger
              key={tab}
              value={tab}
              className="flex-1 rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground capitalize"
            >
              {tab}
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
          />
        </TabsContent>

        <TabsContent
          value="services"
          forceMount
          className={activeTab !== 'services' ? 'hidden' : ''}
        >
          <ServicesSection user={user} />
        </TabsContent>

        <TabsContent
          value="portfolio"
          forceMount
          className={activeTab !== 'portfolio' ? 'hidden' : ''}
        >
          <PortfolioSection user={user} />
        </TabsContent>

        <TabsContent
          value="subscription"
          forceMount
          className={activeTab !== 'subscription' ? 'hidden' : ''}
        >
          <SubscriptionSection
            user={user}
            isSubscribed={profileData.isSubscribed ?? false}
            onSubscribe={handleSubscribe}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
