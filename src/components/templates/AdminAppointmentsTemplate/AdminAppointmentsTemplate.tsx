


import { Typography } from '@/components/ui/typography';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, Clock } from 'lucide-react';
import { format } from 'date-fns';
import type { Appointment } from '@/types/appointments';

type Props = {
  appointments: Appointment[];
  clients: string[];
  professionals: string[];
  filterClient: string;
  filterProfessional: string;
  sortDirection: 'asc' | 'desc';
  onFilterClient: (client: string) => void;
  onFilterProfessional: (professional: string) => void;
  onSortDirection: (direction: 'asc' | 'desc') => void;
};

export function AdminAppointmentsTemplate({
  appointments,
  clients,
  professionals,
  filterClient,
  filterProfessional,
  sortDirection,
  onFilterClient,
  onFilterProfessional,
  onSortDirection,
}: Props) {
  // Helper for status badge
  function StatusBadge({ status }: { status: string }) {
    switch (status) {
      case 'completed':
        return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">Completed</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">Cancelled</Badge>;
      case 'upcoming':
      default:
        return <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">Upcoming</Badge>;
    }
  }

  // ...existing code...

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-card border shadow-sm overflow-hidden">
        <div className="p-6 border-b bg-muted/30">
          <Typography variant="h3" className="text-xl font-semibold">
            Appointments
          </Typography>
          <Typography variant="small" className="text-muted-foreground">
            Showing {appointments.length} appointments
          </Typography>
        </div>
        <div className="p-4">
          <div className="flex gap-4 mb-4">
            <label>
              Client:
              <select
                className="ml-2 border rounded px-2 py-1"
                value={filterClient}
                onChange={e => onFilterClient(e.target.value)}
              >
                <option value="">All</option>
                {clients.map(client => (
                  <option key={client} value={client}>{client}</option>
                ))}
              </select>
            </label>
            <label>
              Professional:
              <select
                className="ml-2 border rounded px-2 py-1"
                value={filterProfessional}
                onChange={e => onFilterProfessional(e.target.value)}
              >
                <option value="">All</option>
                {professionals.map(professional => (
                  <option key={professional} value={professional}>{professional}</option>
                ))}
              </select>
            </label>
            <label>
              Sort by Date:
              <select
                className="ml-2 border rounded px-2 py-1"
                value={sortDirection}
                onChange={e => onSortDirection(e.target.value as 'asc' | 'desc')}
              >
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
              </select>
            </label>
          </div>
          {/* Desktop table view */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-muted/20 hover:bg-muted/20">
                  <th className="border px-2 py-1">Start Time</th>
                  <th className="border px-2 py-1">End Time</th>
                  <th className="border px-2 py-1">Client</th>
                  <th className="border px-2 py-1">Professional</th>
                  <th className="border px-2 py-1">Service</th>
                  <th className="border px-2 py-1">Status</th>
                </tr>
              </thead>
              <tbody>
                {appointments.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <div className="flex flex-col items-center justify-center space-y-2 py-8">
                        <CalendarDays className="h-12 w-12 text-muted-foreground" />
                        <Typography>No appointments found</Typography>
                        <Typography variant="small" className="text-muted-foreground">
                          Appointments will appear here once scheduled.
                        </Typography>
                      </div>
                    </td>
                  </tr>
                ) : (
                  appointments.map(app => (
                    <tr
                      key={app.id}
                      className="hover:bg-muted/50 cursor-pointer"
                      onClick={() => window.location.href = `/bookings/${app.id}`}
                    >
                      <td className="border px-2 py-1">
                        <div className="flex items-center">
                          <CalendarDays className="mr-1 h-3 w-3 text-muted-foreground" />
                          <span>{format(new Date(app.startTime), 'MMM dd, yyyy')}</span>
                        </div>
                        <div className="flex items-center text-muted-foreground">
                          <Clock className="mr-1 h-3 w-3" />
                          <span>{format(new Date(app.startTime), 'h:mm a')}</span>
                        </div>
                      </td>
                      <td className="border px-2 py-1">
                        <div className="flex items-center">
                          <CalendarDays className="mr-1 h-3 w-3 text-muted-foreground" />
                          <span>{format(new Date(app.endTime), 'MMM dd, yyyy')}</span>
                        </div>
                        <div className="flex items-center text-muted-foreground">
                          <Clock className="mr-1 h-3 w-3" />
                          <span>{format(new Date(app.endTime), 'h:mm a')}</span>
                        </div>
                      </td>
                      <td className="border px-2 py-1">{app.client}</td>
                      <td className="border px-2 py-1">{app.professional}</td>
                      <td className="border px-2 py-1">{app.service}</td>
                      <td className="border px-2 py-1"><StatusBadge status={app.status} /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {/* Mobile card view */}
          <div className="md:hidden">
            {appointments.map(app => (
              <div key={app.id} className="p-4 border rounded-lg mb-2 bg-card hover:bg-muted/50 transition-colors cursor-pointer">
                <div className="flex justify-between items-start">
                  <div>
                    <Typography className="font-medium">{app.service}</Typography>
                    <div className="text-muted-foreground text-sm flex items-center mt-1">
                      <CalendarDays className="mr-1 h-3 w-3" />
                      {format(new Date(app.startTime), 'MMM dd, yyyy')}
                      <span className="mx-1">•</span>
                      <Clock className="mr-1 h-3 w-3" />
                      {format(new Date(app.startTime), 'h:mm a')}
                    </div>
                  </div>
                  <StatusBadge status={app.status} />
                </div>
                <div className="mt-3 pt-3 border-t flex justify-between items-center">
                  <div>
                    <Typography variant="small" className="text-muted-foreground">
                      Professional
                    </Typography>
                    <Typography className="font-medium">{app.professional}</Typography>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
