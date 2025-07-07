'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Typography } from '@/components/ui/typography';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    start_time: string;
    end_time: string;
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
      } | null;
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
  const appointmentDate = new Date(refund.appointments.start_time);
  const startTime = new Date(refund.appointments.start_time);
  const endTime = new Date(refund.appointments.end_time);
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
    switch (status.toLowerCase()) {
      case 'pending':
        return (
          <Badge variant="outline" className="bg-yellow-50">
            <AlertTriangle className="mr-1 h-3 w-3 text-yellow-500" />
            Pending
          </Badge>
        );
      case 'approved':
        return (
          <Badge variant="outline" className="bg-green-50">
            <CheckCircle className="mr-1 h-3 w-3 text-green-500" />
            Approved
          </Badge>
        );
      case 'declined':
        return (
          <Badge variant="outline" className="bg-red-50">
            <XCircle className="mr-1 h-3 w-3 text-red-500" />
            Declined
          </Badge>
        );
      case 'completed':
        return (
          <Badge variant="outline" className="bg-blue-50">
            <CheckCircle className="mr-1 h-3 w-3 text-blue-500" />
            Completed
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <AlertTriangle className="mr-1 h-3 w-3" />
            {status}
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/dashboard')}
          >
            <ArrowLeftIcon className="h-4 w-4" />
          </Button>
          <Typography variant="h4">Refund Request</Typography>
        </div>
        {getStatusBadge(refund.status)}
      </div>

      {/* Main Content */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Left Column - Appointment Details */}
        <Card>
          <CardHeader>
            <CardTitle>Appointment Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Date & Time */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                <Typography>
                  {format(appointmentDate, 'EEEE, MMMM d, yyyy')}
                </Typography>
              </div>
              <div className="flex items-center gap-2">
                <ClockIcon className="h-4 w-4 text-muted-foreground" />
                <Typography>
                  {format(startTime, 'h:mm a')} - {format(endTime, 'h:mm a')}
                </Typography>
              </div>
            </div>

            {/* Client */}
            <div className="flex items-center gap-2">
              <UserIcon className="h-4 w-4 text-muted-foreground" />
              <Typography>{clientName}</Typography>
            </div>

            {/* Service */}
            <div className="flex items-center gap-2">
              <FileTextIcon className="h-4 w-4 text-muted-foreground" />
              <Typography>{serviceName}</Typography>
            </div>

            {/* Payment Method */}
            <div className="flex items-center gap-2">
              <CreditCardIcon className="h-4 w-4 text-muted-foreground" />
              <Typography>
                {refund.appointments.bookings.booking_payments?.payment_methods
                  .name || 'Unknown'}
              </Typography>
            </div>

            {/* Original Amount */}
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <Typography>
                Original Payment:{' '}
                {formatCurrency(
                  (refund.appointments.bookings.booking_payments?.amount || 0) +
                    (refund.appointments.bookings.booking_payments
                      ?.tip_amount || 0),
                )}
              </Typography>
            </div>

            {/* View Appointment Link */}
            <div className="pt-2">
              <Link
                href={`/bookings/${refund.appointments.id}`}
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                View Appointment
                <ExternalLinkIcon className="h-3 w-3" />
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Right Column - Refund Details */}
        <Card>
          <CardHeader>
            <CardTitle>Refund Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Refund Reason */}
            <div className="space-y-2">
              <Label>Reason for Refund</Label>
              <Alert>
                <AlertDescription>{refund.reason}</AlertDescription>
              </Alert>
            </div>

            {/* Original Payment */}
            <div className="space-y-2">
              <Label>Original Payment</Label>
              <Typography>
                {formatCurrency(
                  (refund.appointments.bookings.booking_payments?.amount || 0) +
                    (refund.appointments.bookings.booking_payments
                      ?.tip_amount || 0),
                )}
              </Typography>
            </div>

            {/* Professional Notes */}
            {isProfessional && refund.status === 'pending' && (
              <div className="space-y-2">
                <Label htmlFor="professionalNotes">Notes (Optional)</Label>
                <Textarea
                  id="professionalNotes"
                  value={professionalNotes}
                  onChange={(e) => setProfessionalNotes(e.target.value)}
                  placeholder="Add any notes about this refund..."
                  rows={3}
                />
              </div>
            )}

            {/* Refund Amount Input */}
            {isProfessional &&
              refund.status === 'pending' &&
              !showDeclineForm && (
                <div className="space-y-2">
                  <Label htmlFor="refundAmount">Refund Amount</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="refundAmount"
                      type="number"
                      value={refundAmount}
                      onChange={(e) => setRefundAmount(e.target.value)}
                      className="pl-8"
                      step="0.01"
                      min="0"
                      max={refund.original_amount}
                    />
                  </div>
                  <Typography variant="small" className="text-muted-foreground">
                    Est. transaction fee: {formatCurrency(estimatedFee)}
                  </Typography>
                </div>
              )}

            {/* Decline Form */}
            {isProfessional &&
              refund.status === 'pending' &&
              showDeclineForm && (
                <div className="space-y-2">
                  <Label htmlFor="declineReason">Reason for Declining</Label>
                  <Textarea
                    id="declineReason"
                    value={declineReason}
                    onChange={(e) => setDeclineReason(e.target.value)}
                    placeholder="Please provide a reason for declining this refund request..."
                    rows={3}
                  />
                </div>
              )}

            {/* Action Buttons */}
            {isProfessional && refund.status === 'pending' && (
              <div className="flex gap-2 pt-4">
                {showDeclineForm ? (
                  <>
                    <Button
                      variant="destructive"
                      onClick={handleDecline}
                      disabled={isDeclining}
                    >
                      {isDeclining ? 'Declining...' : 'Confirm Decline'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowDeclineForm(false)}
                      disabled={isDeclining}
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      onClick={handleApprove}
                      disabled={isApproving}
                      className="flex-1"
                    >
                      {isApproving ? 'Approving...' : 'Approve Refund'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowDeclineForm(true)}
                      disabled={isApproving}
                    >
                      Decline
                    </Button>
                  </>
                )}
              </div>
            )}

            {/* Status Information */}
            {refund.status !== 'pending' && (
              <div className="space-y-2">
                <Label>Status</Label>
                <div className="flex items-center gap-2">
                  {getStatusBadge(refund.status)}
                  <Typography className="text-muted-foreground">
                    {format(new Date(refund.updated_at), 'MMM d, yyyy h:mm a')}
                  </Typography>
                </div>
                {refund.professional_notes && (
                  <Alert>
                    <AlertDescription>
                      {refund.professional_notes}
                    </AlertDescription>
                  </Alert>
                )}
                {refund.declined_reason && (
                  <Alert>
                    <AlertDescription>
                      {refund.declined_reason}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
