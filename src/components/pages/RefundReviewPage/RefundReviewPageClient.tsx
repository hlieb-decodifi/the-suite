'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Typography } from '@/components/ui/typography';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  CalendarIcon,
  ClockIcon,
  CreditCardIcon,
  UserIcon,
  FileTextIcon,
  ArrowLeftIcon,
  AlertTriangle,
  CheckCircle,
  XCircle,
  DollarSign,
  ExternalLinkIcon,
} from 'lucide-react';
import { format } from 'date-fns';
import { formatCurrency } from '@/utils/formatCurrency';
import Link from 'next/link';

type RefundData = {
  id: string;
  appointment_id: string;
  client_id: string;
  professional_id: string;
  booking_payment_id: string;
  reason: string;
  requested_amount: number | null;
  original_amount: number;
  transaction_fee: number;
  refund_amount: number | null;
  status: string;
  professional_notes: string | null;
  declined_reason: string | null;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
  appointments: {
    id: string;
    date: string;
    start_time: string;
    end_time: string;
    booking_id: string;
    bookings: {
      id: string;
      notes: string | null;
      booking_services: Array<{
        id: string;
        price: number;
        duration: number;
        services: {
          name: string;
          description: string | null;
        };
      }>;
      booking_payments: {
        id: string;
        amount: number;
        tip_amount: number;
        status: string;
        payment_methods: {
          name: string;
          is_online: boolean;
        };
      };
    };
  };
  clients: {
    id: string;
    first_name: string;
    last_name: string;
  };
};

export type RefundReviewPageClientProps = {
  refund: RefundData;
  currentUserId: string;
  isProfessional?: boolean;
};

export function RefundReviewPageClient({
  refund,
  isProfessional = false,
}: RefundReviewPageClientProps) {
  const [refundAmount, setRefundAmount] = useState<string>(
    refund.original_amount.toString(),
  );
  const [professionalNotes, setProfessionalNotes] = useState<string>('');
  const [declineReason, setDeclineReason] = useState<string>('');
  const [isApproving, setIsApproving] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);
  const [showDeclineForm, setShowDeclineForm] = useState(false);

  const router = useRouter();
  const { toast } = useToast();

  // Format appointment details
  const appointmentDate = new Date(refund.appointments.date);
  const startTime = new Date(`1970-01-01T${refund.appointments.start_time}`);
  const endTime = new Date(`1970-01-01T${refund.appointments.end_time}`);
  const clientName = `${refund.clients.first_name} ${refund.clients.last_name}`;
  const serviceName = refund.appointments.bookings.booking_services
    .map((bs) => bs.services.name)
    .join(', ');

  // Calculate transaction fee estimate
  const estimatedFee =
    Math.round((parseFloat(refundAmount) * 0.029 + 0.3) * 100) / 100;

  const handleApprove = async () => {
    const amount = parseFloat(refundAmount);

    if (isNaN(amount) || amount <= 0 || amount > refund.original_amount) {
      toast({
        variant: 'destructive',
        title: 'Invalid amount',
        description: `Please enter a valid refund amount between $0.01 and $${refund.original_amount.toFixed(2)}`,
      });
      return;
    }

    setIsApproving(true);

    try {
      const { processRefundDecision } = await import(
        '@/server/domains/refunds/actions'
      );
      const result = await processRefundDecision({
        refund_id: refund.id,
        status: 'approved',
        requested_amount: amount,
        professional_notes: professionalNotes.trim() || undefined,
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to approve refund');
      }

      toast({
        title: 'Refund approved',
        description: 'The refund has been approved and is being processed.',
      });

      router.push('/dashboard');
    } catch (error) {
      console.error('Error approving refund:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to approve refund',
        description:
          error instanceof Error ? error.message : 'Please try again later.',
      });
    } finally {
      setIsApproving(false);
    }
  };

  const handleDecline = async () => {
    if (!declineReason.trim()) {
      toast({
        variant: 'destructive',
        title: 'Reason required',
        description:
          'Please provide a reason for declining this refund request.',
      });
      return;
    }

    setIsDeclining(true);

    try {
      const { processRefundDecision } = await import(
        '@/server/domains/refunds/actions'
      );
      const result = await processRefundDecision({
        refund_id: refund.id,
        status: 'declined',
        declined_reason: declineReason.trim(),
        professional_notes: professionalNotes.trim() || undefined,
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to decline refund');
      }

      toast({
        title: 'Refund declined',
        description:
          'The refund request has been declined and the client has been notified.',
      });

      router.push('/dashboard');
    } catch (error) {
      console.error('Error declining refund:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to decline refund',
        description:
          error instanceof Error ? error.message : 'Please try again later.',
      });
    } finally {
      setIsDeclining(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge
            variant="outline"
            className="text-orange-600 border-orange-600"
          >
            Pending Review
          </Badge>
        );
      case 'approved':
        return (
          <Badge variant="outline" className="text-green-600 border-green-600">
            Approved
          </Badge>
        );
      case 'declined':
        return (
          <Badge variant="outline" className="text-red-600 border-red-600">
            Declined
          </Badge>
        );
      case 'processing':
        return (
          <Badge variant="outline" className="text-blue-600 border-blue-600">
            Processing
          </Badge>
        );
      case 'completed':
        return (
          <Badge variant="outline" className="text-green-600 border-green-600">
            Completed
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="outline" className="text-red-600 border-red-600">
            Failed
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="flex items-center gap-2"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Back
          </Button>
          <div className="flex-1">
            <Typography className="text-2xl font-bold text-foreground">
              Refund Request Review
            </Typography>
            <Typography variant="muted" className="mt-1">
              Review and respond to this refund request from your client
            </Typography>
          </div>
          {getStatusBadge(refund.status)}
        </div>

        {/* Alert for already processed refunds */}
        {refund.status !== 'pending' && (
          <Alert className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This refund request has already been processed and cannot be
              modified.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Refund Request Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileTextIcon className="h-5 w-5 text-muted-foreground" />
                  Refund Request Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Typography className="font-medium text-foreground mb-2">
                    Client's Reason for Refund
                  </Typography>
                  <div className="bg-muted/50 rounded-lg p-4">
                    <Typography className="text-foreground">
                      "{refund.reason}"
                    </Typography>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Typography className="font-medium text-foreground">
                      Request Date
                    </Typography>
                    <Typography variant="muted">
                      {format(
                        new Date(refund.created_at),
                        'MMM d, yyyy h:mm a',
                      )}
                    </Typography>
                  </div>
                  <div>
                    <Typography className="font-medium text-foreground">
                      Original Amount
                    </Typography>
                    <Typography variant="muted" className="font-semibold">
                      {formatCurrency(refund.original_amount)}
                    </Typography>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Decision Form - Only show if pending and user is a professional */}
            {refund.status === 'pending' && isProfessional && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-muted-foreground" />
                    Your Decision
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {!showDeclineForm ? (
                    <>
                      {/* Approve Form */}
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="refundAmount">
                            Refund Amount{' '}
                            <span className="text-destructive">*</span>
                          </Label>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="relative flex-1">
                              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                                $
                              </span>
                              <Input
                                id="refundAmount"
                                type="number"
                                step="0.01"
                                min="0.01"
                                max={refund.original_amount}
                                value={refundAmount}
                                onChange={(e) =>
                                  setRefundAmount(e.target.value)
                                }
                                className="pl-6"
                                placeholder="0.00"
                              />
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setRefundAmount(
                                  refund.original_amount.toString(),
                                )
                              }
                            >
                              Full Amount
                            </Button>
                          </div>
                          <Typography
                            variant="small"
                            className="text-muted-foreground mt-1"
                          >
                            Maximum: {formatCurrency(refund.original_amount)}
                          </Typography>
                        </div>

                        <Alert>
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>
                            <strong>Transaction Fee Notice:</strong> You will be
                            responsible for the estimated transaction fee of ~$
                            {estimatedFee.toFixed(2)} for this refund.
                          </AlertDescription>
                        </Alert>

                        <div>
                          <Label htmlFor="professionalNotes">
                            Notes (Optional)
                          </Label>
                          <Textarea
                            id="professionalNotes"
                            placeholder="Add any notes for the client..."
                            value={professionalNotes}
                            onChange={(e) =>
                              setProfessionalNotes(e.target.value)
                            }
                            rows={3}
                            maxLength={500}
                          />
                          <Typography
                            variant="small"
                            className="text-muted-foreground text-right mt-1"
                          >
                            {professionalNotes.length}/500 characters
                          </Typography>
                        </div>

                        <div className="flex gap-3">
                          <Button
                            onClick={handleApprove}
                            disabled={isApproving || isDeclining}
                            className="flex-1"
                          >
                            {isApproving ? (
                              <>
                                <CheckCircle className="h-4 w-4 mr-2 animate-spin" />
                                Approving...
                              </>
                            ) : (
                              <>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Approve Refund
                              </>
                            )}
                          </Button>
                          <Button
                            variant="destructiveOutline"
                            onClick={() => setShowDeclineForm(true)}
                            disabled={isApproving || isDeclining}
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Decline
                          </Button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Decline Form */}
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="declineReason">
                            Reason for Declining{' '}
                            <span className="text-destructive">*</span>
                          </Label>
                          <Textarea
                            id="declineReason"
                            placeholder="Please explain why you are declining this refund request..."
                            value={declineReason}
                            onChange={(e) => setDeclineReason(e.target.value)}
                            rows={4}
                            maxLength={500}
                            required
                          />
                          <Typography
                            variant="small"
                            className="text-muted-foreground text-right mt-1"
                          >
                            {declineReason.length}/500 characters
                          </Typography>
                        </div>

                        <div>
                          <Label htmlFor="professionalNotesDecline">
                            Additional Notes (Optional)
                          </Label>
                          <Textarea
                            id="professionalNotesDecline"
                            placeholder="Add any additional notes for the client..."
                            value={professionalNotes}
                            onChange={(e) =>
                              setProfessionalNotes(e.target.value)
                            }
                            rows={3}
                            maxLength={500}
                          />
                        </div>

                        <div className="flex gap-3">
                          <Button
                            variant="outline"
                            onClick={() => setShowDeclineForm(false)}
                            disabled={isApproving || isDeclining}
                            className="flex-1"
                          >
                            Back to Approve
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={handleDecline}
                            disabled={
                              isApproving ||
                              isDeclining ||
                              !declineReason.trim()
                            }
                            className="flex-1"
                          >
                            {isDeclining ? (
                              <>
                                <XCircle className="h-4 w-4 mr-2 animate-spin" />
                                Declining...
                              </>
                            ) : (
                              <>
                                <XCircle className="h-4 w-4 mr-2" />
                                Confirm Decline
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Appointment Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5 text-muted-foreground" />
                  Appointment Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Typography className="font-medium text-foreground">
                    Service
                  </Typography>
                  <Typography variant="muted">{serviceName}</Typography>
                </div>

                <Separator />

                <div>
                  <Typography className="font-medium text-foreground">
                    Date & Time
                  </Typography>
                  <div className="space-y-1">
                    <Typography variant="muted">
                      {format(appointmentDate, 'EEEE, MMMM d, yyyy')}
                    </Typography>
                    <Typography
                      variant="muted"
                      className="flex items-center gap-1"
                    >
                      <ClockIcon className="h-3 w-3" />
                      {format(startTime, 'h:mm a')} -{' '}
                      {format(endTime, 'h:mm a')}
                    </Typography>
                  </div>
                </div>

                <Separator />

                <div>
                  <Typography className="font-medium text-foreground">
                    Client
                  </Typography>
                  <Typography
                    variant="muted"
                    className="flex items-center gap-1"
                  >
                    <UserIcon className="h-3 w-3" />
                    {clientName}
                  </Typography>
                </div>

                <Separator />

                <div className="pt-2">
                  <Button variant="outline" asChild className="w-full">
                    <Link href={`/bookings/${refund.appointment_id}`}>
                      <ExternalLinkIcon className="h-4 w-4 mr-2" />
                      View Booking Details
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Payment Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCardIcon className="h-5 w-5 text-muted-foreground" />
                  Payment Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <Typography className="font-medium text-foreground">
                    Service Amount:
                  </Typography>
                  <Typography variant="muted">
                    {formatCurrency(
                      refund.appointments.bookings.booking_payments.amount,
                    )}
                  </Typography>
                </div>

                {refund.appointments.bookings.booking_payments.tip_amount >
                  0 && (
                  <div className="flex justify-between items-center">
                    <Typography className="font-medium text-foreground">
                      Tip:
                    </Typography>
                    <Typography variant="muted">
                      {formatCurrency(
                        refund.appointments.bookings.booking_payments
                          .tip_amount,
                      )}
                    </Typography>
                  </div>
                )}

                <Separator />

                <div className="flex justify-between items-center">
                  <Typography className="font-semibold text-foreground">
                    Total Paid:
                  </Typography>
                  <Typography className="font-semibold text-primary">
                    {formatCurrency(refund.original_amount)}
                  </Typography>
                </div>

                <div>
                  <Typography className="font-medium text-foreground">
                    Payment Method
                  </Typography>
                  <Typography variant="muted">
                    {
                      refund.appointments.bookings.booking_payments
                        .payment_methods.name
                    }
                    {refund.appointments.bookings.booking_payments
                      .payment_methods.is_online && ' (Online)'}
                  </Typography>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
