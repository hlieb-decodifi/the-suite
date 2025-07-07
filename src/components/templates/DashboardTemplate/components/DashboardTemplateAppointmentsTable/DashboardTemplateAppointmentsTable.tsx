import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Typography } from '@/components/ui/typography';
import { formatCurrency } from '@/utils';
import { format } from 'date-fns';
import { CalendarDays, Clock, ChevronRight } from 'lucide-react';

export type Appointment = {
  id: string;
  date: Date;
  time: string;
  serviceName: string;
  clientName?: string;
  professionalName?: string;
  status: 'upcoming' | 'completed' | 'cancelled' | 'ongoing';
  computed_status?: string;
  amount: number;
};

export type DashboardTemplateAppointmentsTableProps = {
  appointments: Appointment[];
  isLoading?: boolean;
  isProfessionalView?: boolean;
};

// Helper component to render the status badge
export function AppointmentStatusBadge({
  status,
}: {
  status: Appointment['status'];
}) {
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
    case 'ongoing':
      return (
        <Badge
          variant="outline"
          className="bg-orange-500/10 text-orange-500 border-orange-500/20"
        >
          Ongoing
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
function AppointmentCard({
  appointment,
  isProfessionalView,
}: {
  appointment: Appointment;
  isProfessionalView: boolean;
}) {
  return (
    <div className="p-4 border rounded-lg mb-2 bg-card">
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
              ? appointment.clientName
              : appointment.professionalName}
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
  );
}

export function DashboardTemplateAppointmentsTable({
  appointments,
  isLoading = false,
  isProfessionalView = false,
}: DashboardTemplateAppointmentsTableProps) {
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
              <TableRow key={appointment.id}>
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
                    ? appointment.clientName
                    : appointment.professionalName}
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
          <AppointmentCard
            key={appointment.id}
            appointment={appointment}
            isProfessionalView={isProfessionalView}
          />
        ))}
      </div>
    </>
  );
}
