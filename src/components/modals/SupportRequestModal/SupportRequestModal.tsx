'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { AlertTriangle, MessageSquare, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { createSupportRequestAction } from '@/server/domains/support-requests/server-actions';
import { useRouter } from 'next/navigation';

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
  const [success, setSuccess] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
      setReason('');
      setSuccess(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!reason.trim()) {
      return;
    }

    setIsSubmitting(true);
    setSuccess(false);

    try {
      const result = await createSupportRequestAction({
        appointment_id: appointmentId,
        reason: reason.trim(),
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to create support request');
      }

      // Show success state
      setSuccess(true);
      
      // Show success toast
      toast({
        title: 'Support request submitted',
        description: 'Your support request has been sent to the professional.',
        variant: 'default',
      });
      
      // Call onSuccess callback
      onSuccess();
      
      // Navigate to the created support request after a brief delay
      // This gives the user a chance to see the success message
      setTimeout(() => {
        if (result.supportRequestId) {
          window.location.href = `/support-request/${result.supportRequestId}`;
        } else {
          // If no ID is returned, just refresh the page
          router.refresh();
          handleClose();
        }
      }, 1500);
    } catch (err) {
      console.error('Error creating support request:', err);
      
      toast({
        title: 'Failed to submit request',
        description: err instanceof Error ? err.message : 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
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

        {success ? (
          <div className="space-y-4">
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mb-4">
                <Check className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-lg font-medium">Support Request Created</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Your request has been submitted successfully. You will be redirected to the conversation shortly.
              </p>
            </div>
          </div>
        ) : (
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
                  name="reason"
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
              
              <div className="flex justify-end gap-2 mt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
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
              </div>
            </form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}