import { AdminCronTemplate } from '@/components/templates/AdminCronTemplate/AdminCronTemplate';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Emails - Admin',
  description: 'Manage and monitor emails',
};

export default function AdminCronPage() {
  return <AdminCronTemplate />;
}
