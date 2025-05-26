'use client';

import { User } from '@supabase/supabase-js';
import { useToggleProfilePublishStatus } from '@/api/profiles/hooks';
import {
  PageHeader,
  PortfolioSection,
  ProfileTabContent,
  ServicesSection,
  SubscriptionSection,
  SubscriptionTooltip,
} from './components';
import { TabNavigation, type TabItem } from '@/components/common/TabNavigation';
import { UserData } from './actions';

// Define tab options
const EDIT_MODE_TABS = ['profile', 'services', 'portfolio', 'subscription'];
const PREVIEW_MODE_TABS = ['profile', 'services', 'portfolio'];

export type ProfessionalProfileViewClientProps = {
  user: User;
  userData: UserData;
  connectStatus: {
    isConnected: boolean;
    accountId?: string;
    connectStatus?: string;
  } | null;
  searchParams?: { [key: string]: string | string[] | undefined };
  isPublicView?: boolean;
};

export function ProfessionalProfileViewClient({
  user,
  userData,
  connectStatus,
  searchParams = {},
  isPublicView = false,
}: ProfessionalProfileViewClientProps) {
  // Preview mode state - always false if isPublicView is true
  const isEditable = !isPublicView;

  // Get valid tabs based on current mode
  const validTabs = isEditable ? EDIT_MODE_TABS : PREVIEW_MODE_TABS;

  // Tab state from searchParams - now properly handled as resolved object
  const initialTab =
    typeof searchParams.tab === 'string' ? searchParams.tab : 'profile';
  const activeTab = validTabs.includes(initialTab) ? initialTab : 'profile';

  const isSubscribed = userData.subscriptionStatus === true;
  const isConnected = connectStatus?.connectStatus === 'complete';
  const isPublished = userData.isPublished === true;

  // Hook for toggling publish status
  const togglePublishMutation = useToggleProfilePublishStatus();

  const handlePublishToggle = () => {
    togglePublishMutation.mutate({
      userId: user.id,
      isPublished: !isPublished,
    });
  };

  // Create tabs array for TabNavigation component
  const tabs: TabItem[] = validTabs.map((tab) => {
    const isActive = activeTab === tab;
    const href = isPublicView ? `#${tab}` : `/profile?tab=${tab}`;
    const showSubscriptionTooltip =
      tab === 'subscription' && (!isSubscribed || !isConnected);

    return {
      key: tab,
      label: tab,
      href,
      isActive,
      badge: showSubscriptionTooltip ? (
        <SubscriptionTooltip
          isSubscribed={!showSubscriptionTooltip}
          activeTab={activeTab}
        />
      ) : undefined,
      ...(tab === 'subscription' &&
        !isSubscribed && { className: 'border border-primary/50' }),
    };
  });

  return (
    <div className="w-full">
      <PageHeader
        isPublished={isPublished}
        onPublishToggle={handlePublishToggle}
        isPreviewMode={!isEditable}
        isPublicView={isPublicView}
        user={user}
        isSubscribed={isSubscribed}
        connectStatus={connectStatus}
      />

      <div className="w-full">
        {/* Tab Navigation */}
        <TabNavigation tabs={tabs} variant="link" className="mb-8" />

        {/* Tab Content */}
        <div>
          {activeTab === 'profile' && (
            <ProfileTabContent user={user} isEditable={isEditable} />
          )}

          {activeTab === 'services' && (
            <ServicesSection user={user} isEditable={isEditable} />
          )}

          {activeTab === 'portfolio' && (
            <PortfolioSection user={user} isEditable={isEditable} />
          )}

          {isEditable && activeTab === 'subscription' && (
            <SubscriptionSection
              user={user}
              userId={user.id}
              searchParams={searchParams}
            />
          )}
        </div>
      </div>
    </div>
  );
}
