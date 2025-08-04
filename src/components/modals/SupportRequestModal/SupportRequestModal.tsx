'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { AlertTriangle, MessageSquare } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';

export type SupportRequestModalProps = {
  isOpen: boolean;
  onClose: () => void;
  appointmentId: string;
  serviceName: string;
  onSuccess: () => void;
};

export function SupportRequestModal({
  isOpen,
  onClose,
  appointmentId,
  serviceName,
  onSuccess,
}: SupportRequestModalProps) {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reason.trim()) {
      toast({
        variant: 'destructive',
        title: 'Reason required',
        description: 'Please provide a reason for your support request.',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { createSupportRequest } = await import(
        '@/server/domains/support-requests/actions'
      );
      const result = await createSupportRequest({
        appointment_id: appointmentId,
        reason: reason.trim(),
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to create support request');
      }

      toast({
        title: 'Support request submitted',
        description:
          'Your support request has been sent to the professional. You can discuss the details through the conversation.',
      });

      onSuccess();
      onClose();
      setReason('');

      // Navigate to the created support request
      if (result.supportRequestId) {
        window.location.href = `/support-request/${result.supportRequestId}`;
      }
    } catch (error) {
      console.error('Error creating support request:', error);
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
            <MessageSquare className="h-5 w-5 text-primary" />
            Create Support Request
          </DialogTitle>
          <DialogDescription>
            Submit a support request to discuss any issues with your appointment.
            You'll be able to communicate directly with the professional.
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
          </div>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              Your support request will start a conversation with the professional.
              They will review your request and help resolve any issues.
            </AlertDescription>
          </Alert>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reason">
                Describe your issue{' '}
                <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="reason"
                placeholder="Please describe the issue you're experiencing..."
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
                <MessageSquare className="h-4 w-4 mr-2 animate-pulse" />
                Creating...
              </>
            ) : (
              'Create Request'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
