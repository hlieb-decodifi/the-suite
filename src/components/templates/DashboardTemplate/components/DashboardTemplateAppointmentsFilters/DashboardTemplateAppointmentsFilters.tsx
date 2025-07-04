'use client';

import { useState } from 'react';
import { Typography } from '@/components/ui/typography';
import {
  DashboardTemplateAppointmentsTable,
  Appointment,
} from '../DashboardTemplateAppointmentsTable/DashboardTemplateAppointmentsTable';

export type DashboardTemplateAppointmentsFiltersProps = {
  dateRange: [Date | undefined, Date | undefined];
  filteredAppointments: Appointment[];
  upcomingAppointments: Appointment[];
  pastAppointments: Appointment[];
  isLoading?: boolean;
  isProfessionalView?: boolean;
  title?: string;
};

// Filter buttons component
function FilterButtons({
  activeFilter,
  setActiveFilter,
  upcomingCount,
  completedCount,
  cancelledCount,
  ongoingCount,
}: {
  activeFilter: string;
  setActiveFilter: (filter: string) => void;
  upcomingCount: number;
  completedCount: number;
  cancelledCount: number;
  ongoingCount: number;
}) {
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      <button
        className={`px-4 py-1.5 rounded-full text-sm font-medium hover:bg-muted ${
          activeFilter === 'all'
            ? 'bg-white shadow-sm'
            : 'text-muted-foreground'
        }`}
        onClick={() => setActiveFilter('all')}
      >
        All
      </button>
      <button
        className={`px-4 py-1.5 rounded-full text-sm font-medium ${
          upcomingCount > 0 ? 'hover:bg-muted' : ''
        } ${
          activeFilter === 'upcoming'
            ? 'bg-white shadow-sm'
            : 'text-muted-foreground'
        }`}
        onClick={() => setActiveFilter('upcoming')}
      >
        Upcoming
      </button>
      <button
        className={`px-4 py-1.5 rounded-full text-sm font-medium ${
          ongoingCount > 0 ? 'hover:bg-muted' : ''
        } ${
          activeFilter === 'ongoing'
            ? 'bg-white shadow-sm'
            : 'text-muted-foreground'
        }`}
        onClick={() => setActiveFilter('ongoing')}
      >
        Ongoing
      </button>
      <button
        className={`px-4 py-1.5 rounded-full text-sm font-medium ${
          completedCount > 0 ? 'hover:bg-muted' : ''
        } ${
          activeFilter === 'completed'
            ? 'bg-white shadow-sm'
            : 'text-muted-foreground'
        }`}
        onClick={() => setActiveFilter('completed')}
      >
        Completed
      </button>
      <button
        className={`px-4 py-1.5 rounded-full text-sm font-medium ${
          cancelledCount > 0 ? 'hover:bg-muted' : ''
        } ${
          activeFilter === 'cancelled'
            ? 'bg-white shadow-sm'
            : 'text-muted-foreground'
        }`}
        onClick={() => setActiveFilter('cancelled')}
      >
        Cancelled
      </button>
    </div>
  );
}

export function DashboardTemplateAppointmentsFilters({
  dateRange,
  filteredAppointments,
  upcomingAppointments,
  pastAppointments,
  isLoading = false,
  isProfessionalView = false,
  title = 'Appointments',
}: DashboardTemplateAppointmentsFiltersProps) {
  const [activeFilter, setActiveFilter] = useState('all');

  // Count of appointments by status for conditional styling
  const completedCount = pastAppointments.filter(
    (a) => a.status === 'completed',
  ).length;
  const cancelledCount = pastAppointments.filter(
    (a) => a.status === 'cancelled',
  ).length;
  const ongoingCount = pastAppointments.filter(
    (a) => a.status === 'ongoing',
  ).length;
  const upcomingCount = upcomingAppointments.length;

  return (
    <div className="rounded-lg bg-card border shadow-sm overflow-hidden">
      <div className="p-6 border-b bg-muted/30">
        <Typography variant="h3" className="text-xl font-semibold">
          {title}
        </Typography>
        <Typography variant="small" className="text-muted-foreground">
          Showing {filteredAppointments.length} appointments{' '}
          {dateRange[0] && dateRange[1] ? 'in selected date range' : ''}
        </Typography>
      </div>
      <div className="p-4">
        <FilterButtons
          activeFilter={activeFilter}
          setActiveFilter={setActiveFilter}
          upcomingCount={upcomingCount}
          completedCount={completedCount}
          cancelledCount={cancelledCount}
          ongoingCount={ongoingCount}
        />

        <DashboardTemplateAppointmentsTable
          appointments={
            activeFilter === 'all'
              ? filteredAppointments
              : activeFilter === 'upcoming'
                ? upcomingAppointments
                : filteredAppointments.filter((a) => a.status === activeFilter)
          }
          isLoading={isLoading}
          isProfessionalView={isProfessionalView}
        />
      </div>
    </div>
  );
}
