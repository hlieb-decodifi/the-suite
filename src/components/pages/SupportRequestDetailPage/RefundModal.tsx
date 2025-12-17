import React, { useState, useMemo } from 'react';
import { DollarSign, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { initiateRefundServerAction } from '@/server/domains/support-requests/server-actions';
import { calculatePaymentBreakdown } from '@/utils/paymentBreakdown';

type RefundModalProps = {
  isOpen: boolean;
  onClose: () => void;
  supportRequestId: string;
  originalAmount: number;
  serviceName: string;
  onSuccess: () => void;
  paymentDetails?: {
    baseAmount?: number;
    depositAmount?: number;
    tipAmount?: number;
    serviceFee?: number;
    paymentMethod?: string;
    isOnlinePayment?: boolean; // Whether payment method is online (card) or offline (cash)
    balanceAmount?: number; // Balance amount from booking_payments table
  };
};

export const RefundModal: React.FC<RefundModalProps> = ({
  isOpen,
  onClose,
  supportRequestId,
  originalAmount,
  serviceName,
  onSuccess,
  paymentDetails,
}) => {
  // Calculate payment breakdown (without service fee for professional view)
  const paymentBreakdown = useMemo(() => {
    if (!paymentDetails) return null;

    return calculatePaymentBreakdown({
      bookingPayment: {
        tip_amount: paymentDetails.tipAmount ?? 0,
        service_fee: paymentDetails.serviceFee ?? 0,
        deposit_amount: paymentDetails.depositAmount ?? 0,
        balance_amount: paymentDetails.balanceAmount ?? 0,
      },
      includeServiceFee: false, // Professional view - exclude service fee
      formatAsCurrency: false,
    });
  }, [paymentDetails]);

  // Calculate maximum refundable amount (what professional sees and can refund)
  const calculateMaxRefundableAmount = () => {
    if (!paymentDetails || !paymentBreakdown) return originalAmount;

    const isOnlinePayment = paymentDetails.isOnlinePayment ?? true;

    if (isOnlinePayment) {
      // For card payments: professional sees total without service fee
      return paymentBreakdown.total as number;
    } else {
      // For cash payments: can only refund amounts charged online (deposit - excluding service fee portion)
      const deposit = paymentBreakdown.deposit as number;
      return deposit;
    }
  };

  const maxRefundableAmount = calculateMaxRefundableAmount();
  const serviceFee = paymentDetails?.serviceFee ?? 0;

  const [refundAmount, setRefundAmount] = useState(
    maxRefundableAmount.toString(),
  );
  const [refundReason, setRefundReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const amount = parseFloat(refundAmount);
    if (isNaN(amount) || amount <= 0 || amount > maxRefundableAmount) {
      const paymentType =
        paymentDetails?.isOnlinePayment === false ? 'cash' : 'card';
      const additionalInfo = paymentType === 'cash' ? ' (deposit only)' : '';
      toast({
        title: 'Invalid Amount',
        description: `Refund amount must be between $0.01 and $${maxRefundableAmount.toFixed(2)}${additionalInfo}`,
        variant: 'destructive',
      });
      return;
    }

    if (!refundReason.trim()) {
      toast({
        title: 'Missing Information',
        description: 'Please provide a reason for the refund',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSubmitting(true);

      // If professional is refunding the full amount, add service fee on top
      // This ensures the client receives the full amount back
      const isFullRefund = Math.abs(amount - maxRefundableAmount) < 0.01; // Using small epsilon for floating point comparison
      const actualRefundAmount = isFullRefund ? amount + serviceFee : amount;

      // Create FormData for the server action
      const formData = new FormData();
      formData.append('support_request_id', supportRequestId);
      formData.append('refund_amount', actualRefundAmount.toString());
      formData.append('professional_notes', refundReason.trim());

      console.log('Submitting refund request to server action');
      const result = await initiateRefundServerAction(formData);

      if (result.success) {
        toast({
          title: 'Success',
          description: 'Refund initiated successfully',
        });
        onSuccess();
        onClose();
        resetForm();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to initiate refund',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Refund initiation error:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setRefundAmount(maxRefundableAmount.toString());
    setRefundReason('');
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
      resetForm();
    }
  };

  return (
    <>
      {/* Full screen loading overlay */}
      {isSubmitting && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-card p-6 rounded-lg shadow-lg text-center max-w-md w-full">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-10 w-10 text-primary animate-spin" />
              <div className="space-y-2">
                <h3 className="text-lg font-medium">Processing Refund</h3>
                <p className="text-muted-foreground">
                  Please wait while we process your refund request with the
                  payment provider. This may take a moment.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              Initiate Refund
            </DialogTitle>
            <DialogDescription>
              Process a refund for this support request. The refund will be
              processed according to your payment provider&apos;s terms.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 pr-2 -mr-2">
            {/* Service Information */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex gap-2 justify-between items-center">
                <span className="text-sm font-medium text-muted-foreground">
                  Service:
                </span>
                <span className="text-sm font-semibold">{serviceName}</span>
              </div>

              {/* Payment Breakdown */}
              <div className="pt-2 border-t border-border mt-2">
                <h4 className="text-sm font-medium mb-2">Payment Breakdown</h4>

                {paymentBreakdown && (
                  <>
                    {paymentDetails?.baseAmount !== undefined &&
                      paymentDetails.baseAmount > 0 && (
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-muted-foreground">
                            Service Amount:
                          </span>
                          <span>${paymentDetails.baseAmount.toFixed(2)}</span>
                        </div>
                      )}

                    {(paymentBreakdown.deposit as number) > 0 && (
                      <div className="flex justify-between items-center text-xs mt-1">
                        <span className="text-muted-foreground">Deposit:</span>
                        <span>
                          ${(paymentBreakdown.deposit as number).toFixed(2)}
                        </span>
                      </div>
                    )}

                    {(paymentBreakdown.tips as number) > 0 && (
                      <div className="flex justify-between items-center text-xs mt-1">
                        <span className="text-muted-foreground">Tips:</span>
                        <span>
                          ${(paymentBreakdown.tips as number).toFixed(2)}
                        </span>
                      </div>
                    )}

                    {(paymentBreakdown.balance as number) > 0 && (
                      <div className="flex justify-between items-center text-xs mt-1">
                        <span className="text-muted-foreground">Balance:</span>
                        <span>
                          ${(paymentBreakdown.balance as number).toFixed(2)}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between items-center font-medium text-sm mt-2 pt-1 border-t border-border">
                      <span>Total:</span>
                      <span>
                        ${(paymentBreakdown.total as number).toFixed(2)}
                      </span>
                    </div>
                  </>
                )}

                <div className="flex justify-between items-center font-medium text-sm mt-1 text-primary">
                  <span>Max Refundable:</span>
                  <span>${maxRefundableAmount.toFixed(2)}</span>
                </div>

                {paymentDetails?.paymentMethod && (
                  <div className="text-xs text-muted-foreground mt-2">
                    Payment Method: {paymentDetails.paymentMethod}
                  </div>
                )}

                {paymentDetails?.isOnlinePayment === false && (
                  <div className="bg-blue-50 border border-blue-200 rounded p-2 mt-2 text-xs text-blue-800">
                    <p className="font-medium">Cash Payment Notice:</p>
                    <p>
                      Only the deposit can be refunded as it was charged online.
                      The service amount and tips were paid in cash.
                    </p>
                  </div>
                )}
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded p-2 mt-2 text-xs text-amber-800">
                <p className="font-medium">Important:</p>
                <p>
                  Professional is responsible for transaction fees. Client will
                  receive the exact refund amount specified.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="refundAmount">
                  Refund Amount (Max: ${maxRefundableAmount.toFixed(2)})
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="refundAmount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={maxRefundableAmount}
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  placeholder="Enter refund amount"
                  disabled={isSubmitting}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="refundReason">
                  Reason for Refund
                  <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="refundReason"
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="Please explain the reason for this refund..."
                  disabled={isSubmitting}
                  rows={3}
                  maxLength={500}
                  required
                />
                <div className="text-xs text-muted-foreground text-right">
                  {refundReason.length}/500 characters
                </div>
              </div>
            </form>
          </div>

          <DialogFooter className="flex-shrink-0 gap-2">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !refundAmount || !refundReason.trim()}
              className="flex items-center justify-center gap-2 min-w-[140px] bg-primary hover:bg-primary/90"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Initiate Refund
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
