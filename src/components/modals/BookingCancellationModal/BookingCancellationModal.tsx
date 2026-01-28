'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, Loader2, Clock } from 'lucide-react';
import {
  cancelBookingAction,
  cancelWithPolicyAction,
  getCancellationPolicyAction,
} from '@/server/domains/bookings/actions';
import { useToast } from '@/components/ui/use-toast';

type BookingCancellationModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  bookingId: string;
  appointmentDate: string;
  professionalName: string;
};

export function BookingCancellationModal({
  isOpen,
  onClose,
  onSuccess,
  bookingId,
  appointmentDate,
  professionalName,
}: BookingCancellationModalProps) {
  const [cancellationReason, setCancellationReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [policyInfo, setPolicyInfo] = useState<{
    percentage: number;
    amount: number;
    timeUntilAppointment: number;
  } | null>(null);
  const [hasPolicy, setHasPolicy] = useState(false);
  const [isLoadingPolicy, setIsLoadingPolicy] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      loadPolicyInfo();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, bookingId]);

  const loadPolicyInfo = async () => {
    setIsLoadingPolicy(true);
    try {
      const result = await getCancellationPolicyAction(bookingId);
      if (result.hasPolicy && result.chargeInfo) {
        setHasPolicy(true);
        setPolicyInfo(result.chargeInfo);
      } else {
        setHasPolicy(false);
        setPolicyInfo(null);
      }
    } catch (error) {
      console.error('Error loading policy info:', error);
      setHasPolicy(false);
      setPolicyInfo(null);
    } finally {
      setIsLoadingPolicy(false);
    }
  };

  const handleCancel = async () => {
    if (!cancellationReason.trim()) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please provide a reason for cancellation.',
      });
      return;
    }

    setIsLoading(true);

    try {
      const result =
        hasPolicy && policyInfo && policyInfo.percentage > 0
          ? await cancelWithPolicyAction(bookingId, cancellationReason.trim())
          : await cancelBookingAction(bookingId, cancellationReason.trim());

      if (result.success) {
        toast({
          title: 'Booking Cancelled',
          description:
            result.chargeAmount && result.chargeAmount > 0
              ? `Booking cancelled with $${result.chargeAmount.toFixed(2)} cancellation fee.`
              : 'Your booking has been successfully cancelled. Email notifications have been sent.',
        });
        onClose();
        onSuccess?.();
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description:
            result.error || 'Failed to cancel booking. Please try again.',
        });
      }
    } catch (error) {
      console.error('Error cancelling booking:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setCancellationReason('');
      setPolicyInfo(null);
      setHasPolicy(false);
      onClose();
    }
  };

  const getTimeDescription = () => {
    if (!policyInfo) return '';

    const hours = policyInfo.timeUntilAppointment;
    if (hours < 24) return 'Less than 24 hours';
    if (hours < 48) return 'Less than 48 hours';
    return 'More than 48 hours';
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Cancel Appointment
          </DialogTitle>
          <DialogDescription className="text-base">
            Cancel your appointment with {professionalName} on {appointmentDate}
            .
            {hasPolicy && policyInfo && policyInfo.percentage > 0 && (
              <span className="text-amber-600 font-medium">
                {' '}
                A cancellation fee may apply.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-1">
          <div className="space-y-6 py-4">
            {/* Loading state for policy check */}
            {isLoadingPolicy && (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span className="text-sm text-muted-foreground">
                  Checking cancellation policy...
                </span>
              </div>
            )}

            {/* Cancellation Policy Information */}
            {!isLoadingPolicy &&
              hasPolicy &&
              policyInfo &&
              policyInfo.percentage > 0 && (
                <Card className="border-amber-200 bg-amber-50">
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-amber-800">
                        <Clock className="h-4 w-4" />
                        <span className="font-medium">
                          Cancellation Policy Applied
                        </span>
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-amber-700">
                            Time until appointment:
                          </span>
                          <span className="font-medium text-amber-800">
                            {getTimeDescription()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-amber-700">
                            Cancellation fee rate:
                          </span>
                          <span className="font-medium text-amber-800">
                            {policyInfo.percentage}%
                          </span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-amber-200">
                        <p className="text-sm text-amber-700">
                          A cancellation fee of {policyInfo.percentage}% will be
                          applied based on your service amount.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

            {/* Booking Details */}
            {!isLoadingPolicy && (
              <div className="rounded-lg border p-4 bg-muted/50">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Professional:
                    </span>
                    <span className="text-sm font-medium">
                      {professionalName}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Date:</span>
                    <span className="text-sm font-medium">
                      {appointmentDate}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Warning Alert */}
            {!isLoadingPolicy && (
              <Alert variant="warning">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  This action cannot be undone. Your booking will be cancelled
                  and both you and the professional will be notified.
                  {hasPolicy && policyInfo && policyInfo.percentage > 0 && (
                    <span className="block mt-1 font-medium">
                      A cancellation fee will be charged to your payment method.
                    </span>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* Cancellation Reason */}
            {!isLoadingPolicy && (
              <div className="space-y-2">
                <Label
                  htmlFor="cancellation-reason"
                  className="text-sm font-medium"
                >
                  Reason for cancellation{' '}
                  <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="cancellation-reason"
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  placeholder="Please explain why you're cancelling this appointment..."
                  className="min-h-[100px] max-h-[150px] resize-none"
                  disabled={isLoading}
                  maxLength={500}
                />
                <div className="text-xs text-muted-foreground text-right">
                  {cancellationReason.length}/500 characters
                </div>
              </div>
            )}

            {/* Additional Information */}
            {!isLoadingPolicy && (
              <div className="text-sm text-muted-foreground bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="font-medium text-blue-800 mb-1">Please note:</p>
                <ul className="list-disc list-inside space-y-1 text-blue-700">
                  <li>
                    Both you and the professional will receive email
                    notifications
                  </li>
                  {hasPolicy && policyInfo && policyInfo.percentage > 0 && (
                    <li>
                      A cancellation fee will be charged based on the policy
                      rate
                    </li>
                  )}
                  <li>This action cannot be undone</li>
                  <li>You can rebook a new appointment at any time</li>
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons - Fixed Footer */}
        {!isLoadingPolicy && (
          <div className="flex-shrink-0 border-t pt-4">
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={isLoading}
                className="flex-1"
              >
                Keep Appointment
              </Button>
              <Button
                variant="destructive"
                onClick={handleCancel}
                disabled={isLoading || !cancellationReason.trim()}
                className="flex-1"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  'Cancel Appointment'
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
