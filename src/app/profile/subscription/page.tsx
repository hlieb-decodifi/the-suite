import { ProfileSubscriptionPage } from '@/components/pages/ProfileSubscriptionPage/ProfileSubscriptionPage';

// Cache the page for a short time since subscription data can change
export const revalidate = 30; // Revalidate every 30 seconds

export default async function SubscriptionPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedSearchParams = await searchParams;
  return <ProfileSubscriptionPage searchParams={resolvedSearchParams} />;
}
