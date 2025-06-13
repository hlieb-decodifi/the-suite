'use client';

import { usePathname } from 'next/navigation';
import { ProfilePageHeader } from '@/components/common/ProfilePageHeader';
import { TabNavigation, type TabItem } from '@/components/common/TabNavigation';

export type ProfessionalPageLayoutClientProps = {
  profileId: string;
  children: React.ReactNode;
  isOwnProfile?: boolean;
  allowMessages?: boolean;
  isCurrentUserClient?: boolean;
  professionalName?: string;
};

export function ProfessionalPageLayoutClient({
  profileId,
  children,
  isOwnProfile = false,
  allowMessages = false,
  isCurrentUserClient = false,
  professionalName = '',
}: ProfessionalPageLayoutClientProps) {
  const pathname = usePathname();

  const handleClosePreview = () => {
    // Navigate back to the profile edit page
    window.location.href = '/profile';
  };

  // Determine active tab from pathname
  const getActiveTabFromPath = (path: string): string => {
    if (
      path === `/professional/${profileId}` ||
      path === `/professional/${profileId}/`
    )
      return 'profile';
    if (path.includes(`/professional/${profileId}/services`)) return 'services';
    if (path.includes(`/professional/${profileId}/portfolio`))
      return 'portfolio';
    return 'profile';
  };

  const activeTab = getActiveTabFromPath(pathname);

  // Create tabs array for TabNavigation component
  const tabs: TabItem[] = [
    {
      key: 'profile',
      label: 'profile',
      href: `/professional/${profileId}`,
      isActive: activeTab === 'profile',
    },
    {
      key: 'services',
      label: 'services',
      href: `/professional/${profileId}/services`,
      isActive: activeTab === 'services',
    },
    {
      key: 'portfolio',
      label: 'portfolio',
      href: `/professional/${profileId}/portfolio`,
      isActive: activeTab === 'portfolio',
    },
  ];

  return (
    <div className="w-full">
      <ProfilePageHeader
        isPublished={true}
        onPublishToggle={() => {}} // No-op for public view
        onClosePreview={isOwnProfile ? handleClosePreview : undefined}
        isPreviewMode={false}
        isPublicView={true}
        isSubscribed={true} // Assume subscribed since profile is published
        connectStatus={{ isConnected: true }}
        isLoading={false}
        title={professionalName}
        allowMessages={allowMessages}
        isCurrentUserClient={isCurrentUserClient}
        professionalId={profileId}
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
