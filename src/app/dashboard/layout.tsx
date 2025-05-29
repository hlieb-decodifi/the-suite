import { DashboardPageLayout } from '@/components/layouts/DashboardPageLayout/DashboardPageLayout';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardPageLayout>{children}</DashboardPageLayout>;
}
