import { DashboardMessagesPage } from '@/components/pages/DashboardMessagesPage/DashboardMessagesPage';

// Enable caching for 1 minute
export const revalidate = 60;

export default function MessagesPage() {
  return <DashboardMessagesPage />;
}
