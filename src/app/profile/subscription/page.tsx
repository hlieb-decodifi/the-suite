import { ProfileSubscriptionPage } from '@/components/pages/ProfileSubscriptionPage/ProfileSubscriptionPage';

export default async function SubscriptionPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedSearchParams = await searchParams;
  return <ProfileSubscriptionPage searchParams={resolvedSearchParams} />;
}
