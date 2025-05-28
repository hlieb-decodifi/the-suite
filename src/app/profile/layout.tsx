import { ProfilePageLayout } from '@/components/layouts/ProfilePageLayout/ProfilePageLayout';

// Cache the layout for a short time since user data can change
export const revalidate = 60; // Revalidate every 60 seconds

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ProfilePageLayout>{children}</ProfilePageLayout>;
}
