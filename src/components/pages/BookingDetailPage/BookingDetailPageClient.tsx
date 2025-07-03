'use client';

import { useState } from 'react';
import { Typography } from '@/components/ui/typography';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { formatCurrency } from '@/utils/formatCurrency';
import { formatDuration } from '@/utils/formatDuration';
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
  MessageCircleIcon,
  ExternalLinkIcon,
  InfoIcon,
  MapPin,
  Plus,
  RefreshCw,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';
import { createOrGetConversationEnhanced } from '@/server/domains/messages/actions';
import { LeafletMap } from '@/components/common/LeafletMap';
import { AddAdditionalServicesModal } from '@/components/modals';
import { RefundRequestModal } from '@/components/modals/RefundRequestModal/RefundRequestModal';
import { BookingCancellationModal } from '@/components/modals/BookingCancellationModal';
import { NoShowModal } from '@/components/modals';

// Local types to avoid import issues
type BookingPayment = {
  id: string;
  amount: number;
  tip_amount: number;
  status: string;
  payment_method_id: string;
  stripe_payment_method_id: string | null;
  stripe_payment_intent_id: string | null;
  pre_auth_scheduled_for: string | null;
  capture_scheduled_for: string | null;
  pre_auth_placed_at: string | null;
  captured_at: string | null;
  created_at: string;
  // Refund tracking fields
  refunded_amount: number;
  refund_reason: string | null;
  refunded_at: string | null;
  refund_transaction_id: string | null;
  payment_methods: {
    id: string;
    name: string;
    is_online: boolean;
  } | null;
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
  computed_status: string;
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
          latitude?: number | null;
          longitude?: number | null;
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
        latitude?: number | null;
        longitude?: number | null;
      } | null;
      users: {
        id: string;
        first_name: string;
        last_name: string;
      };
    } | null;
    booking_services: BookingService[];
    booking_payments: BookingPayment | null;
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
  const [copySuccess, setCopySuccess] = useState(false);
  const [isMessageLoading, setIsMessageLoading] = useState(false);
  const [isAddServicesModalOpen, setIsAddServicesModalOpen] = useState(false);
  const [appointmentData, setAppointmentData] = useState(appointment);
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [isCancellationModalOpen, setIsCancellationModalOpen] = useState(false);
  const [isNoShowModalOpen, setIsNoShowModalOpen] = useState(false);

  const router = useRouter();
  const { toast } = useToast();

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
        return (
          <Badge
            variant="outline"
            className="bg-primary/10 text-primary border-primary/20"
          >
            Upcoming
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
      case 'completed':
        return (
          <Badge
            variant="outline"
            className="bg-green-500/10 text-green-500 border-green-500/20"
          >
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
        setAppointmentData((prev) => ({
          ...prev,
          status: newStatus,
          computed_status: newStatus,
        }));
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
    const computedStatus =
      appointmentData.computed_status || appointmentData.status;

    // Professionals can update status for upcoming appointments
    if (isProfessional) {
      return computedStatus === 'upcoming';
    }

    // Clients can cancel upcoming appointments or request refunds for completed appointments
    return computedStatus === 'upcoming' || canRequestRefund();
  };

  const getAvailableStatuses = () => {
    const computedStatus =
      appointmentData.computed_status || appointmentData.status;

    if (isProfessional) {
      if (computedStatus === 'upcoming') {
        return [{ value: 'completed', label: 'Mark as Completed' }];
      }
    }
    return [];
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

  const handleMessageClick = async (targetUserId: string) => {
    setIsMessageLoading(true);
    try {
      const result = await createOrGetConversationEnhanced(targetUserId);
      if (result.success && result.conversation) {
        router.push(
          `/dashboard/messages?conversation=${result.conversation.id}`,
        );
      } else {
        console.error('Failed to create conversation:', result.error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description:
            result.error ||
            'Failed to create conversation. Please try again later.',
        });
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to create conversation. Please try again later.',
      });
    } finally {
      setIsMessageLoading(false);
    }
  };

  // Check if refund request is available
  const canRequestRefund = () => {
    const computedStatus =
      appointmentData.computed_status || appointmentData.status;

    // Only clients can request refunds
    if (isProfessional) return false;

    // Only for completed appointments
    if (computedStatus !== 'completed') return false;

    // Only for card payments
    const payment = appointmentData.bookings.booking_payments;
    if (!payment || !payment.payment_methods?.is_online) return false;

    // Only if not already refunded
    if (payment.refunded_amount > 0 || payment.refunded_at) return false;

    return true;
  };

  const handleRefundSuccess = () => {
    // Refresh the page to show updated status
    router.refresh();
  };

  const handleAddServicesSuccess = (result: {
    newTotal: number;
    servicesAdded: Array<{
      id: string;
      name: string;
      price: number;
      duration: number;
    }>;
  }) => {
    // Update the appointment data with new payment amount
    setAppointmentData((prev) => ({
      ...prev,
      bookings: {
        ...prev.bookings,
        booking_payments: prev.bookings.booking_payments
          ? {
              ...prev.bookings.booking_payments,
              amount: result.newTotal,
            }
          : null,
      },
    }));

    // Close the modal
    setIsAddServicesModalOpen(false);

    // Refresh the page to show updated services
    router.refresh();
  };

  // Check if booking can be cancelled
  const canCancelBooking = () => {
    const computedStatus =
      appointmentData.computed_status || appointmentData.status;

    // Cannot cancel if already cancelled or completed
    if (['cancelled', 'completed'].includes(computedStatus)) return false;

    // Both professionals and clients can cancel upcoming appointments
    return computedStatus === 'upcoming';
  };

  // Get professional or client name for cancellation modal
  const getOtherPartyName = () => {
    if (isProfessional) {
      const client = appointment.bookings.clients;
      return getFullName(client?.first_name, client?.last_name);
    } else {
      const professional = appointment.bookings.professionals;
      return getFullName(
        professional?.users?.first_name,
        professional?.users?.last_name,
      );
    }
  };

  const handleCancellationSuccess = () => {
    // Update local state to reflect cancellation
    setAppointmentData((prev) => ({
      ...prev,
      status: 'cancelled',
      computed_status: 'cancelled',
      bookings: {
        ...prev.bookings,
        status: 'cancelled',
      },
    }));

    // Close the modal
    setIsCancellationModalOpen(false);

    // Refresh the page to get updated data including refund information
    setTimeout(() => {
      router.refresh();
    }, 1000);
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
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div className="flex flex-col gap-2">
              <Typography
                variant="h1"
                className="font-futura text-4xl md:text-5xl font-bold text-foreground"
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
            <div className="flex items-center mt-2 sm:mt-0">
              <div className="scale-110">
                {getStatusBadge(
                  appointmentData.computed_status || appointmentData.status,
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Cancellation Information - Show when booking is cancelled */}
          {(appointmentData.computed_status === 'cancelled' ||
            appointmentData.status === 'cancelled') && (
            <Card className="shadow-sm border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2 text-red-700">
                  <InfoIcon className="h-5 w-5" />
                  Booking Cancelled
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Typography className="font-medium text-red-700 mb-1">
                      Status
                    </Typography>
                    <Typography variant="muted">
                      This booking has been cancelled
                    </Typography>
                  </div>
                  <div>
                    <Typography className="font-medium text-red-700 mb-1">
                      Cancelled On
                    </Typography>
                    <Typography variant="muted">
                      {appointmentData.updated_at &&
                        format(
                          new Date(appointmentData.updated_at),
                          'MMM d, yyyy h:mm a',
                        )}
                    </Typography>
                  </div>
                </div>

                {/* Show refund summary if there was a refund */}
                {appointment.bookings.booking_payments &&
                  appointment.bookings.booking_payments.refunded_amount > 0 && (
                    <>
                      <Separator />
                      <div className="bg-white p-4 rounded-lg border border-red-200">
                        <Typography className="font-medium text-red-700 mb-2">
                          Refund Processed
                        </Typography>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div className="flex justify-between">
                            <Typography
                              variant="small"
                              className="text-muted-foreground"
                            >
                              Refunded Amount:
                            </Typography>
                            <Typography
                              variant="small"
                              className="font-medium text-green-600"
                            >
                              {formatCurrency(
                                appointment.bookings.booking_payments
                                  .refunded_amount,
                              )}
                            </Typography>
                          </div>
                          {appointment.bookings.booking_payments
                            .refunded_at && (
                            <div className="flex justify-between">
                              <Typography
                                variant="small"
                                className="text-muted-foreground"
                              >
                                Processed:
                              </Typography>
                              <Typography
                                variant="small"
                                className="font-medium"
                              >
                                {format(
                                  new Date(
                                    appointment.bookings.booking_payments.refunded_at!,
                                  ),
                                  'MMM d, yyyy',
                                )}
                              </Typography>
                            </div>
                          )}
                        </div>
                        {appointment.bookings.booking_payments
                          .refund_reason && (
                          <div className="mt-2">
                            <Typography
                              variant="small"
                              className="text-muted-foreground"
                            >
                              Reason:{' '}
                              {
                                appointment.bookings.booking_payments
                                  .refund_reason
                              }
                            </Typography>
                          </div>
                        )}
                      </div>
                    </>
                  )}
              </CardContent>
            </Card>
          )}

          {/* Service Information */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <FileTextIcon className="h-5 w-5 text-muted-foreground" />
                Service Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {(() => {
                const services = appointment.bookings.booking_services || [];
                const payment = appointment.bookings.booking_payments;
                const mainService = services[0]; // First service is typically the main one
                const additionalServices = services.slice(1);
                const totalDuration = services.reduce(
                  (sum, service) => sum + service.duration,
                  0,
                );
                const subtotal = services.reduce(
                  (sum, service) => sum + service.price,
                  0,
                );
                // Get actual payment data including tips
                const totalAmount = payment?.amount || 0;
                const totalTips = payment?.tip_amount || 0;
                const serviceFee = Math.max(
                  0,
                  totalAmount - subtotal - totalTips,
                ); // Calculate service fee from actual data
                const total = totalAmount + totalTips;

                return (
                  <>
                    {/* Main Service */}
                    {mainService && (
                      <div>
                        <Typography variant="large" className="mb-2">
                          {mainService.services.name}
                        </Typography>
                        {mainService.services.description && (
                          <Typography
                            variant="p"
                            className="mb-4 text-muted-foreground"
                          >
                            {mainService.services.description}
                          </Typography>
                        )}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                          <div className="flex items-center gap-2">
                            <ClockIcon className="h-4 w-4 text-muted-foreground" />
                            <Typography className="text-muted-foreground">
                              Duration:
                            </Typography>
                            <Typography className="font-medium">
                              {formatDuration(mainService.duration)}
                            </Typography>
                          </div>
                          <div className="flex items-center justify-end gap-2">
                            <CreditCardIcon className="h-4 w-4 text-muted-foreground" />
                            <Typography className="text-muted-foreground">
                              Price:
                            </Typography>
                            <Typography className="font-medium">
                              {formatCurrency(mainService.price)}
                            </Typography>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Additional Services */}
                    {additionalServices.length > 0 && (
                      <>
                        <Separator />
                        <div>
                          <Typography variant="large" className="mb-4">
                            Additional Services
                          </Typography>
                          <div className="space-y-4">
                            {additionalServices.map((bookingService) => (
                              <div
                                key={bookingService.id}
                                className="flex justify-between items-start"
                              >
                                <div className="flex-1">
                                  <Typography className="font-medium">
                                    {bookingService.services.name}
                                  </Typography>
                                  {bookingService.services.description && (
                                    <Typography
                                      variant="small"
                                      className="text-muted-foreground mt-1"
                                    >
                                      {bookingService.services.description}
                                    </Typography>
                                  )}
                                  <div className="flex items-center gap-1 mt-1">
                                    <ClockIcon className="h-3 w-3 text-muted-foreground" />
                                    <Typography
                                      variant="small"
                                      className="text-muted-foreground"
                                    >
                                      {formatDuration(bookingService.duration)}
                                    </Typography>
                                  </div>
                                </div>
                                <Typography className="font-medium">
                                  {formatCurrency(bookingService.price)}
                                </Typography>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}

                    {/* Duration and Price Summary */}
                    <Separator />
                    <div className="space-y-3">
                      {/* Total Duration */}
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <ClockIcon className="h-4 w-4 text-muted-foreground" />
                          <Typography className="text-muted-foreground">
                            Total Duration:
                          </Typography>
                        </div>
                        <Typography className="font-medium">
                          {formatDuration(totalDuration)}
                        </Typography>
                      </div>

                      {/* Price Breakdown */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <Typography
                            variant="small"
                            className="text-muted-foreground"
                          >
                            Services Subtotal:
                          </Typography>
                          <Typography variant="small" className="font-medium">
                            {formatCurrency(subtotal)}
                          </Typography>
                        </div>
                        <div className="flex justify-between items-center">
                          <Typography
                            variant="small"
                            className="text-muted-foreground"
                          >
                            Service Fee:
                          </Typography>
                          <Typography variant="small" className="font-medium">
                            {formatCurrency(serviceFee)}
                          </Typography>
                        </div>
                        {totalTips > 0 && (
                          <div className="flex justify-between items-center">
                            <Typography
                              variant="small"
                              className="text-muted-foreground"
                            >
                              Tips:
                            </Typography>
                            <Typography variant="small" className="font-medium">
                              {formatCurrency(totalTips)}
                            </Typography>
                          </div>
                        )}
                        <Separator />
                        <div className="flex justify-between items-center">
                          <Typography className="font-semibold">
                            Total{totalTips > 0 ? ' (including tips)' : ''}:
                          </Typography>
                          <Typography className="font-bold text-primary text-lg">
                            {formatCurrency(total)}
                          </Typography>
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}
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
              <CardContent className="space-y-6">
                {/* Client Profile Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
                  <Avatar className="h-20 w-20 sm:h-24 sm:w-24">
                    <AvatarImage src="" />
                    <AvatarFallback className="bg-primary/10 text-primary font-medium text-xl sm:text-2xl">
                      {getInitials(
                        appointment.bookings.clients.first_name,
                        appointment.bookings.clients.last_name,
                      )}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <Typography className="font-semibold text-foreground text-lg sm:text-xl mb-1">
                      {getFullName(
                        appointment.bookings.clients.first_name,
                        appointment.bookings.clients.last_name,
                      )}
                    </Typography>
                    <div className="space-y-1">
                      <Typography variant="muted" className="text-sm">
                        Client
                      </Typography>
                      {appointment.bookings.clients.client_profiles
                        ?.phone_number && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <a
                            href={`tel:${appointment.bookings.clients.client_profiles.phone_number}`}
                            className="text-muted-foreground hover:text-primary transition-colors font-medium"
                          >
                            {formatPhoneNumber(
                              appointment.bookings.clients.client_profiles
                                .phone_number,
                            )}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <Button
                      variant="outline"
                      onClick={() =>
                        handleMessageClick(appointment.bookings.clients!.id)
                      }
                      disabled={isMessageLoading}
                      className="flex items-center gap-2 sm:min-w-[140px]"
                    >
                      <MessageCircleIcon className="h-4 w-4" />
                      {isMessageLoading ? 'Starting...' : 'Message Client'}
                    </Button>
                  </div>
                </div>

                {/* Additional Information - only show if there's location or address */}
                {(appointment.bookings.clients.client_profiles?.location ||
                  formatAddress(
                    appointment.bookings.clients.client_profiles?.addresses,
                  )) && (
                  <>
                    <Separator />
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {appointment.bookings.clients.client_profiles
                          ?.location && (
                          <div className="space-y-2">
                            <Typography className="text-sm font-medium text-muted-foreground">
                              Location
                            </Typography>
                            <Typography variant="muted" className="font-medium">
                              {
                                appointment.bookings.clients.client_profiles
                                  .location
                              }
                            </Typography>
                          </div>
                        )}
                      </div>

                      {formatAddress(
                        appointment.bookings.clients.client_profiles?.addresses,
                      ) && (
                        <div className="space-y-3">
                          <Typography className="text-sm font-medium text-muted-foreground">
                            Address
                          </Typography>
                          <Typography variant="muted" className="font-medium">
                            {formatAddress(
                              appointment.bookings.clients.client_profiles
                                ?.addresses,
                            )}
                          </Typography>

                          {/* Show map if coordinates are available */}
                          {appointment.bookings.clients.client_profiles
                            ?.addresses?.latitude &&
                            appointment.bookings.clients.client_profiles
                              ?.addresses?.longitude && (
                              <div className="mt-3">
                                <LeafletMap
                                  latitude={
                                    appointment.bookings.clients.client_profiles
                                      .addresses.latitude
                                  }
                                  longitude={
                                    appointment.bookings.clients.client_profiles
                                      .addresses.longitude
                                  }
                                  address={
                                    formatAddress(
                                      appointment.bookings.clients
                                        .client_profiles?.addresses,
                                    ) || 'Client Location'
                                  }
                                  height="h-48"
                                  className="border border-border rounded-md"
                                />
                              </div>
                            )}
                        </div>
                      )}
                    </div>
                  </>
                )}
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
              <CardContent className="space-y-6">
                {/* Professional Profile Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
                  <Avatar className="h-20 w-20 sm:h-24 sm:w-24">
                    <AvatarImage src="" />
                    <AvatarFallback className="bg-primary/10 text-primary font-medium text-xl sm:text-2xl">
                      {getInitials(
                        appointment.bookings.professionals.users.first_name,
                        appointment.bookings.professionals.users.last_name,
                      )}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <Typography className="font-semibold text-foreground text-lg sm:text-xl mb-1">
                      {getFullName(
                        appointment.bookings.professionals.users.first_name,
                        appointment.bookings.professionals.users.last_name,
                      )}
                    </Typography>
                    <div className="space-y-1">
                      <Typography variant="muted" className="text-sm">
                        {getProfessionalTitle(
                          appointment.bookings.professionals,
                        )}
                      </Typography>
                      {appointment.bookings.professionals.phone_number && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <a
                            href={`tel:${appointment.bookings.professionals.phone_number}`}
                            className="text-muted-foreground hover:text-primary transition-colors font-medium"
                          >
                            {formatPhoneNumber(
                              appointment.bookings.professionals.phone_number,
                            )}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <Button
                      variant="outline"
                      onClick={() =>
                        handleMessageClick(
                          appointment.bookings.professionals!.user_id,
                        )
                      }
                      disabled={isMessageLoading}
                      className="flex items-center gap-2 sm:min-w-[140px]"
                    >
                      <MessageCircleIcon className="h-4 w-4" />
                      {isMessageLoading
                        ? 'Starting...'
                        : 'Message Professional'}
                    </Button>
                    <Button
                      variant="outline"
                      asChild
                      className="flex items-center gap-2 sm:min-w-[120px]"
                    >
                      <Link
                        href={`/professionals/${appointment.bookings.professionals!.user_id}`}
                      >
                        <ExternalLinkIcon className="h-4 w-4" />
                        View Profile
                      </Link>
                    </Button>
                  </div>
                </div>

                {/* Professional Description */}
                {appointment.bookings.professionals.description && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <Typography className="font-medium text-foreground">
                        About
                      </Typography>
                      <Typography variant="muted" className="font-medium">
                        {appointment.bookings.professionals.description}
                      </Typography>
                    </div>
                  </>
                )}

                {/* Location Information - always show section */}
                <>
                  <Separator />
                  <div className="space-y-4">
                    <Typography className="text-sm font-medium text-muted-foreground">
                      Location Information
                    </Typography>

                    {/* Show if location or address exists */}
                    {appointment.bookings.professionals.location ||
                    formatAddress(
                      appointment.bookings.professionals.addresses,
                    ) ? (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {appointment.bookings.professionals.location && (
                            <div className="space-y-2">
                              <Typography className="text-sm font-medium text-muted-foreground">
                                Location
                              </Typography>
                              <Typography
                                variant="muted"
                                className="font-medium"
                              >
                                {appointment.bookings.professionals.location}
                              </Typography>
                            </div>
                          )}
                        </div>

                        {formatAddress(
                          appointment.bookings.professionals.addresses,
                        ) && (
                          <div className="space-y-3">
                            <Typography className="text-sm font-medium text-muted-foreground">
                              Address
                            </Typography>
                            <Typography variant="muted" className="font-medium">
                              {formatAddress(
                                appointment.bookings.professionals.addresses,
                              )}
                            </Typography>

                            {/* Show map if coordinates are available */}
                            {appointment.bookings.professionals.addresses
                              ?.latitude &&
                              appointment.bookings.professionals.addresses
                                ?.longitude && (
                                <div className="mt-3">
                                  <LeafletMap
                                    latitude={
                                      appointment.bookings.professionals
                                        .addresses.latitude
                                    }
                                    longitude={
                                      appointment.bookings.professionals
                                        .addresses.longitude
                                    }
                                    address={
                                      formatAddress(
                                        appointment.bookings.professionals
                                          .addresses,
                                      ) || 'Professional Location'
                                    }
                                    height="h-48"
                                    className="border border-border rounded-md"
                                  />
                                </div>
                              )}
                          </div>
                        )}
                      </>
                    ) : (
                      /* No location specified fallback */
                      <div className="text-center py-6 space-y-3">
                        <MapPin className="h-8 w-8 text-muted-foreground mx-auto" />
                        <Typography variant="muted" className="text-sm">
                          Location not specified by professional
                        </Typography>
                      </div>
                    )}
                  </div>
                </>
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

                {/* Add Additional Services Button */}
                {isProfessional &&
                  (appointmentData.computed_status === 'upcoming' ||
                    appointmentData.status === 'upcoming') && (
                    <Button
                      onClick={() => setIsAddServicesModalOpen(true)}
                      variant="outline"
                      className="w-full"
                    >
                      <Plus className="h-4 w-4" />
                      Add Additional Services
                    </Button>
                  )}

                {/* Cancel Booking Button */}
                {canCancelBooking() && (
                  <Button
                    onClick={() => setIsCancellationModalOpen(true)}
                    variant="destructiveOutline"
                    className="w-full"
                  >
                    Cancel Booking
                  </Button>
                )}

                {/* Refund Request Button */}
                {canRequestRefund() && (
                  <Button
                    onClick={() => setIsRefundModalOpen(true)}
                    variant="destructiveOutline"
                    className="w-full"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Request Refund
                  </Button>
                )}

                {/* No Show Button - Professional only, for completed appointments */}
                {isProfessional &&
                  appointmentData.status === 'completed' &&
                  appointment.bookings.booking_payments?.payment_methods
                    ?.is_online && (
                    <Button
                      onClick={() => setIsNoShowModalOpen(true)}
                      variant="destructiveOutline"
                      className="w-full"
                    >
                      Mark as No Show
                    </Button>
                  )}
              </CardContent>
            </Card>
          )}

          {/* Payment Information */}
          {appointment.bookings.booking_payments && (
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <CreditCardIcon className="h-5 w-5 text-muted-foreground" />
                  Payment Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Payment Amount and Status */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <Typography className="font-medium text-primary text-lg">
                      {formatCurrency(
                        appointmentData.bookings.booking_payments?.amount || 0,
                      )}
                    </Typography>
                  </div>

                  {appointment.bookings.booking_payments.tip_amount > 0 && (
                    <div className="flex justify-between items-center">
                      <Typography
                        variant="small"
                        className="text-muted-foreground"
                      >
                        Tip:
                      </Typography>
                      <Typography variant="small" className="font-medium">
                        {formatCurrency(
                          appointment.bookings.booking_payments.tip_amount,
                        )}
                      </Typography>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Payment Method */}
                <div>
                  <TooltipProvider>
                    <div className="flex items-center gap-2 mb-1">
                      <Typography className="font-medium text-foreground">
                        Payment Method
                      </Typography>
                      <Tooltip>
                        <TooltipTrigger>
                          <InfoIcon className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>The payment method used for this booking</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </TooltipProvider>
                  <Typography variant="muted">
                    {appointment.bookings.booking_payments.payment_methods
                      ?.name || 'Unknown Method'}
                    {appointment.bookings.booking_payments.payment_methods
                      ?.is_online && ' (Online)'}
                  </Typography>
                </div>

                {/* Pre-Authorization Details */}
                {(appointment.bookings.booking_payments
                  .pre_auth_scheduled_for ||
                  appointment.bookings.booking_payments.pre_auth_placed_at) && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <TooltipProvider>
                        <div className="flex items-center gap-2">
                          <Typography className="font-medium text-foreground">
                            Pre-Authorization
                          </Typography>
                          <Tooltip>
                            <TooltipTrigger>
                              <InfoIcon className="h-4 w-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>
                                For bookings more than 6 days away, payment is
                                pre-authorized 6 days before the appointment
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </TooltipProvider>

                      {appointment.bookings.booking_payments
                        .pre_auth_scheduled_for && (
                        <div className="flex justify-between items-center">
                          <Typography
                            variant="small"
                            className="text-muted-foreground"
                          >
                            Scheduled for:
                          </Typography>
                          <Typography variant="small" className="font-medium">
                            {format(
                              new Date(
                                appointment.bookings.booking_payments.pre_auth_scheduled_for,
                              ),
                              'MMM d, yyyy h:mm a',
                            )}
                          </Typography>
                        </div>
                      )}

                      {appointment.bookings.booking_payments
                        .pre_auth_placed_at && (
                        <div className="flex justify-between items-center">
                          <Typography
                            variant="small"
                            className="text-muted-foreground"
                          >
                            Pre-authorized on:
                          </Typography>
                          <Typography
                            variant="small"
                            className="font-medium text-green-600"
                          >
                            {format(
                              new Date(
                                appointment.bookings.booking_payments.pre_auth_placed_at,
                              ),
                              'MMM d, yyyy h:mm a',
                            )}
                          </Typography>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Payment Capture Details */}
                {(appointment.bookings.booking_payments.capture_scheduled_for ||
                  appointment.bookings.booking_payments.captured_at) && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <TooltipProvider>
                        <div className="flex items-center gap-2">
                          <Typography className="font-medium text-foreground">
                            Payment Capture
                          </Typography>
                          <Tooltip>
                            <TooltipTrigger>
                              <InfoIcon className="h-4 w-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>
                                Payment is automatically captured 12 hours after
                                the appointment ends
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </TooltipProvider>

                      {appointment.bookings.booking_payments
                        .capture_scheduled_for &&
                        !appointment.bookings.booking_payments.captured_at && (
                          <div className="flex justify-between items-center">
                            <Typography
                              variant="small"
                              className="text-muted-foreground"
                            >
                              Scheduled for:
                            </Typography>
                            <Typography variant="small" className="font-medium">
                              {format(
                                new Date(
                                  appointment.bookings.booking_payments.capture_scheduled_for,
                                ),
                                'MMM d, yyyy h:mm a',
                              )}
                            </Typography>
                          </div>
                        )}

                      {appointment.bookings.booking_payments.captured_at && (
                        <div className="flex justify-between items-center">
                          <Typography
                            variant="small"
                            className="text-muted-foreground"
                          >
                            Captured on:
                          </Typography>
                          <Typography
                            variant="small"
                            className="font-medium text-green-600"
                          >
                            {format(
                              new Date(
                                appointment.bookings.booking_payments.captured_at,
                              ),
                              'MMM d, yyyy h:mm a',
                            )}
                          </Typography>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Refund Information */}
                {appointment.bookings.booking_payments.refunded_amount > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <TooltipProvider>
                        <div className="flex items-center gap-2">
                          <Typography className="font-medium text-foreground">
                            Refund Information
                          </Typography>
                          <Tooltip>
                            <TooltipTrigger>
                              <InfoIcon className="h-4 w-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Amount refunded due to booking cancellation</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </TooltipProvider>

                      <div className="flex justify-between items-center">
                        <Typography
                          variant="small"
                          className="text-muted-foreground"
                        >
                          Refunded Amount:
                        </Typography>
                        <Typography
                          variant="small"
                          className="font-medium text-green-600"
                        >
                          {formatCurrency(
                            appointment.bookings.booking_payments
                              .refunded_amount,
                          )}
                        </Typography>
                      </div>

                      {appointment.bookings.booking_payments.refund_reason && (
                        <div className="flex justify-between items-center">
                          <Typography
                            variant="small"
                            className="text-muted-foreground"
                          >
                            Reason:
                          </Typography>
                          <Typography variant="small" className="font-medium">
                            {
                              appointment.bookings.booking_payments
                                .refund_reason
                            }
                          </Typography>
                        </div>
                      )}

                      {appointment.bookings.booking_payments.refunded_at && (
                        <div className="flex justify-between items-center">
                          <Typography
                            variant="small"
                            className="text-muted-foreground"
                          >
                            Refunded on:
                          </Typography>
                          <Typography
                            variant="small"
                            className="font-medium text-green-600"
                          >
                            {format(
                              new Date(
                                appointment.bookings.booking_payments.refunded_at,
                              ),
                              'MMM d, yyyy h:mm a',
                            )}
                          </Typography>
                        </div>
                      )}

                      {appointment.bookings.booking_payments
                        .refund_transaction_id && (
                        <div className="flex justify-between items-center">
                          <Typography
                            variant="small"
                            className="text-muted-foreground"
                          >
                            Transaction ID:
                          </Typography>
                          <Typography
                            variant="small"
                            className="font-mono text-xs"
                          >
                            {
                              appointment.bookings.booking_payments
                                .refund_transaction_id
                            }
                          </Typography>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Payment Timeline */}
                {appointment.bookings.booking_payments.payment_methods
                  ?.is_online && (
                  <>
                    <Separator />
                    <div>
                      <Typography className="font-medium text-foreground mb-1">
                        Payment Created
                      </Typography>
                      <Typography variant="muted">
                        {format(
                          new Date(
                            appointment.bookings.booking_payments.created_at,
                          ),
                          'MMM d, yyyy h:mm a',
                        )}
                      </Typography>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Booking Details */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <FileTextIcon className="h-5 w-5 text-muted-foreground" />
                Booking Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Typography className="font-medium text-foreground mb-1">
                  Booking ID
                </Typography>
                <div className="flex items-center gap-2">
                  <Typography variant="muted" className="font-mono text-sm">
                    {appointment.booking_id}
                  </Typography>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyBookingId}
                    className="h-6 w-6 p-0"
                  >
                    <CopyIcon className="h-3 w-3" />
                  </Button>
                </div>
                {copySuccess && (
                  <Typography variant="small" className="text-green-600 mt-1">
                    Copied to clipboard!
                  </Typography>
                )}
              </div>
              <Separator />
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
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add Additional Services Modal */}
      <AddAdditionalServicesModal
        isOpen={isAddServicesModalOpen}
        onClose={() => setIsAddServicesModalOpen(false)}
        onSuccess={handleAddServicesSuccess}
        appointmentId={appointmentData.id}
        professionalUserId={currentUserId}
        currentServices={appointmentData.bookings.booking_services}
      />

      {/* Refund Request Modal */}
      {canRequestRefund() && (
        <RefundRequestModal
          isOpen={isRefundModalOpen}
          onClose={() => setIsRefundModalOpen(false)}
          appointmentId={appointment.id}
          serviceName={appointment.bookings.booking_services
            .map((bs) => bs.services.name)
            .join(', ')}
          totalAmount={
            (appointment.bookings.booking_payments?.amount || 0) +
            (appointment.bookings.booking_payments?.tip_amount || 0)
          }
          onSuccess={handleRefundSuccess}
        />
      )}

      {/* Booking Cancellation Modal */}
      <BookingCancellationModal
        isOpen={isCancellationModalOpen}
        onClose={() => setIsCancellationModalOpen(false)}
        onSuccess={handleCancellationSuccess}
        bookingId={appointment.booking_id}
        appointmentDate={format(startDate, 'EEEE, MMMM d, yyyy')}
        professionalName={getOtherPartyName()}
      />

      {/* No Show Modal */}
      <NoShowModal
        isOpen={isNoShowModalOpen}
        onClose={() => setIsNoShowModalOpen(false)}
        appointmentId={appointment.id}
        appointmentDate={format(startDate, 'EEEE, MMMM d, yyyy')}
        clientName={getOtherPartyName()}
        serviceAmount={appointment.bookings.booking_services.reduce(
          (total, service) => total + service.price,
          0,
        )}
        onSuccess={handleCancellationSuccess}
      />
    </div>
  );
}
