import { AdminDashboardPageLayout } from '@/components/layouts/AdminDashboardPageLayout';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminDashboardPageLayout>{children}</AdminDashboardPageLayout>;
}
