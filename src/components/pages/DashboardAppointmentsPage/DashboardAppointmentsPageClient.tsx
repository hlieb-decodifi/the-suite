'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Typography } from '@/components/ui/typography';
import { CalendarDays, Clock, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatCurrency } from '@/utils';

// Define appointment type
type AppointmentType = {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  location?: string;
  services?: {
    id: string;
    name: string;
    description?: string;
    duration?: number;
    price?: number;
  } | null;
  professionals?: {
    id: string;
    user_id: string;
    users?: {
      id: string;
      first_name?: string;
      last_name?: string;
    };
  };
  clients?: {
    id: string;
    user_id: string;
    users?: {
      id: string;
      first_name?: string;
      last_name?: string;
    };
  };
};

// Type for transformed appointment data for the table
type Appointment = {
  id: string;
  date: Date;
  time: string;
  serviceName: string;
  clientName?: string;
  professionalName?: string;
  status: 'upcoming' | 'completed' | 'cancelled' | 'pending';
  amount: number;
};

type DashboardAppointmentsPageClientProps = {
  isProfessional: boolean;
  appointments: AppointmentType[]; // Specify the correct type instead of any[]
};

// Filter Buttons component (copied from DashboardTemplateAppointmentsFilters)
function FilterButtons({
  activeFilter,
  setActiveFilter,
  upcomingCount,
  completedCount,
  cancelledCount,
}: {
  activeFilter: string;
  setActiveFilter: (filter: string) => void;
  upcomingCount: number;
  completedCount: number;
  cancelledCount: number;
}) {
  return (
    <div className="inline-flex items-center mb-4 bg-muted/30 p-1 rounded-full">
      <button
        className={`px-4 py-1.5 rounded-full text-sm font-medium ${
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

// Helper component to render the status badge
function AppointmentStatusBadge({ status }: { status: Appointment['status'] }) {
  switch (status) {
    case 'upcoming':
      return (
        <Badge
          variant="outline"
          className="bg-primary/10 text-primary border-primary/20"
        >
          Upcoming
        </Badge>
      );
    case 'completed':
      return (
        <Badge
          variant="outline"
          className="bg-green-500/10 text-green-500 border-green-500/20"
        >
          Completed
        </Badge>
      );
    case 'cancelled':
      return (
        <Badge
          variant="outline"
          className="bg-destructive/10 text-destructive border-destructive/20"
        >
          Cancelled
        </Badge>
      );
    case 'pending':
      return (
        <Badge
          variant="outline"
          className="bg-amber-500/10 text-amber-800 border-amber-200"
        >
          Pending
        </Badge>
      );
    default:
      return null;
  }
}

// Helper component for loading state
function AppointmentTableLoading() {
  return (
    <div className="rounded-md border p-8">
      <div className="flex flex-col items-center justify-center space-y-2">
        <div className="h-8 w-32 bg-muted/30 animate-pulse rounded" />
        <Typography variant="small" className="text-muted-foreground">
          Loading appointments...
        </Typography>
      </div>
    </div>
  );
}

// Helper component for empty state
function AppointmentTableEmpty() {
  return (
    <div className="rounded-md border p-8">
      <div className="flex flex-col items-center justify-center space-y-2">
        <CalendarDays className="h-12 w-12 text-muted-foreground" />
        <Typography>No appointments found</Typography>
        <Typography variant="small" className="text-muted-foreground">
          Appointments will appear here once scheduled.
        </Typography>
      </div>
    </div>
  );
}

// Mobile appointment card for responsive display
function AppointmentTableCard({
  appointment,
  isProfessionalView,
}: {
  appointment: Appointment;
  isProfessionalView: boolean;
}) {
  return (
    <Link href={`/bookings/${appointment.id}`}>
      <div className="p-4 border rounded-lg mb-2 bg-card hover:bg-muted/50 transition-colors cursor-pointer">
        <div className="flex justify-between items-start">
          <div>
            <Typography className="font-medium">
              {appointment.serviceName}
            </Typography>
            <div className="text-muted-foreground text-sm flex items-center mt-1">
              <CalendarDays className="mr-1 h-3 w-3" />
              {format(appointment.date, 'MMM dd, yyyy')}
              <span className="mx-1">•</span>
              <Clock className="mr-1 h-3 w-3" />
              {appointment.time}
            </div>
          </div>
          <AppointmentStatusBadge status={appointment.status} />
        </div>

        <div className="mt-3 pt-3 border-t flex justify-between items-center">
          <div>
            <Typography variant="small" className="text-muted-foreground">
              {isProfessionalView ? 'Client' : 'Professional'}
            </Typography>
            <Typography className="font-medium">
              {isProfessionalView
                ? appointment.clientName || 'Client'
                : appointment.professionalName || 'Professional'}
            </Typography>
          </div>
          <div className="flex items-center">
            <Typography className="font-bold mr-2">
              {formatCurrency(appointment.amount)}
            </Typography>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </div>
    </Link>
  );
}

// Appointments table component (copied from DashboardTemplateAppointmentsTable)
function DashboardTemplateAppointmentsTable({
  appointments,
  isLoading = false,
  isProfessionalView = false,
}: {
  appointments: Appointment[];
  isLoading?: boolean;
  isProfessionalView?: boolean;
}) {
  const router = useRouter();

  if (isLoading) return <AppointmentTableLoading />;
  if (appointments.length === 0) return <AppointmentTableEmpty />;

  return (
    <>
      {/* Desktop table view - hidden on small screens */}
      <div className="hidden md:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px]">Date & Time</TableHead>
              <TableHead className="w-[200px]">Service</TableHead>
              <TableHead className="w-[180px]">
                {isProfessionalView ? 'Client' : 'Professional'}
              </TableHead>
              <TableHead className="w-[120px]">Status</TableHead>
              <TableHead className="w-[100px] text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {appointments.map((appointment) => (
              <TableRow
                key={appointment.id}
                className="hover:bg-muted/50 cursor-pointer"
                onClick={() => router.push(`/bookings/${appointment.id}`)}
              >
                <TableCell>
                  <div className="flex flex-col">
                    <div className="flex items-center">
                      <CalendarDays className="mr-1 h-3 w-3 text-muted-foreground" />
                      <span>{format(appointment.date, 'MMM dd, yyyy')}</span>
                    </div>
                    <div className="flex items-center text-muted-foreground">
                      <Clock className="mr-1 h-3 w-3" />
                      <span>{appointment.time}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>{appointment.serviceName}</TableCell>
                <TableCell>
                  {isProfessionalView
                    ? appointment.clientName || 'Client'
                    : appointment.professionalName || 'Professional'}
                </TableCell>
                <TableCell>
                  <AppointmentStatusBadge status={appointment.status} />
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(appointment.amount)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile card view - shown only on small screens */}
      <div className="md:hidden">
        {appointments.map((appointment) => (
          <AppointmentTableCard
            key={appointment.id}
            appointment={appointment}
            isProfessionalView={isProfessionalView}
          />
        ))}
      </div>
    </>
  );
}

// Main component
export function DashboardAppointmentsPageClient({
  isProfessional,
  appointments,
}: DashboardAppointmentsPageClientProps) {
  const [activeFilter, setActiveFilter] = useState('all');

  // Validate appointments array to ensure each item has required fields
  const validAppointments = Array.isArray(appointments)
    ? appointments.filter((appointment): appointment is AppointmentType => {
        return (
          typeof appointment === 'object' &&
          appointment !== null &&
          typeof appointment.id === 'string' &&
          typeof appointment.start_time === 'string' &&
          typeof appointment.end_time === 'string' &&
          typeof appointment.status === 'string'
        );
      })
    : [];

  // Transform appointments into the format needed for the table
  const transformedAppointments: Appointment[] = validAppointments.map(
    (appointment) => {
      const startTime = new Date(appointment.start_time);

      // Get service name
      const serviceName = appointment.services?.name || 'Service';

      // Get client name
      const clientName = appointment.clients?.users
        ? `${appointment.clients.users.first_name || ''} ${appointment.clients.users.last_name || ''}`.trim()
        : 'Client';

      // Get professional name
      const professionalName = appointment.professionals?.users
        ? `${appointment.professionals.users.first_name || ''} ${appointment.professionals.users.last_name || ''}`.trim()
        : 'Professional';

      // Get amount (placeholder since price isn't available)
      const amount = appointment.services?.price || 75.0;

      // Map status to expected format
      let formattedStatus: Appointment['status'] = 'upcoming';
      switch (appointment.status) {
        case 'completed':
          formattedStatus = 'completed';
          break;
        case 'cancelled':
          formattedStatus = 'cancelled';
          break;
        case 'pending':
          formattedStatus = 'pending';
          break;
        case 'confirmed':
        case 'upcoming':
        default:
          formattedStatus = 'upcoming';
          break;
      }

      return {
        id: appointment.id,
        date: startTime,
        time: format(startTime, 'h:mm a'),
        serviceName,
        clientName,
        professionalName,
        status: formattedStatus,
        amount,
      };
    },
  );

  // Filter appointments based on selected filters
  const filteredAppointments = transformedAppointments.filter((appointment) => {
    // Status filter
    if (activeFilter !== 'all' && appointment.status !== activeFilter) {
      return false;
    }

    return true;
  });

  // Group appointments by status
  const upcomingAppointments = filteredAppointments.filter(
    (appointment) => appointment.status === 'upcoming',
  );

  const completedAppointments = filteredAppointments.filter(
    (appointment) => appointment.status === 'completed',
  );

  const cancelledAppointments = filteredAppointments.filter(
    (appointment) => appointment.status === 'cancelled',
  );

  // Table view with filters
  return (
    <div className="space-y-6">
      {/* Regular Table View */}
      <div className="rounded-lg bg-card border shadow-sm overflow-hidden">
        <div className="p-6 border-b bg-muted/30">
          <Typography variant="h3" className="text-xl font-semibold">
            Appointments
          </Typography>
          <Typography variant="small" className="text-muted-foreground">
            Showing {filteredAppointments.length} appointments
          </Typography>
        </div>
        <div className="p-4">
          <FilterButtons
            activeFilter={activeFilter}
            setActiveFilter={setActiveFilter}
            upcomingCount={upcomingAppointments.length}
            completedCount={completedAppointments.length}
            cancelledCount={cancelledAppointments.length}
          />

          <DashboardTemplateAppointmentsTable
            appointments={
              activeFilter === 'all'
                ? filteredAppointments
                : activeFilter === 'upcoming'
                  ? upcomingAppointments
                  : filteredAppointments.filter(
                      (a) => a.status === activeFilter,
                    )
            }
            isLoading={false}
            isProfessionalView={isProfessional}
          />
        </div>
      </div>
    </div>
  );
}
