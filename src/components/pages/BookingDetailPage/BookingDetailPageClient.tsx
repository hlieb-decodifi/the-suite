'use client';

import { ReviewSection } from '@/app/bookings/[id]/balance/ReviewSection';
import { TipSection } from '@/app/bookings/[id]/balance/TipSection';
import { LeafletMap } from '@/components/common/LeafletMap';
import {
  AddAdditionalServicesModal,
  NoShowModal,
  ReviewPromptModal,
} from '@/components/modals';
import { BookingCancellationModal } from '@/components/modals/BookingCancellationModal';
import { SupportRequestModal } from '@/components/modals/SupportRequestModal/SupportRequestModal';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Typography } from '@/components/ui/typography';
import { useToast } from '@/components/ui/use-toast';
import { createOrGetConversationEnhanced } from '@/server/domains/messages/actions';
import { formatCurrency } from '@/utils/formatCurrency';
import { formatDuration } from '@/utils/formatDuration';
import { format } from 'date-fns';
import { getUserTimezone, formatDateTimeInTimezone } from '@/utils/timezone';
import { PhoneNumberFormat, PhoneNumberUtil } from 'google-libphonenumber';
import {
  ArrowLeftIcon,
  CalendarIcon,
  ClockIcon,
  CopyIcon,
  CreditCardIcon,
  ExternalLinkIcon,
  FileTextIcon,
  InfoIcon,
  MapPin,
  MessageCircleIcon,
  Phone,
  Plus,
  RefreshCw,
  Star,
  UserIcon,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { DetailedAppointmentType } from './BookingDetailPage';

export type BookingDetailPageClientProps = {
  appointment: DetailedAppointmentType;
  isClient: boolean;
  isProfessional: boolean;
  userId: string;
  isAdmin?: boolean;
  existingSupportRequest?: {
    id: string;
    status: string;
    category?: string;
  } | null;
  reviewStatus?: {
    canReview: boolean;
    hasReview: boolean;
    review: {
      id: string;
      score: number;
      message: string;
      createdAt: string;
    } | null;
  } | null;
  showReviewPrompt?: boolean;
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

type AddressType =
  | {
      street_address: string | null;
      city: string | null;
      state: string | null;
      country: string | null;
      latitude?: number | null;
      longitude?: number | null;
    }
  | null
  | undefined;

function formatAddress(address: AddressType): string {
  if (!address) return '';
  const parts = [
    address.street_address,
    address.city,
    address.state,
    address.country,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : '';
}

export function BookingDetailPageClient({
  appointment,
  isClient,
  isProfessional,
  userId,
  isAdmin = false,
  existingSupportRequest = null,
  reviewStatus = null,
  showReviewPrompt = false,
}: BookingDetailPageClientProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [isMessageLoading, setIsMessageLoading] = useState(false);
  const [isAddServicesModalOpen, setIsAddServicesModalOpen] = useState(false);
  const [appointmentData, setAppointmentData] = useState(appointment);
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [isCancellationModalOpen, setIsCancellationModalOpen] = useState(false);
  const [isNoShowModalOpen, setIsNoShowModalOpen] = useState(false);
  const [isReviewPromptModalOpen, setIsReviewPromptModalOpen] =
    useState(showReviewPrompt);
  const [userTimezone, setUserTimezone] = useState<string>('UTC');

  const router = useRouter();
  const { toast } = useToast();

  // Get user's timezone on component mount
  useEffect(() => {
    setUserTimezone(getUserTimezone());
  }, []);
  // Get date from start_time
  const startDateTime = new Date(appointment.start_time);
  const endDateTime = new Date(appointment.end_time);

  const getInitials = (firstName?: string, lastName?: string) => {
    const first = firstName?.charAt(0) || '';
    const last = lastName?.charAt(0) || '';
    return `${first}${last}`.toUpperCase() || '?';
  };

  const getProfessionalTitle = (
    professional: DetailedAppointmentType['bookings']['professionals'],
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
        userId,
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
    if (isProfessional || isAdmin) {
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
    if (isProfessional || isAdmin) return false;

    // Only for completed appointments
    if (computedStatus !== 'completed') return false;

    // Only for card payments
    const payment = appointmentData.bookings.booking_payments;
    if (!payment || !payment.payment_methods?.is_online) return false;

    // Only if not already refunded
    if (payment.refunded_amount > 0 || payment.refunded_at) return false;

    return true;
  };

  // Check if support/refund request can be viewed
  const canViewRefund = () => {
    return existingSupportRequest;
  };

  const handleSupportRequestSuccess = () => {
    // Navigate to support requests dashboard to see the new request
    router.push('/dashboard/support-requests');
    // Close the modal
    setIsRefundModalOpen(false);
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
    if (isClient) {
      return `${appointment.bookings.professionals?.users?.first_name || ''} ${
        appointment.bookings.professionals?.users?.last_name || ''
      }`;
    }
    const clientUser = appointment.bookings.clients;
    return `${clientUser?.first_name || ''} ${clientUser?.last_name || ''}`;
  };

  const getOtherPartyInitials = () => {
    if (isClient) {
      return getInitials(
        appointment.bookings.professionals?.users.first_name || '',
        appointment.bookings.professionals?.users.last_name || '',
      );
    }
    return getInitials(
      appointment.bookings.clients?.first_name || '',
      appointment.bookings.clients?.last_name || '',
    );
  };

  const getOtherPartyProfileData = () => {
    if (isClient) {
      const professional = appointment.bookings.professionals;
      return {
        name: `${professional?.users?.first_name || ''} ${
          professional?.users?.last_name || ''
        }`,
        address: formatAddress(professional?.address),
        phone: professional?.phone_number || null,
        avatar_url: professional?.users?.avatar_url || null,
      };
    }
    const clientUser = appointment.bookings.clients;
    const clientProfile = clientUser?.client_profiles?.[0];
    return {
      name: `${clientUser?.first_name || ''} ${clientUser?.last_name || ''}`,
      address: formatAddress(clientProfile?.address),
      phone: clientProfile?.phone_number || null,
      avatar_url: clientUser?.avatar_url || null,
    };
  };

  const getOtherPartyAddressObject = (): AddressType => {
    if (isClient) {
      return appointment.bookings.professionals?.address;
    }
    return appointment.bookings.clients?.client_profiles?.[0]?.address;
  };

  const getOtherPartyAddress = () => {
    const addressObject = getOtherPartyAddressObject();
    return formatAddress(addressObject);
  };

  const handleAddressClick = () => {
    const address = getOtherPartyAddress();
    if (address) {
      const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        address,
      )}`;
      window.open(url, '_blank');
    }
  };

  const renderMap = () => {
    const address = getOtherPartyAddress();
    const addressObject = getOtherPartyAddressObject();

    if (!addressObject?.latitude || !addressObject?.longitude) return null;

    return (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <MapPin className="mr-2 h-5 w-5 text-gray-500" />
            <span>Appointment Location</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative w-full cursor-pointer overflow-hidden rounded-lg">
            <LeafletMap
              latitude={addressObject.latitude}
              longitude={addressObject.longitude}
              address={address}
            />
          </div>
          <div className="mt-4 flex justify-end">
            <Button variant="outline" size="sm" onClick={handleAddressClick}>
              <ExternalLinkIcon className="mr-2 h-4 w-4" />
              Get Directions
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const handleCancellationSuccess = () => {
    setAppointmentData((prev) => ({
      ...prev,
      status: 'cancelled',
      computed_status: 'cancelled',
    }));
    setIsCancellationModalOpen(false);
  };

  const handleNoShowSuccess = () => {
    // ... existing code ...
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getOtherPartyDescription = () => {
    return `Location for appointment with ${getOtherPartyName()}`;
  };

  const services = appointment.bookings.booking_services;
  const payment = appointment.bookings.booking_payments;

  // Calculate total services amount
  const servicesTotal = services.reduce(
    (sum, service) => sum + service.price,
    0,
  );

  const subtotal = servicesTotal;
  const serviceFee = payment?.service_fee ?? 0;
  const totalTips = payment?.tip_amount ?? 0;

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-6">
          <Link
            href={isAdmin ? '/admin/appointments' : '/dashboard/appointments'}
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
                const totalDuration = services.reduce(
                  (sum, service) => sum + service.duration,
                  0,
                );

                return (
                  <>
                    {/* Main Service */}
                    {services[0] && (
                      <div>
                        <Typography variant="large" className="mb-2">
                          {services[0].services.name}
                        </Typography>
                        {services[0].services.description && (
                          <Typography
                            variant="p"
                            className="mb-4 text-muted-foreground"
                          >
                            {services[0].services.description}
                          </Typography>
                        )}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                          <div className="flex items-center gap-2">
                            <ClockIcon className="h-4 w-4 text-muted-foreground" />
                            <Typography className="text-muted-foreground">
                              Duration:
                            </Typography>
                            <Typography className="font-medium">
                              {formatDuration(services[0].duration)}
                            </Typography>
                          </div>
                          <div className="flex items-center justify-end gap-2">
                            <CreditCardIcon className="h-4 w-4 text-muted-foreground" />
                            <Typography className="text-muted-foreground">
                              Price:
                            </Typography>
                            <Typography className="font-medium">
                              {formatCurrency(services[0].price)}
                            </Typography>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Additional Services */}
                    {services.slice(1).length > 0 && (
                      <>
                        <Separator />
                        <div>
                          <Typography variant="large" className="mb-4">
                            Additional Services
                          </Typography>
                          <div className="space-y-4">
                            {services.slice(1).map((bookingService) => (
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
                        {!isProfessional && (
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
                        )}
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
                        {(appointment.bookings.booking_payments
                          ?.deposit_amount ?? 0) > 0 && (
                          <div className="flex justify-between items-center">
                            <Typography
                              variant="small"
                              className="text-muted-foreground"
                            >
                              Deposit Paid:
                            </Typography>
                            <Typography
                              variant="small"
                              className="font-medium text-green-600"
                            >
                              {formatCurrency(
                                appointment.bookings.booking_payments
                                  ?.deposit_amount ?? 0,
                              )}
                            </Typography>
                          </div>
                        )}
                        {(appointment.bookings.booking_payments
                          ?.balance_amount ?? 0) > 0 && (
                          <>
                            {/* Check if this is a cash payment with deposit */}
                            {(() => {
                              const depositAmount =
                                appointment.bookings.booking_payments
                                  ?.deposit_amount ?? 0;
                              const isDeposit = depositAmount > 0;
                              const isCashPayment =
                                !appointment.bookings.booking_payments
                                  ?.payment_methods?.is_online;
                              const stripeBalance =
                                appointment.bookings.booking_payments
                                  ?.balance_amount ?? 0;

                              if (isDeposit && isCashPayment) {
                                // For cash payments with deposit: show both Stripe balance (suite fee) and cash balance (services + tips)
                                const cashBalance =
                                  subtotal + totalTips - depositAmount; // Services and tips paid in cash

                                return (
                                  <>
                                    {/* Hide card balance for professionals when it's only suite fee */}
                                    {!isProfessional && (
                                      <div className="flex justify-between items-center">
                                        <Typography
                                          variant="small"
                                          className="text-muted-foreground"
                                        >
                                          Card Balance Due (Suite Fee):
                                        </Typography>
                                        <Typography
                                          variant="small"
                                          className="font-medium text-amber-600"
                                        >
                                          {formatCurrency(stripeBalance)}
                                        </Typography>
                                      </div>
                                    )}
                                    {cashBalance > 0 && (
                                      <div className="flex justify-between items-center">
                                        <Typography
                                          variant="small"
                                          className="text-muted-foreground"
                                        >
                                          Cash Balance Due (At Appointment):
                                        </Typography>
                                        <Typography
                                          variant="small"
                                          className="font-medium text-amber-600"
                                        >
                                          {formatCurrency(cashBalance)}
                                        </Typography>
                                      </div>
                                    )}
                                  </>
                                );
                              } else {
                                // Regular balance due display
                                // For professionals, hide balance if it's only suite fee (cash payment without deposit)
                                const isCashWithoutDeposit =
                                  isCashPayment && !isDeposit;
                                const shouldHideBalanceForProfessional =
                                  isProfessional &&
                                  (isCashWithoutDeposit ||
                                    stripeBalance <= serviceFee);

                                if (shouldHideBalanceForProfessional) {
                                  return null;
                                }

                                return (
                                  <div className="flex justify-between items-center">
                                    <Typography
                                      variant="small"
                                      className="text-muted-foreground"
                                    >
                                      Balance Due:
                                    </Typography>
                                    <Typography
                                      variant="small"
                                      className="font-medium text-amber-600"
                                    >
                                      {formatCurrency(stripeBalance)}
                                    </Typography>
                                  </div>
                                );
                              }
                            })()}
                          </>
                        )}
                        <Separator />
                        <div className="flex justify-between items-center">
                          <Typography className="font-semibold">
                            Total:
                          </Typography>
                          <Typography className="font-bold text-primary text-lg">
                            {isProfessional
                              ? formatCurrency(subtotal + totalTips)
                              : formatCurrency(
                                  subtotal + serviceFee + totalTips,
                                )}
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
                  {
                    formatDateTimeInTimezone(
                      startDateTime,
                      userTimezone,
                      'EEEE, MMMM d, yyyy',
                    ).date
                  }
                </Typography>
                <Typography variant="muted">
                  {
                    formatDateTimeInTimezone(
                      startDateTime,
                      userTimezone,
                      'EEEE, MMMM d, yyyy',
                      'h:mm a',
                    ).time
                  }{' '}
                  -{' '}
                  {
                    formatDateTimeInTimezone(
                      endDateTime,
                      userTimezone,
                      'EEEE, MMMM d, yyyy',
                      'h:mm a',
                    ).time
                  }
                </Typography>
                <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <ClockIcon className="h-3 w-3" />
                  <span>Times shown in your timezone ({userTimezone})</span>
                </div>
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
                  <Avatar className="h-20 w-20 sm:h-24 sm:w-24 bg-white border-4 border-white shadow-md">
                    <AvatarImage
                      className="object-cover"
                      src={getOtherPartyProfileData().avatar_url || ''}
                    />
                    <AvatarFallback className="bg-primary/10 text-primary font-medium text-xl sm:text-2xl">
                      {getOtherPartyInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <Typography className="font-semibold text-foreground text-lg sm:text-xl mb-1">
                      {getOtherPartyName()}
                    </Typography>
                    <div className="space-y-1">
                      <Typography variant="muted" className="text-sm">
                        Client
                      </Typography>
                      {/* Phone number section */}
                      {getOtherPartyProfileData().phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <a
                            href={`tel:${getOtherPartyProfileData().phone}`}
                            className="text-muted-foreground hover:text-primary transition-colors font-medium"
                          >
                            {getOtherPartyProfileData().phone &&
                              formatPhoneNumber(
                                getOtherPartyProfileData().phone!,
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
                {getOtherPartyAddressObject() && (
                  <>
                    <Separator />
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {getOtherPartyAddressObject() && (
                          <div className="space-y-2">
                            <Typography className="text-sm font-medium text-muted-foreground">
                              Address
                            </Typography>
                            <Typography variant="muted" className="font-medium">
                              {getOtherPartyAddress()}
                            </Typography>
                          </div>
                        )}
                      </div>

                      {/* Show map if coordinates are available */}
                      {renderMap()}
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
                  <Avatar className="h-20 w-20 sm:h-24 sm:w-24 bg-white border-4 border-white shadow-md">
                    <AvatarImage
                      className="object-cover"
                      src={getOtherPartyProfileData().avatar_url || ''}
                    />
                    <AvatarFallback className="bg-primary/10 text-primary font-medium text-xl sm:text-2xl">
                      {getOtherPartyInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <Typography className="font-semibold text-foreground text-lg sm:text-xl mb-1">
                      {getOtherPartyName()}
                    </Typography>
                    <div className="space-y-1">
                      <Typography variant="muted" className="text-sm">
                        {getProfessionalTitle(
                          appointment.bookings.professionals,
                        )}
                      </Typography>
                      {/* Phone number section */}
                      {getOtherPartyProfileData().phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <a
                            href={`tel:${getOtherPartyProfileData().phone}`}
                            className="text-muted-foreground hover:text-primary transition-colors font-medium"
                          >
                            {getOtherPartyProfileData().phone &&
                              formatPhoneNumber(
                                getOtherPartyProfileData().phone!,
                              )}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    {!isAdmin && (
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
                    )}
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
                  <div className="space-y-2">
                    <Typography className="font-medium text-foreground mb-1">
                      Location Information
                    </Typography>

                    {/* Show if location or address exists */}
                    {appointment.bookings.professionals.location ||
                    getOtherPartyAddressObject() ? (
                      <>
                        {appointment.bookings.professionals.location && (
                          <div className="space-y-2">
                            <Typography className="text-sm font-medium text-muted-foreground">
                              Location
                            </Typography>
                            <Typography variant="muted" className="font-medium">
                              {appointment.bookings.professionals.location}
                            </Typography>
                          </div>
                        )}

                        {getOtherPartyAddressObject() && (
                          <div className="space-y-3">
                            <Typography variant="muted" className="font-medium">
                              {getOtherPartyAddress()}
                            </Typography>

                            {/* Show map if coordinates are available */}
                            {renderMap()}
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
          {/* Actions Card */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl">
                {appointmentData.computed_status === 'completed' ||
                appointmentData.status === 'completed'
                  ? 'Questions about this appointment'
                  : 'Actions'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Status Update Buttons - Only show if user can update status and is not admin */}
              {canUpdateStatus() && !isAdmin && (
                <>
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
                </>
              )}

              {/* Add Additional Services Button */}
              {isProfessional &&
                appointmentData.computed_status === 'ongoing' && (
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

              {/* View Support Request Button - For professionals and admins */}
              {canViewRefund() && existingSupportRequest && (
                <Button asChild variant="outline" className="w-full relative">
                  <Link href={`/support-request/${existingSupportRequest.id}`}>
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center">
                        <FileTextIcon className="h-4 w-4 mr-2" />
                        {existingSupportRequest.category === 'refund_request'
                          ? 'View Refund Request'
                          : 'View Support Request'}
                      </div>
                    </div>
                  </Link>
                </Button>
              )}

              {/* Support Request Button - For clients */}
              {canRequestRefund() && !existingSupportRequest && (
                <Button
                  onClick={() => setIsRefundModalOpen(true)}
                  variant="destructiveOutline"
                  className="w-full"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Support Request
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
                <div className="space-y-2">
                  {/* Show total amount for professionals */}
                  {isProfessional ? (
                    <div className="flex justify-between items-center">
                      <Typography className="font-bold text-primary text-lg">
                        {formatCurrency(servicesTotal)}
                      </Typography>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between items-center">
                        <Typography className="font-semibold">
                          Total:
                        </Typography>
                        <Typography className="font-bold text-primary text-lg">
                          {isProfessional
                            ? formatCurrency(servicesTotal + totalTips)
                            : formatCurrency(
                                servicesTotal + serviceFee + totalTips,
                              )}
                        </Typography>
                      </div>
                    </>
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
                    {!appointment.bookings.booking_payments.payment_methods
                      ?.is_online &&
                      isClient && (
                        <span className="text-muted-foreground">
                          {' '}
                          (Service fee will be charged to your card)
                        </span>
                      )}
                  </Typography>
                </div>

                {/* Tip Section - Show for completed appointments */}
                {appointmentData.computed_status === 'completed' && (
                  <>
                    <Separator />
                    <div>
                      <Typography className="font-medium text-foreground mb-4">
                        Tip
                      </Typography>
                      <TipSection
                        bookingId={appointment.booking_id}
                        professionalName={`${appointment.bookings.professionals?.users.first_name} ${appointment.bookings.professionals?.users.last_name}`}
                        currentTipAmount={
                          appointment.bookings.booking_payments?.tip_amount || 0
                        }
                        serviceAmount={appointment.bookings.booking_services.reduce(
                          (sum, service) => sum + service.price,
                          0,
                        )}
                        isClient={isClient}
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Review Section - Show for completed appointments when user is client or admin */}
          {appointmentData.computed_status === 'completed' && reviewStatus && (
            <Card className="shadow-sm" id="review-section">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <Star className="h-5 w-5 text-muted-foreground" />
                  Review
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ReviewSection
                  bookingId={appointment.booking_id}
                  professionalName={`${appointment.bookings.professionals?.users.first_name} ${appointment.bookings.professionals?.users.last_name}`}
                  reviewStatus={reviewStatus}
                />
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
        professionalUserId={userId}
        currentServices={appointmentData.bookings.booking_services}
      />

      {/* Support Request Modal */}
      {canRequestRefund() && (
        <SupportRequestModal
          isOpen={isRefundModalOpen}
          onClose={() => setIsRefundModalOpen(false)}
          appointmentId={appointment.id}
          serviceName={appointment.bookings.booking_services
            .map((bs) => bs.services.name)
            .join(', ')}
          onSuccess={handleSupportRequestSuccess}
        />
      )}

      {/* Booking Cancellation Modal */}
      <BookingCancellationModal
        isOpen={isCancellationModalOpen}
        onClose={() => setIsCancellationModalOpen(false)}
        onSuccess={handleCancellationSuccess}
        bookingId={appointment.booking_id}
        appointmentDate={format(startDateTime, 'EEEE, MMMM d, yyyy')}
        professionalName={getOtherPartyName()}
      />

      {/* No Show Modal */}
      <NoShowModal
        isOpen={isNoShowModalOpen}
        onClose={() => setIsNoShowModalOpen(false)}
        appointmentId={appointment.id}
        appointmentDate={format(startDateTime, 'EEEE, MMMM d, yyyy')}
        clientName={getOtherPartyName()}
        serviceAmount={appointment.bookings.booking_services.reduce(
          (total, service) => total + service.price,
          0,
        )}
        onSuccess={handleNoShowSuccess}
      />

      {/* Review Prompt Modal */}
      {isClient &&
        appointmentData.computed_status === 'completed' &&
        !reviewStatus?.hasReview && (
          <ReviewPromptModal
            isOpen={isReviewPromptModalOpen}
            onClose={() => setIsReviewPromptModalOpen(false)}
            professionalName={getOtherPartyName()}
            serviceName={
              appointment.bookings.booking_services[0]?.services?.name ||
              'Service'
            }
          />
        )}
    </div>
  );
}
