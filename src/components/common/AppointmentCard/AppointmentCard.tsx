'use client';

import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Typography } from '@/components/ui/typography';
import { Button } from '@/components/ui/button';
import { CalendarIcon, ClockIcon, MapPinIcon, UserIcon } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import Link from 'next/link';

// Define type for appointment
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

type AppointmentCardProps = {
  appointment: AppointmentType;
  isProfessional: boolean;
  showActions?: boolean;
};

export function AppointmentCard({
  appointment,
  isProfessional,
  showActions = true,
}: AppointmentCardProps) {
  if (!appointment) return null;

  // Extract data from appointment
  const startTime = appointment.start_time
    ? parseISO(appointment.start_time)
    : new Date();
  const endTime = appointment.end_time
    ? parseISO(appointment.end_time)
    : new Date();
  const service = appointment.services || { name: 'Appointment' };

  // Get the other party (client or professional)
  const otherParty = isProfessional
    ? appointment.clients?.users
    : appointment.professionals?.users;

  const otherPartyName = otherParty
    ? `${otherParty.first_name || ''} ${otherParty.last_name || ''}`.trim()
    : 'Unknown';

  // Status color mapping
  const statusColorMap: Record<string, string> = {
    confirmed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
    completed: 'bg-blue-100 text-blue-800',
    pending: 'bg-yellow-100 text-yellow-800',
  };

  const statusClass =
    statusColorMap[appointment.status] || 'bg-gray-100 text-gray-800';

  return (
    <Card className="overflow-hidden transition-all hover:shadow-md">
      <CardContent className="p-0">
        <div className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div className="flex flex-col gap-1">
              <Typography variant="h4" className="font-semibold">
                {service.name || 'Appointment'}
              </Typography>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <CalendarIcon className="h-3.5 w-3.5" />
                <Typography variant="small">
                  {format(startTime, 'EEEE, MMMM d, yyyy')}
                </Typography>
              </div>
            </div>
            <Badge className={`${statusClass} capitalize`}>
              {appointment.status || 'Unknown'}
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
            <div className="flex items-center gap-2">
              <ClockIcon className="h-4 w-4 text-muted-foreground" />
              <div>
                <Typography variant="small" className="text-muted-foreground">
                  Time
                </Typography>
                <Typography variant="p" className="font-medium">
                  {format(startTime, 'h:mm a')} - {format(endTime, 'h:mm a')}
                </Typography>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <MapPinIcon className="h-4 w-4 text-muted-foreground" />
              <div>
                <Typography variant="small" className="text-muted-foreground">
                  Location
                </Typography>
                <Typography variant="p" className="font-medium">
                  {appointment.location || 'Not specified'}
                </Typography>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <UserIcon className="h-4 w-4 text-muted-foreground" />
              <div>
                <Typography variant="small" className="text-muted-foreground">
                  {isProfessional ? 'Client' : 'Professional'}
                </Typography>
                <Typography variant="p" className="font-medium">
                  {otherPartyName}
                </Typography>
              </div>
            </div>
          </div>
        </div>
      </CardContent>

      {showActions && (
        <CardFooter className="flex justify-end gap-2 p-4 pt-0">
          <Link href={`/dashboard/appointments/${appointment.id}`}>
            <Button variant="outline" size="sm">
              View Details
            </Button>
          </Link>
        </CardFooter>
      )}
    </Card>
  );
}
