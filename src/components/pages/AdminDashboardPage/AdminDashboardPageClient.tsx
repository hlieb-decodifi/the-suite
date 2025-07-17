// This is the main client view for the Admin Dashboard page.
// It is responsible for rendering dashboard widgets inside the AdminDashboardTemplate.
// Hierarchy: app/admin/page.tsx (page) -> AdminDashboardOverviewPage.tsx (server/template) -> AdminDashboardOverviewPageClient.tsx (view)
// Widgets are modular section components.
'use client';

import { BookingsActivityWidget, ClientsWidget, ProfessionalsWidget, MessagesWidget, RefundsWidget, AdminDashboardTemplate } from '@/components/templates/AdminDashboardTemplate';

export type AdminDashboardPageClientProps = {
  totalBookings: number;
  bookingsPerDay: Record<string, number>;
  totalClients: number;
  newClients: number;
  totalProfessionals: number;
  newProfessionals: number;
  totalChats: number;
  totalRefunds: number;
};

export function AdminDashboardPageClient({
  totalBookings,
  bookingsPerDay,
  totalClients,
  newClients,
  totalProfessionals,
  newProfessionals,
  totalChats,
  totalRefunds,
}: AdminDashboardPageClientProps) {
  return (
    <AdminDashboardTemplate>
      <BookingsActivityWidget totalBookings={totalBookings} bookingsPerDay={bookingsPerDay} />
      <ClientsWidget totalClients={totalClients} newClients={newClients} />
      <ProfessionalsWidget totalProfessionals={totalProfessionals} newProfessionals={newProfessionals} />
      <MessagesWidget totalChats={totalChats} />
      <RefundsWidget totalRefunds={totalRefunds} />
    </AdminDashboardTemplate>
  );
} 