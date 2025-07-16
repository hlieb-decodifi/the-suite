'use client';

import { useState } from 'react';
import { Typography } from '@/components/ui/typography';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useToast } from '@/components/ui/use-toast';

import {
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  DollarSign,
  FileTextIcon,
  Heart,
  Star,
  User,
} from 'lucide-react';
import { ReviewSection } from './ReviewSection';
import { formatCurrency } from '@/utils/formatCurrency';
import { formatDuration } from '@/utils/formatDuration';
import { format } from 'date-fns';

type BalancePaymentContentProps = {
  booking: {
    id: string;
    booking_services?: Array<{
      id: string;
      price: number;
      duration: number;
      services: {
        name: string;
        description?: string | null;
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
    service_fee?: number;
    status: string;
    requires_balance_payment: boolean;
    payment_methods?: {
      name: string;
      is_online: boolean;
    };
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
  const [detailsOpen, setDetailsOpen] = useState(false);

  const balanceAmount = payment.balance_amount;
  const totalDue = balanceAmount + tipAmount;

  // Check if this is a cash payment (completed status, no balance requirement)
  const isCashPayment =
    payment.status === 'completed' && !payment.requires_balance_payment;

  // Combine date and time for proper Date objects
  const startDate = new Date(`${appointment.date}T${appointment.start_time}`);
  const endDate = new Date(`${appointment.date}T${appointment.end_time}`);

  const { toast } = useToast();

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

    try {
      if (isCashPayment) {
        // For cash payments, only process tip
        const { processCashPaymentTip } = await import(
          '@/server/domains/stripe-payments/balance-payment-actions'
        );
        const result = await processCashPaymentTip(booking.id, tipAmount);

        if (!result.success) {
          throw new Error(result.error || 'Tip processing failed');
        }

        // Tip successful
        toast({
          title: 'Tip submitted successfully!',
          description: `$${result.tipProcessed?.toFixed(
            2,
          )} will be sent to your professional.`,
        });
      } else {
        // For card payments, process balance payment
        const { processBalancePayment } = await import(
          '@/server/domains/stripe-payments/balance-payment-actions'
        );
        const result = await processBalancePayment(booking.id, tipAmount);

        if (!result.success) {
          throw new Error(result.error || 'Payment failed');
        }

        // Payment successful
        toast({
          title: 'Payment successful!',
          description: `$${result.capturedAmount?.toFixed(
            2,
          )} has been charged.`,
        });
      }

      // Refresh the page to show updated status
      window.location.reload();
    } catch (error) {
      console.error('Payment/tip error:', error);
      toast({
        variant: 'destructive',
        title: `${isCashPayment ? 'Tip processing' : 'Payment'} failed`,
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Calculate suggested tip amounts (15%, 18%, 20%)
  const services = booking.booking_services || [];
  const serviceAmount =
    services.length > 0
      ? services.reduce((sum, service) => sum + service.price, 0)
      : payment.amount - (payment.service_fee || 0);
  const tipSuggestions = [
    Math.round(serviceAmount * 0.15 * 100) / 100,
    Math.round(serviceAmount * 0.18 * 100) / 100,
    Math.round(serviceAmount * 0.2 * 100) / 100,
  ];

  // Get professional name
  const professionalName = `${professional.users.first_name} ${professional.users.last_name}`;

  return (
    <div className="space-y-6">
      {/* SECTION 1: Combined Professional, Services, and Payment Info */}
      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-muted rounded-full">
                <User className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <Typography className="font-semibold text-xl">
                  {professionalName}
                </Typography>
                <Typography className="text-muted-foreground">
                  Professional Service Provider
                </Typography>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <Typography className="font-medium">
                  {format(startDate, 'EEEE, MMMM d, yyyy')}
                </Typography>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <Typography className="font-medium">
                  {format(startDate, 'h:mm a')} - {format(endDate, 'h:mm a')}
                </Typography>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="border-t p-0">
          <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
            <div className="flex justify-center p-2">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full text-sm">
                  {detailsOpen ? (
                    <>
                      <ChevronUp className="mr-2 h-4 w-4" /> Hide Appointment
                      Details
                    </>
                  ) : (
                    <>
                      <ChevronDown className="mr-2 h-4 w-4" /> Show Appointment
                      Details
                    </>
                  )}
                </Button>
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent className="px-6 pb-6">
              <div className="grid grid-cols-1 gap-x-8 gap-y-6 lg:grid-cols-2">
                {/* Column 1: Services Booked */}
                <div className="space-y-4">
                  <Typography
                    variant="h3"
                    className="text-lg flex items-center gap-2"
                  >
                    <FileTextIcon className="h-5 w-5 text-muted-foreground" />
                    Services Booked
                  </Typography>
                  {(() => {
                    const services = booking.booking_services || [];
                    return (
                      <div className="space-y-4">
                        {services.map((service, index) => (
                          <div
                            key={service.id || index}
                            className="flex items-start justify-between border-b border-border py-3 last:border-b-0"
                          >
                            <div className="mr-4 flex-1">
                              <Typography className="font-medium">
                                {service.services.name}
                              </Typography>
                              <div className="mt-2 flex items-center gap-4">
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3 text-muted-foreground" />
                                  <Typography
                                    variant="small"
                                    className="text-muted-foreground"
                                  >
                                    {formatDuration(service.duration)}
                                  </Typography>
                                </div>
                                {service.services.description && (
                                  <Typography
                                    variant="small"
                                    className="line-clamp-1 text-muted-foreground"
                                  >
                                    {service.services.description}
                                  </Typography>
                                )}
                              </div>
                            </div>
                            <Typography className="font-semibold">
                              {formatCurrency(service.price)}
                            </Typography>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>

                {/* Column 2: Payment Summary */}
                <div className="space-y-4">
                  <Typography
                    variant="h3"
                    className="text-lg flex items-center gap-2"
                  >
                    <DollarSign className="h-5 w-5 text-muted-foreground" />
                    {isCashPayment ? 'Payment Completed' : 'Payment Summary'}
                  </Typography>

                  {(() => {
                    const services = booking.booking_services || [];
                    const servicesSubtotal =
                      services.length > 0
                        ? services.reduce(
                            (sum, service) => sum + service.price,
                            0,
                          )
                        : payment.amount - (payment.service_fee || 0);
                    const serviceFee = payment.service_fee || 0;
                    const totalTips = payment.tip_amount || 0;

                    return (
                      <div className="flex flex-col space-y-4">
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center justify-between">
                            <Typography className="text-muted-foreground">
                              Services Subtotal
                            </Typography>
                            <Typography className="font-medium">
                              {formatCurrency(servicesSubtotal)}
                            </Typography>
                          </div>
                          <div className="flex items-center justify-between">
                            <Typography className="text-muted-foreground">
                              Platform Fee
                            </Typography>
                            <Typography className="font-medium">
                              {formatCurrency(serviceFee)}
                            </Typography>
                          </div>
                          {totalTips > 0 && (
                            <div className="flex items-center justify-between">
                              <Typography className="text-muted-foreground">
                                Tips
                              </Typography>
                              <Typography className="font-medium">
                                {formatCurrency(totalTips)}
                              </Typography>
                            </div>
                          )}
                        </div>

                        <div className="border-t border-border pt-4">
                          {Boolean(
                            payment.deposit_amount &&
                              payment.deposit_amount > 0,
                          ) && (
                            <>
                              <div className="mb-2 flex items-center justify-between">
                                <Typography className="font-medium">
                                  Total Amount
                                </Typography>
                                <Typography className="font-medium">
                                  {formatCurrency(payment.amount + totalTips)}
                                </Typography>
                              </div>
                              <div className="mb-3 flex items-center justify-between text-green-600">
                                <Typography className="text-sm">
                                  Deposit Paid
                                </Typography>
                                <Typography className="font-medium">
                                  -{formatCurrency(payment.deposit_amount || 0)}
                                </Typography>
                              </div>
                            </>
                          )}

                          {isCashPayment ? (
                            <div className="rounded-lg border bg-muted/50 p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
                                  <Typography className="font-semibold text-foreground">
                                    Paid in{' '}
                                    {payment.payment_methods?.name || 'Cash'}
                                  </Typography>
                                </div>
                                <Typography className="text-lg font-bold text-foreground">
                                  {formatCurrency(payment.amount)}
                                </Typography>
                              </div>
                            </div>
                          ) : (
                            <div className="rounded-lg border bg-muted/50 p-4">
                              <div className="flex items-center justify-between">
                                <Typography className="font-semibold">
                                  Outstanding Balance
                                </Typography>
                                <Typography className="text-xl font-bold">
                                  {formatCurrency(balanceAmount)}
                                </Typography>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>

      {/* SECTION 2: Tip and Review */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left Column - Add a Tip */}
        <div className="h-full">
          <Card className="shadow-sm h-full flex flex-col">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Heart className="h-5 w-5 text-muted-foreground" />
                Add a Tip
              </CardTitle>
              <Typography className="text-muted-foreground text-sm">
                Show your appreciation for exceptional service
              </Typography>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <div className="space-y-4 flex-1">
                {/* Quick Tip Buttons */}
                <div>
                  <Typography
                    variant="small"
                    className="text-muted-foreground mb-3 font-medium"
                  >
                    Quick suggestions:
                  </Typography>
                  <div className="grid grid-cols-3 gap-2">
                    {tipSuggestions.map((amount, index) => {
                      const percentage = [15, 18, 20][index];
                      return (
                        <Button
                          key={amount}
                          variant={tipAmount === amount ? 'default' : 'outline'}
                          onClick={() => handleTipPreset(amount)}
                          className="flex flex-col py-3 h-auto"
                          size="sm"
                        >
                          <Typography variant="small" className="font-semibold">
                            {percentage}%
                          </Typography>
                          <Typography variant="small" className="opacity-80">
                            {formatCurrency(amount)}
                          </Typography>
                        </Button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Tip Input */}
                <div>
                  <Label
                    htmlFor="custom-tip"
                    className="text-sm font-medium mb-2 block"
                  >
                    Custom amount:
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground font-medium">
                      $
                    </span>
                    <Input
                      id="custom-tip"
                      type="number"
                      placeholder="0.00"
                      value={customTip}
                      onChange={(e) => handleCustomTip(e.target.value)}
                      className="pl-8 text-center"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>

                {/* Tip Preview */}
                {tipAmount > 0 && (
                  <div className="bg-muted/50 border border-border rounded-lg p-3">
                    <div className="flex justify-between items-center">
                      <Typography className="font-medium">
                        Tip Amount
                      </Typography>
                      <Typography className="font-semibold text-lg">
                        {formatCurrency(tipAmount)}
                      </Typography>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons - Always at bottom */}
              <div className="mt-auto pt-4">
                {!isCashPayment && (
                  <div className="space-y-3">
                    <div className="text-center">
                      <Typography
                        variant="small"
                        className="text-muted-foreground"
                      >
                        Total to Pay
                      </Typography>
                      <Typography className="font-bold text-2xl">
                        {formatCurrency(totalDue)}
                      </Typography>
                    </div>

                    <Button
                      onClick={handlePayment}
                      disabled={isProcessing}
                      className="w-full"
                      size="lg"
                    >
                      {isProcessing
                        ? 'Processing...'
                        : `Pay ${formatCurrency(totalDue)}`}
                    </Button>

                    <Typography
                      variant="small"
                      className="text-center text-muted-foreground"
                    >
                      Secure & encrypted payment
                    </Typography>
                  </div>
                )}

                {isCashPayment && (
                  <div className="space-y-3">
                    {tipAmount > 0 ? (
                      <>
                        <div className="space-y-1">
                          <Typography
                            variant="small"
                            className="text-center text-muted-foreground"
                          >
                            Direct to your professional
                          </Typography>
                          <Button
                            onClick={handlePayment}
                            disabled={isProcessing}
                            className="w-full"
                          >
                            {isProcessing
                              ? 'Processing...'
                              : `Submit Tip ${formatCurrency(tipAmount)}`}
                          </Button>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-4">
                        <Typography className="text-muted-foreground">
                          Select a tip amount above to continue
                        </Typography>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Leave a Review */}
        <div className="h-full">
          <Card className="shadow-sm h-full flex flex-col">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Star className="h-5 w-5 text-muted-foreground" />
                Leave a Review
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
              <ReviewSection
                bookingId={booking.id}
                professionalName={professionalName}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
