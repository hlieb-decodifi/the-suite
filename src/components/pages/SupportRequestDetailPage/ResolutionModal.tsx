import React, { useState } from 'react';
import { CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { resolveSupportRequest } from '@/server/domains/support-requests/actions';

type ResolutionModalProps = {
  isOpen: boolean;
  onClose: () => void;
  supportRequestId: string;
  serviceName: string;
  onSuccess: () => void;
};

export const ResolutionModal: React.FC<ResolutionModalProps> = ({
  isOpen,
  onClose,
  supportRequestId,
  serviceName,
  onSuccess,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleResolve = async () => {
    try {
      setIsSubmitting(true);
      
      const result = await resolveSupportRequest({
        support_request_id: supportRequestId,
        resolution_notes: 'Support request has been resolved by the professional.',
      });

      if (result.success) {
        toast({
          title: 'Success',
          description: 'Support request has been resolved successfully.',
        });
        onSuccess();
        onClose();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to resolve support request.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error resolving support request:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Resolve Support Request
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to mark this support request as resolved? This action will close the conversation and notify the client.
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

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-800">
              <strong>What happens when you resolve this request:</strong>
            </p>
            <ul className="mt-2 text-sm text-green-700 space-y-1">
              <li>• The support request status will be changed to &quot;Resolved&quot;</li>
              <li>• A resolution message will be added to the conversation</li>
              <li>• The client will be notified of the resolution</li>
            </ul>
          </div>
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
            onClick={handleResolve}
            disabled={isSubmitting}
            className="min-w-[120px] bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {isSubmitting ? 'Resolving...' : 'Yes, Resolve'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
