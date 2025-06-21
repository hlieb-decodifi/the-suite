'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Calendar, Clock, DollarSign, User } from 'lucide-react';

type BalancePaymentContentProps = {
  booking: {
    id: string;
    booking_services?: Array<{
      id: string;
      price: number;
      duration: number;
      services: {
        name: string;
      };
    }>;
  };
  appointment: {
    date: string;
    start_time: string;
    end_time: string;
  };
  professional: {
    profession?: string | null;
    users: {
      first_name: string;
      last_name: string;
    };
  };
  payment: {
    amount: number;
    deposit_amount?: number;
    balance_amount: number;
    tip_amount?: number;
  };
};

export function BalancePaymentContent({
  booking,
  appointment,
  professional,
  payment,
}: BalancePaymentContentProps) {
  const [tipAmount, setTipAmount] = useState(payment.tip_amount || 0);
  const [customTip, setCustomTip] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const balanceAmount = payment.balance_amount;
  const totalDue = balanceAmount + tipAmount;

  const handleTipPreset = (amount: number) => {
    setTipAmount(amount);
    setCustomTip('');
  };

  const handleCustomTip = (value: string) => {
    setCustomTip(value);
    const amount = parseFloat(value) || 0;
    setTipAmount(amount);
  };

  const handlePayment = async () => {
    setIsProcessing(true);
    // TODO: Implement Stripe payment processing
    console.log('Processing payment:', { balanceAmount, tipAmount, totalDue });
    setIsProcessing(false);
  };

  // Calculate suggested tip amounts (15%, 18%, 20%)
  const originalAmount = payment.amount - (payment.deposit_amount ?? 0);
  const tipSuggestions = [
    Math.round(originalAmount * 0.15 * 100) / 100,
    Math.round(originalAmount * 0.18 * 100) / 100,
    Math.round(originalAmount * 0.2 * 100) / 100,
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Appointment Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Appointment Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <span className="text-sm">
                {new Date(appointment.date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-500" />
              <span className="text-sm">
                {appointment.start_time} - {appointment.end_time}
              </span>
            </div>
          </div>

          <div>
            <p className="font-medium">
              {professional.profession ||
                `${professional.users.first_name} ${professional.users.last_name}`}
            </p>
            <p className="text-sm text-gray-600">
              Professional Service Provider
            </p>
          </div>

          {/* Services */}
          {booking.booking_services && booking.booking_services.length > 0 && (
            <div>
              <p className="font-medium text-sm mb-2">Services:</p>
              <div className="space-y-1">
                {booking.booking_services.map((service, index: number) => (
                  <div
                    key={service.id || index}
                    className="flex justify-between text-sm"
                  >
                    <span>{service.services.name}</span>
                    <span>${service.price.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Payment Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Total Service Amount:</span>
              <span>${payment.amount.toFixed(2)}</span>
            </div>
            {payment.deposit_amount && payment.deposit_amount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Deposit Paid:</span>
                <span>-${payment.deposit_amount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-medium">
              <span>Outstanding Balance:</span>
              <span className="text-orange-600">
                ${balanceAmount.toFixed(2)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tip Section */}
      <Card>
        <CardHeader>
          <CardTitle>Add a Tip (Optional)</CardTitle>
          <p className="text-sm text-gray-600">
            Show your appreciation for great service
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Tip Presets */}
          <div className="grid grid-cols-3 gap-3">
            {tipSuggestions.map((amount, index) => {
              const percentage = [15, 18, 20][index];
              return (
                <Button
                  key={amount}
                  variant={tipAmount === amount ? 'default' : 'outline'}
                  onClick={() => handleTipPreset(amount)}
                  className="flex flex-col py-3 h-auto"
                >
                  <span className="text-sm">{percentage}%</span>
                  <span className="text-xs">${amount.toFixed(2)}</span>
                </Button>
              );
            })}
          </div>

          {/* Custom Tip */}
          <div className="space-y-2">
            <Label htmlFor="custom-tip">Custom Amount</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                $
              </span>
              <Input
                id="custom-tip"
                type="number"
                placeholder="0.00"
                value={customTip}
                onChange={(e) => handleCustomTip(e.target.value)}
                className="pl-8"
                min="0"
                step="0.01"
              />
            </div>
          </div>

          {tipAmount > 0 && (
            <div className="bg-green-50 p-3 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm text-green-700">Tip Amount:</span>
                <span className="font-medium text-green-700">
                  ${tipAmount.toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Total */}
      <Card className="border-2 border-purple-200 bg-purple-50">
        <CardContent className="p-4">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Balance Due:</span>
              <span>${balanceAmount.toFixed(2)}</span>
            </div>
            {tipAmount > 0 && (
              <div className="flex justify-between">
                <span>Tip:</span>
                <span>${tipAmount.toFixed(2)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between text-lg font-bold">
              <span>Total to Pay:</span>
              <span className="text-purple-600">${totalDue.toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Button */}
      <Button
        onClick={handlePayment}
        disabled={isProcessing}
        className="w-full py-3 text-lg bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
      >
        {isProcessing ? 'Processing...' : `Pay $${totalDue.toFixed(2)}`}
      </Button>

      <p className="text-xs text-gray-500 text-center">
        Your payment is secure and encrypted. You will receive a confirmation
        email once the payment is processed.
      </p>
    </div>
  );
}
