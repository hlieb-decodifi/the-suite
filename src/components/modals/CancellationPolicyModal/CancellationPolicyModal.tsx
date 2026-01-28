'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, DollarSign, Clock } from 'lucide-react';
import {
  cancelWithPolicyAction,
  getCancellationPolicyAction,
} from '@/server/domains/bookings/actions';
import { useToast } from '@/components/ui/use-toast';

type CancellationPolicyModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  bookingId: string;
  appointmentDate: string;
  professionalName: string;
};

export function CancellationPolicyModal({
  isOpen,
  onClose,
  onSuccess,
  bookingId,
  appointmentDate,
  professionalName,
}: CancellationPolicyModalProps) {
  const [cancellationReason, setCancellationReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [policyInfo, setPolicyInfo] = useState<{
    percentage: number;
    amount: number;
    timeUntilAppointment: number;
  } | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      loadPolicyInfo();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, bookingId]);

  const loadPolicyInfo = async () => {
    try {
      const result = await getCancellationPolicyAction(bookingId);
      if (result.hasPolicy && result.chargeInfo) {
        setPolicyInfo(result.chargeInfo);
      }
    } catch (error) {
      console.error('Error loading policy info:', error);
    }
  };

  const handleCancel = async () => {
    if (!cancellationReason.trim()) {
      toast({
        title: 'Reason Required',
        description: 'Please provide a reason for cancellation.',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);

    try {
      const result = await cancelWithPolicyAction(
        bookingId,
        cancellationReason.trim(),
      );

      if (result.success) {
        toast({
          title: 'Booking Cancelled',
          description:
            result.chargeAmount && result.chargeAmount > 0
              ? `Booking cancelled with $${result.chargeAmount.toFixed(2)} cancellation fee.`
              : 'Booking cancelled successfully.',
        });
        onClose();
        onSuccess?.();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to cancel booking.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error cancelling booking:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Cancel Appointment
          </DialogTitle>
          <DialogDescription>
            Cancel your appointment with {professionalName} on {appointmentDate}
            .
            {policyInfo && policyInfo.percentage > 0 && (
              <span className="text-amber-600 font-medium">
                {' '}
                A cancellation fee may apply.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {policyInfo && policyInfo.percentage > 0 && (
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
                      <span className="text-amber-700">Cancellation rate:</span>
                      <span className="font-medium text-amber-800">
                        {policyInfo.percentage}%
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-amber-200">
                    <span className="flex items-center gap-1 font-medium text-amber-800">
                      <DollarSign className="h-4 w-4" />
                      Cancellation Fee:
                    </span>
                    <span className="text-lg font-bold text-amber-900">
                      ${policyInfo.amount.toFixed(2)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-2">
            <Label htmlFor="reason">
              Reason for Cancellation <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="reason"
              placeholder="Please provide a reason for cancelling this appointment..."
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
              className="min-h-[100px]"
            />
          </div>

          <div className="text-sm text-muted-foreground bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="font-medium text-blue-800 mb-1">Please note:</p>
            <ul className="list-disc list-inside space-y-1 text-blue-700">
              <li>
                Both you and the professional will receive email notifications
              </li>
              {policyInfo && policyInfo.percentage > 0 && (
                <li>
                  The cancellation fee will be charged to your payment method
                </li>
              )}
              <li>This action cannot be undone</li>
              <li>You can rebook a new appointment at any time</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>
            Keep Appointment
          </Button>
          <Button
            onClick={handleCancel}
            disabled={isProcessing || !cancellationReason.trim()}
            variant="destructive"
          >
            {isProcessing ? 'Cancelling...' : 'Cancel Appointment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
