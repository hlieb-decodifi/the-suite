'use client';

import { useState } from 'react';
import { Typography } from '@/components/ui/typography';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatCurrency } from '@/utils/formatCurrency';
import { format } from 'date-fns';
import { PhoneNumberUtil, PhoneNumberFormat } from 'google-libphonenumber';
import {
  CalendarIcon,
  ClockIcon,
  UserIcon,
  CreditCardIcon,
  FileTextIcon,
  ArrowLeftIcon,
  CopyIcon,
  Phone,
} from 'lucide-react';
import Link from 'next/link';

// Local types to avoid import issues
type BookingPayment = {
  id: string;
  amount: number;
  status: string;
  payment_method_id: string;
  created_at: string;
};

type BookingService = {
  id: string;
  service_id: string;
  price: number;
  duration: number;
  services: {
    id: string;
    name: string;
    description?: string;
  };
};

type DetailedAppointment = {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  created_at: string;
  updated_at: string;
  booking_id: string;
  bookings: {
    id: string;
    client_id: string;
    professional_profile_id: string;
    status: string;
    notes?: string | null;
    created_at: string;
    updated_at: string;
    clients: {
      id: string;
      first_name: string;
      last_name: string;
      client_profiles: {
        id: string;
        phone_number?: string | null;
        location?: string | null;
        addresses?: {
          id: string;
          street_address?: string | null;
          city?: string | null;
          state?: string | null;
          country?: string | null;
        } | null;
      } | null;
    } | null;
    professionals: {
      id: string;
      user_id: string;
      description?: string | null;
      profession?: string | null;
      phone_number?: string | null;
      location?: string | null;
      addresses?: {
        id: string;
        street_address?: string | null;
        city?: string | null;
        state?: string | null;
        country?: string | null;
      } | null;
      users: {
        id: string;
        first_name: string;
        last_name: string;
      };
    } | null;
    booking_services: BookingService[];
    booking_payments: BookingPayment[];
  };
};

export type BookingDetailPageClientProps = {
  appointment: DetailedAppointment;
  isProfessional: boolean;
  currentUserId: string;
};

const phoneUtil = PhoneNumberUtil.getInstance();

const formatPhoneNumber = (phone: string): string => {
  if (!phone || phone.trim() === '') {
    return phone;
  }

  try {
    const parsed = phoneUtil.parseAndKeepRawInput(phone);
    if (phoneUtil.isValidNumber(parsed)) {
      // Use INTERNATIONAL format for a clean, professional display
      return phoneUtil.format(parsed, PhoneNumberFormat.INTERNATIONAL);
    }
    // If parsing fails or number is invalid, return the original phone number
    return phone;
  } catch {
    // If parsing fails, return the original phone number
    return phone;
  }
};

export function BookingDetailPageClient({
  appointment,
  isProfessional,
  currentUserId,
}: BookingDetailPageClientProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(appointment.status);
  const [copySuccess, setCopySuccess] = useState(false);

  // Combine date and time for proper Date objects
  const startDate = new Date(`${appointment.date}T${appointment.start_time}`);
  const endDate = new Date(`${appointment.date}T${appointment.end_time}`);

  const getInitials = (firstName?: string, lastName?: string) => {
    const first = firstName?.charAt(0) || '';
    const last = lastName?.charAt(0) || '';
    return `${first}${last}`.toUpperCase() || '?';
  };

  const getFullName = (firstName?: string, lastName?: string) => {
    return `${firstName || ''} ${lastName || ''}`.trim() || 'Unknown User';
  };

  const formatAddress = (
    address?: {
      street_address?: string | null;
      city?: string | null;
      state?: string | null;
      country?: string | null;
    } | null,
  ) => {
    if (!address) return null;

    const parts = [
      address.street_address,
      address.city,
      address.state,
      address.country,
    ].filter(Boolean);

    return parts.length > 0 ? parts.join(', ') : null;
  };

  const getProfessionalTitle = (
    professional: DetailedAppointment['bookings']['professionals'],
  ) => {
    if (professional?.profession) {
      return professional.profession;
    }
    return 'Professional';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
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
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    setIsUpdating(true);
    try {
      // Import the function from the actions file
      const { updateAppointmentStatus } = await import('./actions');
      const result = await updateAppointmentStatus(
        appointment.id,
        newStatus,
        currentUserId,
        isProfessional,
      );
      if (result.success) {
        setCurrentStatus(newStatus);
      } else {
        alert(result.error || 'Failed to update appointment status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update appointment status');
    } finally {
      setIsUpdating(false);
    }
  };

  const canUpdateStatus = () => {
    // Professionals can update status for confirmed/pending appointments
    if (isProfessional) {
      return ['pending', 'confirmed', 'upcoming'].includes(currentStatus);
    }
    // Clients can cancel confirmed/pending appointments
    return ['pending', 'confirmed', 'upcoming'].includes(currentStatus);
  };

  const getAvailableStatuses = () => {
    if (isProfessional) {
      switch (currentStatus) {
        case 'pending':
          return [
            { value: 'confirmed', label: 'Confirm Appointment' },
            { value: 'cancelled', label: 'Cancel Appointment' },
          ];
        case 'confirmed':
        case 'upcoming':
          return [
            { value: 'completed', label: 'Mark as Completed' },
            { value: 'cancelled', label: 'Cancel Appointment' },
          ];
        default:
          return [];
      }
    } else {
      // Clients can only cancel
      return [{ value: 'cancelled', label: 'Cancel Appointment' }];
    }
  };

  const handleCopyBookingId = async () => {
    try {
      await navigator.clipboard.writeText(appointment.id);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy booking ID:', err);
    }
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-6">
          <Link
            href="/dashboard/appointments"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            <Typography>Back to Appointments</Typography>
          </Link>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-col gap-2">
            <Typography
              variant="h1"
              className="mb-2 font-futura text-4xl md:text-5xl font-bold text-foreground"
            >
              Booking Details
            </Typography>
            <div className="flex items-center gap-2">
              <Typography>Booking ID: {appointment.id}</Typography>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyBookingId}
                className="h-6 px-2 text-muted-foreground hover:text-foreground"
              >
                <CopyIcon className="h-3 w-3" />
                {copySuccess ? 'Copied!' : ''}
              </Button>
            </div>
          </div>
          {getStatusBadge(currentStatus)}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Service Information */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <FileTextIcon className="h-5 w-5 text-muted-foreground" />
                Service Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {appointment.bookings.booking_services.map((bookingService) => (
                <div key={bookingService.id}>
                  <Typography variant="large" className="mb-2">
                    {bookingService.services.name}
                  </Typography>
                  {bookingService.services.description && (
                    <Typography variant="p" className="mb-4">
                      {bookingService.services.description}
                    </Typography>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <ClockIcon className="h-4 w-4 text-muted-foreground" />
                      <Typography className="text-muted-foreground">
                        Duration:
                      </Typography>
                      <Typography className="font-medium">
                        {bookingService.duration} minutes
                      </Typography>
                    </div>
                    <div className="flex items-center gap-2">
                      <CreditCardIcon className="h-4 w-4 text-muted-foreground" />
                      <Typography className="text-muted-foreground">
                        Price:
                      </Typography>
                      <Typography className="font-medium text-primary">
                        {formatCurrency(bookingService.price)}
                      </Typography>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Appointment Time & Location */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-muted-foreground" />
                Appointment Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Typography className="font-medium text-foreground mb-1">
                  Date & Time
                </Typography>
                <Typography variant="muted" className="mb-1">
                  {format(startDate, 'EEEE, MMMM d, yyyy')}
                </Typography>
                <Typography variant="muted">
                  {format(startDate, 'h:mm a')} - {format(endDate, 'h:mm a')}
                </Typography>
              </div>
              {appointment.bookings.notes && (
                <div>
                  <Typography className="font-medium text-foreground mb-1">
                    Notes
                  </Typography>
                  <Typography variant="muted">
                    {appointment.bookings.notes}
                  </Typography>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Professional's View: Client Information */}
          {isProfessional && appointment.bookings.clients && (
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <UserIcon className="h-5 w-5 text-muted-foreground" />
                  Client Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-start gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src="" />
                    <AvatarFallback className="bg-primary/10 text-primary font-medium">
                      {getInitials(
                        appointment.bookings.clients.first_name,
                        appointment.bookings.clients.last_name,
                      )}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-3">
                    <div>
                      <Typography className="font-medium text-foreground">
                        {getFullName(
                          appointment.bookings.clients.first_name,
                          appointment.bookings.clients.last_name,
                        )}
                      </Typography>
                    </div>

                    {appointment.bookings.clients.client_profiles
                      ?.phone_number && (
                      <div>
                        <Typography className="font-medium text-foreground">
                          Phone
                        </Typography>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Phone className="h-3.5 w-3.5 mr-1.5" />
                          <a
                            href={`tel:${appointment.bookings.clients.client_profiles.phone_number}`}
                          >
                            {formatPhoneNumber(
                              appointment.bookings.clients.client_profiles
                                .phone_number,
                            )}
                          </a>
                        </div>
                      </div>
                    )}

                    {appointment.bookings.clients.client_profiles?.location && (
                      <div>
                        <Typography className="font-medium text-foreground">
                          Location
                        </Typography>
                        <Typography variant="muted">
                          {
                            appointment.bookings.clients.client_profiles
                              .location
                          }
                        </Typography>
                      </div>
                    )}

                    {formatAddress(
                      appointment.bookings.clients.client_profiles?.addresses,
                    ) && (
                      <div>
                        <Typography className="font-medium text-foreground">
                          Address
                        </Typography>
                        <Typography variant="muted">
                          {formatAddress(
                            appointment.bookings.clients.client_profiles
                              ?.addresses,
                          )}
                        </Typography>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Client's View: Professional Information */}
          {!isProfessional && appointment.bookings.professionals && (
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <UserIcon className="h-5 w-5 text-muted-foreground" />
                  Professional Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-start gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src="" />
                    <AvatarFallback className="bg-primary/10 text-primary font-medium">
                      {getInitials(
                        appointment.bookings.professionals.users.first_name,
                        appointment.bookings.professionals.users.last_name,
                      )}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-3">
                    <div>
                      <Typography className="font-medium text-foreground">
                        {getFullName(
                          appointment.bookings.professionals.users.first_name,
                          appointment.bookings.professionals.users.last_name,
                        )}
                      </Typography>
                      <Typography variant="muted" className="text-sm">
                        {getProfessionalTitle(
                          appointment.bookings.professionals,
                        )}
                      </Typography>
                    </div>

                    {appointment.bookings.professionals.description && (
                      <div>
                        <Typography className="font-medium text-foreground">
                          About
                        </Typography>
                        <Typography variant="muted">
                          {appointment.bookings.professionals.description}
                        </Typography>
                      </div>
                    )}

                    {appointment.bookings.professionals.phone_number && (
                      <div>
                        <Typography className="font-medium text-foreground">
                          Phone
                        </Typography>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Phone className="h-3.5 w-3.5 mr-1.5" />
                          <a
                            href={`tel:${appointment.bookings.professionals.phone_number}`}
                          >
                            {formatPhoneNumber(
                              appointment.bookings.professionals.phone_number,
                            )}
                          </a>
                        </div>
                      </div>
                    )}

                    {appointment.bookings.professionals.location && (
                      <div>
                        <Typography className="font-medium text-foreground">
                          Location
                        </Typography>
                        <Typography variant="muted">
                          {appointment.bookings.professionals.location}
                        </Typography>
                      </div>
                    )}

                    {formatAddress(
                      appointment.bookings.professionals.addresses,
                    ) && (
                      <div>
                        <Typography className="font-medium text-foreground">
                          Address
                        </Typography>
                        <Typography variant="muted">
                          {formatAddress(
                            appointment.bookings.professionals.addresses,
                          )}
                        </Typography>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Fallback when client/professional data is missing */}
          {isProfessional && !appointment.bookings.clients && (
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <UserIcon className="h-5 w-5 text-muted-foreground" />
                  Client Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Typography variant="muted">
                  Client information is not available due to privacy settings.
                </Typography>
              </CardContent>
            </Card>
          )}

          {!isProfessional && !appointment.bookings.professionals && (
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <UserIcon className="h-5 w-5 text-muted-foreground" />
                  Professional Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Typography variant="muted">
                  Professional information is not available due to privacy
                  settings.
                </Typography>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status & Actions */}
          {canUpdateStatus() && (
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl">Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {getAvailableStatuses().map((statusOption) => (
                  <Button
                    key={statusOption.value}
                    onClick={() => handleStatusUpdate(statusOption.value)}
                    disabled={isUpdating}
                    variant={
                      statusOption.value === 'cancelled'
                        ? 'destructiveOutline'
                        : 'default'
                    }
                    className="w-full"
                  >
                    {isUpdating ? 'Updating...' : statusOption.label}
                  </Button>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Payment Information */}
          {appointment.bookings.booking_payments &&
            appointment.bookings.booking_payments.length > 0 && (
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <CreditCardIcon className="h-5 w-5 text-muted-foreground" />
                    Payment Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {appointment.bookings.booking_payments.map(
                    (payment: BookingPayment) => (
                      <div key={payment.id} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <Typography className="font-medium text-primary">
                            {formatCurrency(payment.amount)}
                          </Typography>
                          <Badge
                            variant={
                              payment.status === 'completed'
                                ? 'default'
                                : 'secondary'
                            }
                          >
                            {payment.status}
                          </Badge>
                        </div>
                        <Typography variant="muted">
                          Method ID: {payment.payment_method_id}
                        </Typography>
                        <Typography variant="muted">
                          Paid:{' '}
                          {format(new Date(payment.created_at), 'MMM d, yyyy')}
                        </Typography>
                        <Separator />
                      </div>
                    ),
                  )}
                </CardContent>
              </Card>
            )}

          {/* Booking Details */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <ClockIcon className="h-5 w-5 text-muted-foreground" />
                Booking Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Typography className="font-medium text-foreground">
                  Booked On
                </Typography>
                <Typography variant="muted">
                  {format(
                    new Date(appointment.created_at),
                    'MMM d, yyyy h:mm a',
                  )}
                </Typography>
              </div>
              <Separator />
              <div>
                <Typography className="font-medium text-foreground">
                  Last Updated
                </Typography>
                <Typography variant="muted">
                  {format(
                    new Date(appointment.updated_at),
                    'MMM d, yyyy h:mm a',
                  )}
                </Typography>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
