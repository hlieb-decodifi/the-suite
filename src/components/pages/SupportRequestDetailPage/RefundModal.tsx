import React, { useState } from 'react';
import { DollarSign } from 'lucide-react';
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
import { initiateRefund } from '@/server/domains/support-requests/actions';

type RefundModalProps = {
  isOpen: boolean;
  onClose: () => void;
  supportRequestId: string;
  originalAmount: number;
  serviceName: string;
  onSuccess: () => void;
};

export const RefundModal: React.FC<RefundModalProps> = ({
  isOpen,
  onClose,
  supportRequestId,
  originalAmount,
  serviceName,
  onSuccess,
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
      const result = await initiateRefund({
        support_request_id: supportRequestId,
        refund_amount: amount,
        professional_notes: refundReason.trim(),
      });

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
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-muted-foreground">
                Original Amount:
              </span>
              <span className="text-sm font-semibold">${originalAmount.toFixed(2)}</span>
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
            className="min-w-[120px] bg-primary hover:bg-primary/90"
          >
            {isSubmitting ? 'Processing...' : 'Initiate Refund'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
