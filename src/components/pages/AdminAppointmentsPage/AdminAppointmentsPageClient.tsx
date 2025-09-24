// Client component for admin appointments tab
'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminAppointmentsTemplate } from '@/components/templates/AdminAppointmentsTemplate';
// Import Appointment type directly for compatibility
import type { Appointment } from '@/types/appointments';

export function AdminAppointmentsPageClient({
  appointments,
  clients,
  professionals,
}: {
  appointments: Appointment[];
  clients: string[];
  professionals: string[];
}) {
  const router = useRouter();

  // Filter/sort state
  const [filterClient, setFilterClient] = useState('');
  const [filterProfessional, setFilterProfessional] = useState('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleRefresh = () => {
    router.refresh();
  };

  // Filter and sort appointments
  const filteredAppointments = useMemo(() => {
    let filtered = appointments;
    if (filterClient) {
      filtered = filtered.filter((a) => a.client === filterClient);
    }
    if (filterProfessional) {
      filtered = filtered.filter((a) => a.professional === filterProfessional);
    }
    filtered = filtered.sort((a, b) => {
      if (sortDirection === 'asc') {
        return a.startTime.localeCompare(b.startTime);
      } else {
        return b.startTime.localeCompare(a.startTime);
      }
    });
    return filtered;
  }, [appointments, filterClient, filterProfessional, sortDirection]);

  return (
    <AdminAppointmentsTemplate
      appointments={filteredAppointments}
      clients={clients}
      professionals={professionals}
      filterClient={filterClient}
      filterProfessional={filterProfessional}
      sortDirection={sortDirection}
      onFilterClient={setFilterClient}
      onFilterProfessional={setFilterProfessional}
      onSortDirection={setSortDirection}
      onRefresh={handleRefresh}
    />
  );
}
