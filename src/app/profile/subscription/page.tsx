import { SubscriptionTabTemplate } from './SubscriptionTabTemplate';

export default function SubscriptionPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  return <SubscriptionTabTemplate searchParams={searchParams} />;
}
