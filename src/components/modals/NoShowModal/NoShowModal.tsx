'use client';

import { useState } from 'react';
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
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, DollarSign } from 'lucide-react';
import { markNoShowAction } from '@/server/domains/bookings/actions';
import { useToast } from '@/components/ui/use-toast';

type NoShowModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  appointmentId: string;
  appointmentDate: string;
  clientName: string;
  serviceAmount: number;
};

export function NoShowModal({
  isOpen,
  onClose,
  onSuccess,
  appointmentId,
  appointmentDate,
  clientName,
  serviceAmount,
}: NoShowModalProps) {
  const [chargePercentage, setChargePercentage] = useState(50);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const chargeAmount = (serviceAmount * chargePercentage) / 100;

  const handleMarkNoShow = async () => {
    setIsProcessing(true);

    try {
      const result = await markNoShowAction(appointmentId, chargePercentage);

      if (result.success) {
        toast({
          title: 'No-Show Recorded',
          description:
            result.message ||
            'Appointment marked as no-show and client notified.',
        });
        onClose();
        onSuccess?.();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to mark appointment as no-show.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error marking no-show:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePercentageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.min(100, Math.max(0, Number(e.target.value)));
    setChargePercentage(value);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Mark as No-Show
          </DialogTitle>
          <DialogDescription>
            Mark this appointment with {clientName} on {appointmentDate} as a
            no-show. You can charge up to 100% of the service amount.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Service Amount:</span>
                  <span className="font-medium">
                    ${serviceAmount.toFixed(2)}
                  </span>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="charge-percentage">
                    Charge Percentage (0-100%)
                  </Label>
                  <Input
                    id="charge-percentage"
                    type="number"
                    min="0"
                    max="100"
                    value={chargePercentage}
                    onChange={handlePercentageChange}
                    className="w-full"
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="flex items-center gap-1 font-medium">
                    <DollarSign className="h-4 w-4" />
                    Charge Amount:
                  </span>
                  <span className="text-lg font-bold text-green-600">
                    ${chargeAmount.toFixed(2)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="text-sm text-muted-foreground bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="font-medium text-amber-800 mb-1">Important:</p>
            <ul className="list-disc list-inside space-y-1 text-amber-700">
              <li>
                The client will be charged this amount if they have a card on
                file
              </li>
              <li>Both you and the client will receive email notifications</li>
              <li>This action cannot be undone</li>
              <li>The appointment will be marked as cancelled</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>
            Cancel
          </Button>
          <Button onClick={handleMarkNoShow} disabled={isProcessing}>
            {isProcessing ? 'Processing...' : 'Mark as No-Show'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
