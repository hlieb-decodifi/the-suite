'use client';

import { Typography } from '@/components/ui/typography';
import { Button } from '@/components/ui/button';
import { CalendarIcon } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

export type AppointmentType = {
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
  };
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

export type AppointmentItemProps = {
  appointment: AppointmentType;
  showDetails?: boolean;
};

export function AppointmentItem({
  appointment,
  showDetails = true,
}: AppointmentItemProps) {
  const startDate = new Date(appointment.start_time);
  const endDate = new Date(appointment.end_time);

  // Get professional or client name
  const getName = () => {
    if (appointment.professionals?.users) {
      const user = appointment.professionals.users;
      return (
        `${user.first_name || ''} ${user.last_name || ''}`.trim() ||
        'Unknown Professional'
      );
    } else if (appointment.clients?.users) {
      const user = appointment.clients.users;
      return (
        `${user.first_name || ''} ${user.last_name || ''}`.trim() ||
        'Unknown Client'
      );
    }
    return 'Unknown';
  };

  const getStatusBadge = () => {
    switch (appointment.status) {
      case 'upcoming':
      case 'confirmed':
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            Confirmed
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
            Pending
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
            Cancelled
          </Badge>
        );
      case 'completed':
        return (
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
            Completed
          </Badge>
        );
      default:
        return <Badge variant="outline">{appointment.status}</Badge>;
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 border rounded-lg">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Typography className="font-medium truncate">
            {appointment.services?.name || 'Appointment'}
          </Typography>
          {getStatusBadge()}
        </div>
        <Typography className="text-sm text-muted-foreground">
          with {getName()}
        </Typography>
        <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
          <CalendarIcon className="h-4 w-4" />
          <span>
            {format(startDate, 'MMM d, yyyy')} · {format(startDate, 'h:mm a')} -{' '}
            {format(endDate, 'h:mm a')}
          </span>
        </div>
      </div>
      {showDetails && (
        <Link href={`/dashboard/appointments/${appointment.id}`}>
          <Button variant="outline" size="sm">
            View Details
          </Button>
        </Link>
      )}
    </div>
  );
}
