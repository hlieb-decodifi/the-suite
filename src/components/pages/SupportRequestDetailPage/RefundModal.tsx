import React, { useState } from 'react';
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
  const [refundAmount, setRefundAmount] = useState(originalAmount.toString());
  const [refundReason, setRefundReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const amount = parseFloat(refundAmount);
    if (isNaN(amount) || amount <= 0 || amount > originalAmount) {
      toast({
        title: 'Invalid Amount',
        description: `Refund amount must be between $0.01 and $${originalAmount.toFixed(2)}`,
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
      
      // Create FormData for the server action
      const formData = new FormData();
      formData.append('support_request_id', supportRequestId);
      formData.append('refund_amount', amount.toString());
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
    setRefundAmount(originalAmount.toString());
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
                  Please wait while we process your refund request with the payment provider. 
                  This may take a moment.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Initiate Refund
          </DialogTitle>
          <DialogDescription>
            Process a refund for this support request. The refund will be processed according to your payment provider&apos;s terms.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Service Information */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-muted-foreground">
                Service:
              </span>
              <span className="text-sm font-semibold">{serviceName}</span>
            </div>
            
            {/* Payment Breakdown */}
            <div className="pt-2 border-t border-border mt-2">
              <h4 className="text-sm font-medium mb-2">Payment Breakdown</h4>
              
              {paymentDetails?.baseAmount !== undefined && (
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Service Amount:</span>
                  <span>${paymentDetails.baseAmount.toFixed(2)}</span>
                </div>
              )}
              
              {paymentDetails?.depositAmount !== undefined && paymentDetails.depositAmount > 0 && (
                <div className="flex justify-between items-center text-xs mt-1">
                  <span className="text-muted-foreground">Deposit:</span>
                  <span>${paymentDetails.depositAmount.toFixed(2)}</span>
                </div>
              )}
              
              {paymentDetails?.tipAmount !== undefined && paymentDetails.tipAmount > 0 && (
                <div className="flex justify-between items-center text-xs mt-1">
                  <span className="text-muted-foreground">Tip:</span>
                  <span>${paymentDetails.tipAmount.toFixed(2)}</span>
                </div>
              )}
              
              {paymentDetails?.serviceFee !== undefined && paymentDetails.serviceFee > 0 && (
                <div className="flex justify-between items-center text-xs mt-1">
                  <span className="text-muted-foreground">Service Fee:</span>
                  <span>${paymentDetails.serviceFee.toFixed(2)}</span>
                </div>
              )}
              
              <div className="flex justify-between items-center font-medium text-sm mt-2 pt-1 border-t border-border">
                <span>Total Paid:</span>
                <span>${originalAmount.toFixed(2)}</span>
              </div>
              
              {paymentDetails?.paymentMethod && (
                <div className="text-xs text-muted-foreground mt-2">
                  Payment Method: {paymentDetails.paymentMethod}
                </div>
              )}
            </div>
            
            <div className="bg-amber-50 border border-amber-200 rounded p-2 mt-2 text-xs text-amber-800">
              <p className="font-medium">Important:</p>
              <p>Professional is responsible for transaction fees. Client will receive the exact refund amount specified.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="refundAmount">
                Refund Amount (Max: ${originalAmount.toFixed(2)})
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="refundAmount"
                type="number"
                step="0.01"
                min="0.01"
                max={originalAmount}
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

        <DialogFooter className="gap-2">
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
            className="min-w-[140px] bg-primary hover:bg-primary/90"
          >
            Initiate Refund
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
};
