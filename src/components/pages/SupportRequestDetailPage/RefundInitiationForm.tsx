import React, { useState } from 'react';
import { AlertTriangle, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Typography } from '@/components/ui/typography';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { initiateRefund } from '@/server/domains/support-requests/actions';

type RefundInitiationFormProps = {
  supportRequestId: string;
  totalAmount: number;
  isProfessional: boolean;
  onRefundInitiated: () => void;
};

export const RefundInitiationForm: React.FC<RefundInitiationFormProps> = ({
  supportRequestId,
  totalAmount,
  isProfessional,
  onRefundInitiated,
}) => {
  const [refundAmount, setRefundAmount] = useState(totalAmount.toString());
  const [refundReason, setRefundReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const { toast } = useToast();

  if (!isProfessional) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const amount = parseFloat(refundAmount);
    if (isNaN(amount) || amount <= 0 || amount > totalAmount) {
      toast({
        title: 'Invalid Amount',
        description: `Refund amount must be between $0.01 and $${totalAmount.toFixed(2)}`,
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
        setShowForm(false);
        onRefundInitiated();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to initiate refund',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
      console.error('Refund initiation error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!showForm) {
    return (
      <Card className="border-orange-200 bg-orange-50">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center text-orange-700">
            <DollarSign className="h-5 w-5 mr-2" />
            Refund Options
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Typography className="text-sm text-orange-600">
            If this request is regarding a refund, you can initiate the refund process below.
          </Typography>
          <div className="flex items-center justify-between">
            <Typography className="text-sm font-medium">
              Appointment Amount: ${totalAmount.toFixed(2)}
            </Typography>
            <Button
              onClick={() => setShowForm(true)}
              variant="outline"
              className="border-orange-300 text-orange-700 hover:bg-orange-100"
            >
              Initiate Refund
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center text-orange-700">
          <AlertTriangle className="h-5 w-5 mr-2" />
          Initiate Refund
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="refundAmount" className="text-sm font-medium">
              Refund Amount (Max: ${totalAmount.toFixed(2)})
            </Label>
            <Input
              id="refundAmount"
              type="number"
              step="0.01"
              min="0.01"
              max={totalAmount}
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
              placeholder="Enter refund amount"
              className="border-orange-300 focus:border-orange-500"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="refundReason" className="text-sm font-medium">
              Reason for Refund
            </Label>
            <Textarea
              id="refundReason"
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              placeholder="Please explain the reason for this refund..."
              className="border-orange-300 focus:border-orange-500 min-h-[80px]"
              required
            />
          </div>

          <div className="flex gap-3">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              {isSubmitting ? 'Processing...' : 'Initiate Refund'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowForm(false)}
              disabled={isSubmitting}
              className="border-gray-300"
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
