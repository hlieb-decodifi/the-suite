import { AdminCronTemplate } from '@/components/templates/AdminCronTemplate/AdminCronTemplate';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cron Jobs - Admin',
  description: 'Manage and monitor cron jobs',
};

export default function AdminCronPage() {
  return <AdminCronTemplate />;
}
