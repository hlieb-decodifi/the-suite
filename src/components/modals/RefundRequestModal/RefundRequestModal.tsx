'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';

export type RefundRequestModalProps = {
  isOpen: boolean;
  onClose: () => void;
  appointmentId: string;
  serviceName: string;
  totalAmount: number;
  onSuccess: () => void;
};

export function RefundRequestModal({
  isOpen,
  onClose,
  appointmentId,
  serviceName,
  totalAmount,
  onSuccess,
}: RefundRequestModalProps) {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reason.trim()) {
      toast({
        variant: 'destructive',
        title: 'Reason required',
        description: 'Please provide a reason for your refund request.',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Refunds are now handled through support requests
      // Redirect to create a support request instead
      const { createSupportRequest } = await import(
        '@/server/domains/support-requests/client-actions'
      );
      const result = await createSupportRequest({
        appointment_id: appointmentId,
        reason: `Refund request: ${reason.trim()}`,
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to create refund request');
      }

      toast({
        title: 'Support request submitted',
        description:
          'Your refund request has been created as a support request. You can track its progress in the Support Requests section.',
      });

      onSuccess();
      onClose();
      setReason('');
    } catch (error) {
      console.error('Error creating refund request:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to submit request',
        description:
          error instanceof Error ? error.message : 'Please try again later.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
      setReason('');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary" />
            Request Refund
          </DialogTitle>
          <DialogDescription>
            Submit a refund request for your completed appointment. The
            professional will review your request.
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
                Amount:
              </span>
              <span className="text-sm font-semibold">
                ${totalAmount.toFixed(2)}
              </span>
            </div>
          </div>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              Refund requests are subject to professional approval. Processing
              may take 3-5 business days.
            </AlertDescription>
          </Alert>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reason">
                Reason for refund request{' '}
                <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="reason"
                placeholder="Please explain why you are requesting a refund..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={isSubmitting}
                rows={4}
                maxLength={500}
                required
              />
              <div className="text-xs text-muted-foreground text-right">
                {reason.length}/500 characters
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
            disabled={isSubmitting || !reason.trim()}
            className="min-w-[120px]"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Request'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
