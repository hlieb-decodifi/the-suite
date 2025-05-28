import { ProfileSettingsPage } from '@/components/pages/ProfileSettingsPage';

// Cache the page for a short time since services data can change
export const revalidate = 30; // Revalidate every 30 seconds

export default function SettingsPage() {
  return <ProfileSettingsPage />;
}
