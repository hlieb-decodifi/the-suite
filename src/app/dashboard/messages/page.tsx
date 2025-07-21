import { DashboardMessagesPage } from '@/components/pages/DashboardMessagesPage/DashboardMessagesPage';

// Enable caching for 1 minute
export const revalidate = 60;

// Accept searchParams as a Promise and await it before passing to DashboardMessagesPage
export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ conversation?: string }> }) {
  const resolvedSearchParams = await searchParams;
  return <DashboardMessagesPage searchParams={resolvedSearchParams} />;
}
