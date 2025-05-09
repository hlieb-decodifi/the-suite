import { DashboardTemplate } from '@/components/templates/DashboardTemplate';

export const dynamic = 'force-dynamic';
export const revalidate = 0; // Disable cache for this route

export default function DashboardPage() {
  return <DashboardTemplate />;
}
