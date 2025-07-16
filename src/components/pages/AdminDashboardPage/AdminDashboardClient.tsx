'use client';

import { BookingsActivityWidget, ClientsWidget, ProfessionalsWidget, MessagesWidget, RefundsWidget } from '@/components/templates/AdminDashboardTemplate';

export type AdminDashboardClientProps = {
  totalBookings: number;
  bookingsPerDay: Record<string, number>;
  totalClients: number;
  newClients: number;
  totalProfessionals: number;
  newProfessionals: number;
  totalChats: number;
  totalRefunds: number;
};

export function AdminDashboardClient({
  totalBookings,
  bookingsPerDay,
  totalClients,
  newClients,
  totalProfessionals,
  newProfessionals,
  totalChats,
  totalRefunds,
}: AdminDashboardClientProps) {
  return (
    <>
      <BookingsActivityWidget totalBookings={totalBookings} bookingsPerDay={bookingsPerDay} />
      <ClientsWidget totalClients={totalClients} newClients={newClients} />
      <ProfessionalsWidget totalProfessionals={totalProfessionals} newProfessionals={newProfessionals} />
      <MessagesWidget totalChats={totalChats} />
      <RefundsWidget totalRefunds={totalRefunds} />
    </>
  );
} 