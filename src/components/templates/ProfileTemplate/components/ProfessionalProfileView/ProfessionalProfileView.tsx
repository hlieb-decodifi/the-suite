/* eslint-disable max-lines-per-function */
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { User } from '@supabase/supabase-js';
import { Typography } from '@/components/ui/typography';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import React from 'react';
import {
  ServicesSection,
  PortfolioSection,
  SubscriptionSection,
  PageHeader,
  ProfileTabContent,
} from './components';
import {
  useProfile,
  useToggleProfilePublishStatus,
  useUpdateSubscription,
} from '@/api/profiles/hooks';

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

  // --- Effects ---
  // Sync URL with active tab state
  useEffect(() => {
    const urlTab = searchParams.get('tab') || 'profile';
    if (VALID_TABS.includes(urlTab) && urlTab !== activeTab) {
      setActiveTab(urlTab);
    }
  }, [searchParams, activeTab]);

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

        <TabsContent value="profile">
          <ProfileTabContent
            user={user}
            onPublishToggle={handlePublishToggle}
            onEditPortfolio={handleEditPortfolio}
          />
        </TabsContent>

        <TabsContent value="services">
          <ServicesSection user={user} />
        </TabsContent>

        <TabsContent value="portfolio">
          <PortfolioSection user={user} />
        </TabsContent>

        <TabsContent value="subscription">
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
