'use client';

import { CalendarClock } from 'lucide-react';
import { DashboardTemplateCard } from '../DashboardTemplateCard/DashboardTemplateCard';
import { Appointment } from '../DashboardTemplateAppointmentsTable/DashboardTemplateAppointmentsTable';
import { cn, formatCurrency } from '@/utils';
import { Typography } from '@/components/ui/typography';
import { DashboardTemplateWidget } from '../DashboardTemplateWidget';
import { DashboardTemplateDateTime } from '../DashboardTemplateDateTime';

export type DashboardTemplateAppointmentsWidgetProps = {
  appointments: Appointment[];
  upcomingCount: number;
  isLoading?: boolean;
  onViewAllClick?: () => void;
};

// Component for showing appointment preview
function AppointmentPreview({ appointment }: { appointment: Appointment }) {
  return (
    <div className="p-4">
      <div className="flex justify-between items-start mb-1">
        <div>
          <Typography className="font-medium">
            {appointment.serviceName}
          </Typography>
          <DashboardTemplateDateTime
            date={appointment.date}
            time={appointment.time}
            variant="compact"
            showIcons={true}
          />
        </div>
        <Typography className="font-medium">
          {formatCurrency(appointment.amount)}
        </Typography>
      </div>
    </div>
  );
}

// Component for empty appointments state
function EmptyAppointmentsState() {
  return (
    <div className="p-6 flex flex-col items-center justify-center h-40">
      <CalendarClock className="h-8 w-8 mb-2 text-muted-foreground" />
      <p className="text-center">No upcoming appointments</p>
      <p className="text-center text-sm text-muted-foreground">
        Your upcoming appointments will appear here.
      </p>
    </div>
  );
}

// Component for loading state
function LoadingAppointmentsState() {
  return (
    <div className="p-6 space-y-3">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="flex justify-between p-3 rounded bg-muted/10 animate-pulse"
        >
          <div className="space-y-2">
            <div className="h-4 w-32 bg-muted/30 rounded" />
            <div className="h-3 w-24 bg-muted/30 rounded" />
          </div>
          <div className="h-6 w-16 bg-muted/30 rounded" />
        </div>
      ))}
    </div>
  );
}

export function DashboardTemplateAppointmentsWidget({
  appointments,
  upcomingCount,
  isLoading = false,
  onViewAllClick,
}: DashboardTemplateAppointmentsWidgetProps) {
  const upcomingAppointments = appointments.filter(
    (a) => a.status === 'upcoming',
  );

  return (
    <div className="space-y-4">
      <DashboardTemplateCard
        title="Upcoming Appointments"
        value={upcomingCount.toString()}
        description={`${upcomingCount === 1 ? 'Appointment' : 'Appointments'} scheduled`}
        icon={<CalendarClock className="h-5 w-5" />}
        isLoading={isLoading}
        colorVariant={upcomingCount > 0 ? 'primary' : 'default'}
        className={cn('mb-4')}
      />

      <DashboardTemplateWidget
        isLoading={isLoading}
        loadingContent={<LoadingAppointmentsState />}
        emptyContent={<EmptyAppointmentsState />}
        isEmpty={upcomingAppointments.length === 0}
        onViewAllClick={onViewAllClick}
        viewAllText="View all appointments"
      >
        {upcomingAppointments.slice(0, 3).map((appointment) => (
          <AppointmentPreview key={appointment.id} appointment={appointment} />
        ))}
      </DashboardTemplateWidget>
    </div>
  );
}
