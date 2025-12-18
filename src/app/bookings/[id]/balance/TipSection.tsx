'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import {
  updateTipAction,
  createPostAppointmentTipAction,
} from '@/server/domains/tips/actions';
import type { DetailedAppointmentType } from '@/components/pages/BookingDetailPage/BookingDetailPage';
import { formatCurrency } from '@/utils/formatCurrency';
import { DollarSign, Heart } from 'lucide-react';
import { useState } from 'react';

type PostAppointmentTip = DetailedAppointmentType['bookings']['tips'][0];

type TipSectionProps = {
  bookingId: string;
  professionalName: string;
  currentTipAmount: number;
  postAppointmentTips?: PostAppointmentTip[];
  serviceAmount: number;
  isClient: boolean;
  professionalId?: string | undefined;
  clientId?: string | undefined;
  isCompletedAppointment?: boolean; // New prop to distinguish contexts
};

export function TipSection({
  bookingId,
  professionalName,
  currentTipAmount,
  postAppointmentTips = [],
  serviceAmount,
  isClient,
  professionalId,
  clientId,
  isCompletedAppointment = false,
}: TipSectionProps) {
  const [tipAmount, setTipAmount] = useState(currentTipAmount);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasChanged, setHasChanged] = useState(false);
  const [newTipAmount, setNewTipAmount] = useState(0);
  const [isAddingNewTip, setIsAddingNewTip] = useState(false);
  const { toast } = useToast();

  // Calculate total tips from post-appointment tips
  const totalPostAppointmentTips = postAppointmentTips.reduce(
    (sum, tip) => sum + tip.amount,
    0,
  );
  const totalAllTips = currentTipAmount + totalPostAppointmentTips;

  // Calculate suggested tip amounts (15%, 18%, 20%)
  const tipSuggestions = [
    Math.round(serviceAmount * 0.15 * 100) / 100,
    Math.round(serviceAmount * 0.18 * 100) / 100,
    Math.round(serviceAmount * 0.2 * 100) / 100,
  ];

  const handleTipChange = (newTipAmount: number) => {
    setTipAmount(newTipAmount);
    setHasChanged(newTipAmount !== currentTipAmount);
  };

  const handleCustomTipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value === '' ? 0 : Number(e.target.value);
    if (value >= 0) {
      handleTipChange(value);
    }
  };

  const handleSubmitTip = async () => {
    setIsSubmitting(true);

    try {
      const result = await updateTipAction(bookingId, tipAmount);

      if (!result.success) {
        throw new Error(result.error || 'Failed to update tip');
      }

      toast({
        title: 'Tip updated successfully!',
        description: `${formatCurrency(tipAmount)} tip ${tipAmount > currentTipAmount ? 'added' : 'updated'} for ${professionalName}.`,
      });

      setHasChanged(false);
      // Refresh the page to show updated tip amount
      window.location.reload();
    } catch (error) {
      console.error('Tip update error:', error);
      toast({
        variant: 'destructive',
        title: 'Tip update failed',
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddNewTip = async () => {
    if (!professionalId || !clientId || newTipAmount <= 0) return;

    setIsSubmitting(true);

    try {
      const result = await createPostAppointmentTipAction(
        bookingId,
        newTipAmount,
      );

      if (!result.success) {
        throw new Error(result.error || 'Failed to create tip');
      }

      if (result.checkoutUrl) {
        // Redirect to Stripe checkout
        window.location.href = result.checkoutUrl;
      } else {
        toast({
          title: 'Tip processed!',
          description: `${formatCurrency(newTipAmount)} tip added successfully.`,
        });

        setNewTipAmount(0);
        setIsAddingNewTip(false);
        // Refresh the page to show new tip
        window.location.reload();
      }
    } catch (error) {
      console.error('New tip creation error:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to add tip',
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // For non-clients, show all tips received
  if (!isClient) {
    return (
      <div className="space-y-4">
        {/* Original booking tip */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Original tip:</span>
          <span className="font-medium">
            {formatCurrency(currentTipAmount)}
          </span>
        </div>

        {/* Post-appointment tips */}
        {postAppointmentTips.length > 0 && (
          <div className="space-y-2">
            <span className="text-sm text-muted-foreground">
              Additional tips:
            </span>
            {postAppointmentTips.map((tip) => (
              <div
                key={tip.id}
                className="flex items-center justify-between text-sm bg-green-50 p-2 rounded"
              >
                <span>{formatCurrency(tip.amount)}</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(tip.created_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Total tips */}
        <div className="flex items-center gap-2 pt-2 border-t">
          <span className="text-sm font-medium">Total tips received:</span>
          <span className="font-bold text-green-600">
            {formatCurrency(totalAllTips)}
          </span>
        </div>

        {totalAllTips > 0 && (
          <p className="text-xs text-muted-foreground">
            Thank you for the generous tips!
          </p>
        )}
      </div>
    );
  }

  // For completed appointments, show only post-appointment tip functionality
  if (isCompletedAppointment) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Heart className="h-4 w-4 text-red-500" />
          <span className="text-sm text-muted-foreground">
            Show your appreciation to {professionalName}
          </span>
        </div>

        {/* Show original tip if there was one */}
        {currentTipAmount > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">
                Original tip: {formatCurrency(currentTipAmount)}
              </span>
            </div>
          </div>
        )}

        {/* Show existing post-appointment tips */}
        {postAppointmentTips.length > 0 && (
          <div className="space-y-2 mb-4">
            <span className="text-sm font-medium">Additional tips given:</span>
            {postAppointmentTips.map((tip) => (
              <div
                key={tip.id}
                className="flex items-center justify-between text-sm bg-blue-50 p-2 rounded"
              >
                <span>{formatCurrency(tip.amount)}</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(tip.created_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Add new tip section */}
        {!isAddingNewTip ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAddingNewTip(true)}
            className="w-full"
          >
            <Heart className="h-4 w-4 mr-2" />
            {postAppointmentTips.length > 0 ? 'Add Another Tip' : 'Add Tip'}
          </Button>
        ) : (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="new-tip">Tip amount:</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="new-tip"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={newTipAmount === 0 ? '' : newTipAmount.toString()}
                  onChange={(e) => {
                    const value =
                      e.target.value === '' ? 0 : Number(e.target.value);
                    if (value >= 0) setNewTipAmount(value);
                  }}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleAddNewTip}
                disabled={isSubmitting || newTipAmount <= 0}
                size="sm"
                className="flex-1"
              >
                {isSubmitting ? 'Processing...' : 'Add Tip'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsAddingNewTip(false);
                  setNewTipAmount(0);
                }}
                size="sm"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Total tips display */}
        {(currentTipAmount > 0 || postAppointmentTips.length > 0) && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Total tips given:</span>
              <span className="font-bold text-green-600">
                {formatCurrency(totalAllTips)}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Original balance payment flow UI
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Heart className="h-4 w-4 text-red-500" />
        <span className="text-sm text-muted-foreground">
          Show your appreciation to {professionalName}
        </span>
      </div>

      {/* Current tip amount */}
      {currentTipAmount > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-green-800">
              Current tip: {formatCurrency(currentTipAmount)}
            </span>
          </div>
        </div>
      )}

      {/* Suggested tip buttons */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Quick tip amounts:</Label>
        <div className="grid grid-cols-3 gap-2">
          {tipSuggestions.map((suggestion, index) => {
            const percentage = [15, 18, 20][index];
            return (
              <Button
                key={suggestion}
                variant={tipAmount === suggestion ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleTipChange(suggestion)}
                className="text-xs"
              >
                {percentage}% ({formatCurrency(suggestion)})
              </Button>
            );
          })}
        </div>
      </div>

      {/* Custom tip amount */}
      <div className="space-y-2">
        <Label htmlFor="custom-tip">Custom amount:</Label>
        <div className="relative">
          <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="custom-tip"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={tipAmount === 0 ? '' : tipAmount.toString()}
            onChange={handleCustomTipChange}
            className="pl-10"
          />
        </div>
      </div>

      {/* Submit button */}
      {hasChanged && (
        <Button
          onClick={handleSubmitTip}
          disabled={isSubmitting}
          className="w-full bg-primary hover:bg-primary/90"
        >
          {isSubmitting
            ? 'Updating...'
            : `${tipAmount > currentTipAmount ? 'Add' : 'Update'} Tip`}
        </Button>
      )}

      {tipAmount === 0 && currentTipAmount === 0 && (
        <p className="text-xs text-muted-foreground text-center">
          Tips are optional but greatly appreciated by professionals
        </p>
      )}
    </div>
  );
}
