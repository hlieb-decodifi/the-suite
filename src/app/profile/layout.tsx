import { ProfilePageLayout } from '@/components/layouts/ProfilePageLayout/ProfilePageLayout';

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ProfilePageLayout>{children}</ProfilePageLayout>;
}
