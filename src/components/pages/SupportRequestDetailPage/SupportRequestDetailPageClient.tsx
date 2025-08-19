'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Typography } from '@/components/ui/typography';
import { LoadingOverlay } from '@/components/common/LoadingOverlay/LoadingOverlay';
import { formatCurrency } from '@/utils';
import { format } from 'date-fns';
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  Clock,
  DollarSign,
  MessageSquare,
  User,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { SupportRequestChatWidget } from './SupportRequestChatWidget';
import { RefundModal } from './RefundModal';
import { ResolutionModal } from './ResolutionModal';
import { SupportRequestData } from '@/server/domains/support-requests/actions';

type SupportRequestDetailPageClientProps = {
  supportRequest: SupportRequestData;
  isProfessional: boolean;
  currentUserId: string;
  isAdmin?: boolean;
};

// Helper component to render the status badge
function SupportRequestStatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'pending':
      return (
        <Badge
          variant="outline"
          className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
        >
          Pending
        </Badge>
      );
    case 'in_progress':
      return (
        <Badge
          variant="outline"
          className="bg-blue-500/10 text-blue-500 border-blue-500/20"
        >
          In Progress
        </Badge>
      );
    case 'resolved':
      return (
        <Badge
          variant="outline"
          className="bg-green-500/10 text-green-500 border-green-500/20"
        >
          Resolved
        </Badge>
      );
    case 'closed':
      return (
        <Badge
          variant="outline"
          className="bg-muted/50 text-muted-foreground border-muted"
        >
          Closed
        </Badge>
      );
    default:
      return null;
  }
}

export function SupportRequestDetailPageClient({
  supportRequest,
  isProfessional,
  currentUserId,
  isAdmin = false,
}: SupportRequestDetailPageClientProps) {
  const router = useRouter();
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [isResolutionModalOpen, setIsResolutionModalOpen] = useState(false);
  const [isProcessingRefund, setIsProcessingRefund] = useState(false);
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Effect to stop polling when support request is resolved
  useEffect(() => {
    if (isProcessingRefund && (supportRequest.status === 'resolved' || supportRequest.refund_status === 'succeeded')) {
      console.log('Support request resolved, stopping refund polling');
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
        pollingTimeoutRef.current = null;
      }
      setIsProcessingRefund(false);
    }
  }, [supportRequest.status, supportRequest.refund_status, isProcessingRefund]);

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
      }
    };
  }, []);

  // Extract data from support request
  const clientName = supportRequest.client_user
    ? `${supportRequest.client_user.first_name || ''} ${supportRequest.client_user.last_name || ''}`.trim()
    : 'Client';

  const professionalName = supportRequest.professional_user
    ? `${supportRequest.professional_user.first_name || ''} ${supportRequest.professional_user.last_name || ''}`.trim()
    : 'Professional';

  // Directly access the appointment from the supportRequest
  const appointment = supportRequest.appointments;
  
  // Directly access the booking from the appointment
  const booking = appointment?.bookings;

  // Extract services with better error handling
  let services: string[] = [];
  try {
    if (booking?.booking_services && Array.isArray(booking.booking_services)) {
      services = booking.booking_services
        .map((bs: { services?: { name?: string } }) => bs.services?.name)
        .filter((name: string | undefined): name is string => Boolean(name));
    }
  } catch (error) {
    console.error('Error extracting service names:', error);
  }

  // Directly access the payment from the booking
  const payment = booking?.booking_payments;
  
  // Check if payment was made by card (for refund eligibility)
  const isPaidByCard = payment?.stripe_payment_intent_id;
  
  // Better service name fallback logic with direct access to service data
  let serviceName = 'General Inquiry';
  
  if (services.length > 0) {
    serviceName = services.join(', ');
  } else if (supportRequest.category === 'refund_request') {
    serviceName = 'Refund Request';
  } else if (supportRequest.title) {
    // Use the request title if no service name is available
    serviceName = supportRequest.title;
  }

  const handleModalSuccess = (isRefund = false) => {
    if (isRefund) {
      // Set processing state for refunds
      setIsProcessingRefund(true);
      
      let pollCount = 0;
      const maxPolls = 20; // Poll for up to 60 seconds (20 * 3 seconds)
      
      // Clear any existing intervals
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
      }
      
      // Poll by refreshing the page data every 3 seconds to check for refund completion
      pollingIntervalRef.current = setInterval(() => {
        pollCount++;
        console.log(`Polling for refund status update... (${pollCount}/${maxPolls})`);
        
        // Refresh the page to get updated data from server
        router.refresh();
        
        // Check if we've reached maximum polls
        if (pollCount >= maxPolls) {
          console.log('Maximum polling attempts reached, stopping polling');
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          setIsProcessingRefund(false);
        }
        
        // Note: We rely on the webhook's revalidatePath to update the data
        // The polling will stop when the component re-renders with updated status
      }, 3000);
      
      // Set a backup timeout to ensure we stop polling
      pollingTimeoutRef.current = setTimeout(() => {
        console.log('Polling timeout reached, stopping polling and refreshing');
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        setIsProcessingRefund(false);
        router.refresh();
      }, 65000); // 65 seconds to be safe
    } else {
      // For non-refund actions, just refresh the page
      router.refresh();
    }
  };

  console.log({
    supportRequest,
    booking,
    appointment,
    payment,
    isPaidByCard,
  })

  return (
    <div className="space-y-6 w-full mx-auto relative">
      {/* Loading overlay for refund processing */}
      {isProcessingRefund && (
        <LoadingOverlay
          loadingText="Processing Refund. Please wait while we process the refund with your payment provider. This may take a few moments."
          variant="light"
        />
      )}
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            href={isAdmin ? "/admin/support-requests" : "/dashboard/support-requests"}
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            <Typography>Back to Support Requests</Typography>
          </Link>
        </div>
        <div className="flex items-center gap-4">
          {/* Professional Action Buttons */}
          {isProfessional &&
            supportRequest.status !== 'resolved' &&
            supportRequest.status !== 'closed' && (
              <div className="flex gap-3">
                {/* Refund Button - Only show if appointment has payment made by card and not already a refund request */}
                {appointment &&
                  payment &&
                  isPaidByCard &&
                   (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsRefundModalOpen(true)}
                      className="text-sm text-orange-600 border-orange-600 hover:bg-orange-50 hover:text-orange-700"
                    >
                      <DollarSign className="h-4 w-4 mr-2" />
                      Process Refund
                    </Button>
                  )}

                {/* Resolve Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsResolutionModalOpen(true)}
                  className="text-primary text-sm border-primary hover:bg-primary/10 hover:text-primary"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Mark Resolved
                </Button>
              </div>
            )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
        {/* Support Request Details */}
        <div className="lg:col-span-1 space-y-6">
          {/* Request Info */}
          <Card>
            <CardHeader>
              <Typography variant="h3" className="text-lg font-semibold">
                Request Details
              </Typography>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Typography variant="small" className="text-muted-foreground">
                  Service
                </Typography>
                <Typography className="font-medium">{serviceName}</Typography>
              </div>

              <div>
                <Typography variant="small" className="text-muted-foreground">
                  Description
                </Typography>
                <Typography className="whitespace-pre-wrap">
                  {supportRequest.description}
                </Typography>
              </div>

              <div>
                <Typography variant="small" className="text-muted-foreground">
                  Status
                </Typography>
                <div className="flex items-center mt-1">
                  <SupportRequestStatusBadge status={supportRequest.status} />
                </div>
              </div>

              <div>
                <Typography variant="small" className="text-muted-foreground">
                  Created
                </Typography>
                <div className="flex items-center">
                  <Calendar className="h-3 w-3 mr-1 text-muted-foreground" />
                  <Typography>
                    {format(
                      new Date(supportRequest.created_at),
                      'MMM dd, yyyy',
                    )}
                  </Typography>
                </div>
                <div className="flex items-center mt-1">
                  <Clock className="h-3 w-3 mr-1 text-muted-foreground" />
                  <Typography variant="small" className="text-muted-foreground">
                    {format(new Date(supportRequest.created_at), 'h:mm a')}
                  </Typography>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* People Involved */}
          <Card>
            <CardHeader>
              <Typography variant="h3" className="text-lg font-semibold">
                People Involved
              </Typography>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Typography variant="small" className="text-muted-foreground">
                  Client
                </Typography>
                <div className="flex items-center">
                  <User className="h-3 w-3 mr-1 text-muted-foreground" />
                  <Typography className="font-medium">{clientName}</Typography>
                </div>
              </div>

              <div>
                <Typography variant="small" className="text-muted-foreground">
                  Professional
                </Typography>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <User className="h-3 w-3 mr-1 text-muted-foreground" />
                    <Typography className="font-medium">
                      {professionalName}
                    </Typography>
                  </div>
                  <Link
                    href={`/professionals/${supportRequest.professional_id}`}
                    className="inline-flex items-center gap-1 text-sm text-primary hover:text-primary/80 transition-colors border border-primary/30 hover:border-primary/50 rounded-md px-2 py-1"
                  >
                    View Profile
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                      <polyline points="15 3 21 3 21 9"></polyline>
                      <line x1="10" y1="14" x2="21" y2="3"></line>
                    </svg>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Financial Details - Only show if this is a refund request */}
          {supportRequest.category === 'refund_request' &&
            (supportRequest.original_amount ||
              supportRequest.requested_amount) && (
              <Card>
                <CardHeader>
                  <Typography variant="h3" className="text-lg font-semibold">
                    Refund Details
                  </Typography>
                </CardHeader>
                <CardContent className="space-y-4">
                  {supportRequest.original_amount && (
                    <div>
                      <Typography
                        variant="small"
                        className="text-muted-foreground"
                      >
                        Original Amount
                      </Typography>
                      <div className="flex items-center">
                        <DollarSign className="h-3 w-3 mr-1 text-muted-foreground" />
                        <Typography className="font-medium">
                          {formatCurrency(supportRequest.original_amount)}
                        </Typography>
                      </div>
                    </div>
                  )}

                  {supportRequest.requested_amount && (
                    <div>
                      <Typography
                        variant="small"
                        className="text-muted-foreground"
                      >
                        Refund Amount
                      </Typography>
                      <div className="flex items-center">
                        <DollarSign className="h-3 w-3 mr-1 text-muted-foreground" />
                        <Typography className="font-medium text-primary">
                          {formatCurrency(supportRequest.requested_amount)}
                        </Typography>
                      </div>
                    </div>
                  )}

                  {supportRequest.professional_notes && (
                    <div>
                      <Typography
                        variant="small"
                        className="text-muted-foreground"
                      >
                        Professional Notes
                      </Typography>
                      <Typography className="whitespace-pre-wrap">
                        {supportRequest.professional_notes}
                      </Typography>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

          {/* Appointment Details */}
          {appointment && (
            <Card>
              <CardHeader>
                <Typography variant="h3" className="text-lg font-semibold">
                  Related Appointment
                </Typography>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Typography variant="small" className="text-muted-foreground">
                    Date & Time
                  </Typography>
                  <div className="flex items-end justify-between">
                    <div className="flex flex-col">
                      <div className="flex items-center">
                        <Calendar className="h-3 w-3 mr-1 text-muted-foreground" />
                        <Typography>
                          {format(
                            new Date(appointment.start_time),
                            'MMM dd, yyyy',
                          )}
                        </Typography>
                      </div>
                      <div className="flex items-center mt-1">
                        <Clock className="h-3 w-3 mr-1 text-muted-foreground" />
                        <Typography
                          variant="small"
                          className="text-muted-foreground"
                        >
                          {format(new Date(appointment.start_time), 'h:mm a')} -{' '}
                          {format(new Date(appointment.end_time), 'h:mm a')}
                        </Typography>
                      </div>
                    </div>
                    <div className="mt-2">
                      <Link
                        href={`/bookings/${appointment.id}`}
                        className="inline-flex items-center gap-1 text-sm text-primary hover:text-primary/80 transition-colors border border-primary/30 hover:border-primary/50 rounded-md px-2 py-1"
                      >
                        Appointment Details
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                          <polyline points="15 3 21 3 21 9"></polyline>
                          <line x1="10" y1="14" x2="21" y2="3"></line>
                        </svg>
                      </Link>
                    </div>
                  </div>
                </div>

                {payment && (
                  <div>
                    <Typography
                      variant="small"
                      className="text-muted-foreground"
                    >
                      Payment
                    </Typography>
                    <Typography className="font-medium">
                      {formatCurrency(
                        payment.amount + (payment.tip_amount || 0),
                      )}
                    </Typography>
                    {payment.payment_methods && (
                      <Typography
                        variant="small"
                        className="text-muted-foreground"
                      >
                        via {payment.payment_methods.name}
                      </Typography>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Chat Section */}
        <div className="lg:col-span-2 lg:sticky lg:top-6 lg:h-[calc(100vh-200px)]">
          <Card className="h-full flex flex-col">
            <CardHeader className="border-b flex-shrink-0">
              <div className="flex items-center">
                <MessageSquare className="h-5 w-5 mr-2" />
                <Typography variant="h3" className="text-lg font-semibold">
                  Conversation
                </Typography>
              </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-hidden">
              {supportRequest.conversations?.id ? (
                <SupportRequestChatWidget
                  conversationId={supportRequest.conversations.id}
                  currentUserId={currentUserId}
                  otherUser={
                    currentUserId === supportRequest.client_id
                      ? {
                          id: supportRequest.professional_user.id,
                          first_name:
                            supportRequest.professional_user.first_name,
                          last_name:
                            supportRequest.professional_user.last_name,
                          profile_photo_url: supportRequest.professional_user.profile_photos && 
                            supportRequest.professional_user.profile_photos.length > 0 ? 
                            supportRequest.professional_user.profile_photos[0]?.url || undefined : undefined,
                        }
                      : {
                          id: supportRequest.client_user.id,
                          first_name: supportRequest.client_user.first_name,
                          last_name: supportRequest.client_user.last_name,
                          profile_photo_url: supportRequest.client_user.profile_photos && 
                            supportRequest.client_user.profile_photos.length > 0 ? 
                            supportRequest.client_user.profile_photos[0]?.url || undefined : undefined,
                        }
                  }
                  readOnly={supportRequest.status === 'resolved' || supportRequest.status === 'closed'}
                  resolvedInfo={
                    supportRequest.status === 'resolved' || supportRequest.status === 'closed'
                      ? {
                          status: supportRequest.status,
                          resolvedAt: supportRequest.resolved_at,
                          resolvedBy: supportRequest.resolved_by,
                          resolutionNotes: supportRequest.resolution_notes,
                        }
                      : undefined
                  }
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <Typography className="text-muted-foreground">
                    No conversation found for this support request.
                  </Typography>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modals */}
      {isProfessional && appointment && payment && (
        <RefundModal
          isOpen={isRefundModalOpen}
          onClose={() => setIsRefundModalOpen(false)}
          supportRequestId={supportRequest.id}
          originalAmount={payment.amount + (payment.tip_amount || 0)}
          serviceName={serviceName}
          onSuccess={() => handleModalSuccess(true)}
          paymentDetails={{
            baseAmount: payment.amount - (payment.deposit_amount || 0) - (payment.service_fee || 0),
            depositAmount: payment.deposit_amount || 0,
            tipAmount: payment.tip_amount || 0,
            serviceFee: payment.service_fee || 0,
            paymentMethod: payment.payment_methods?.name || 'Card',
          }}
        />
      )}

      <ResolutionModal
        isOpen={isResolutionModalOpen}
        onClose={() => setIsResolutionModalOpen(false)}
        supportRequestId={supportRequest.id}
        serviceName={serviceName}
        onSuccess={handleModalSuccess}
      />
    </div>
  );
}
