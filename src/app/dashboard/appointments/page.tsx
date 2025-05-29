import { DashboardAppointmentsPage } from '@/components/pages/DashboardAppointmentsPage/DashboardAppointmentsPage';

// Enable caching for 1 minute
export const revalidate = 60;

export default function AppointmentsPage() {
  return <DashboardAppointmentsPage />;
}
