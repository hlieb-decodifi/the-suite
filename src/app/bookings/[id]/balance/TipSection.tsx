'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { updateTipAction } from '@/server/domains/tips/actions';
import { formatCurrency } from '@/utils/formatCurrency';
import { DollarSign, Heart } from 'lucide-react';
import { useState } from 'react';

type TipSectionProps = {
  bookingId: string;
  professionalName: string;
  currentTipAmount: number;
  serviceAmount: number;
  isClient: boolean;
};

export function TipSection({
  bookingId,
  professionalName,
  currentTipAmount,
  serviceAmount,
  isClient,
}: TipSectionProps) {
  const [tipAmount, setTipAmount] = useState(currentTipAmount);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasChanged, setHasChanged] = useState(false);
  const { toast } = useToast();

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

  // For non-clients, just show the current tip amount
  if (!isClient) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Tip received:</span>
          <span className="font-medium">
            {formatCurrency(currentTipAmount)}
          </span>
        </div>
        {currentTipAmount > 0 && (
          <p className="text-xs text-muted-foreground">
            Thank you for the generous tip!
          </p>
        )}
      </div>
    );
  }

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
