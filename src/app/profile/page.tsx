import { ProfilePage } from '@/components/pages/ProfilePage/ProfilePage';

// Cache the page for a short time since profile data can change
export const revalidate = 30; // Revalidate every 30 seconds

export default function ProfilePageRoute() {
  return <ProfilePage />;
}
