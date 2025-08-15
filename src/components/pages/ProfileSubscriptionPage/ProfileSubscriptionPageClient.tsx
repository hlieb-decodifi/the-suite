'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Typography } from '@/components/ui/typography';
import { toast } from '@/components/ui/use-toast';
import type { SubscriptionPlan } from '@/server/domains/subscriptions/db';
import type { UserData } from './ProfileSubscriptionPage';
import { cn } from '@/utils';
import {
  AlertTriangle,
  Calendar,
  Check,
  CheckCircle2,
  Circle,
  CreditCard,
  Crown,
  ExternalLink,
  PauseCircle,
} from 'lucide-react';
import {
  handleSubscriptionRedirectAction,
  handleStripeConnectRedirectAction,
  handleCancelSubscriptionRedirectAction,
} from './ProfileSubscriptionPage';

type ConnectStatus = {
  isConnected: boolean;
  accountId?: string;
  connectStatus?: string;
} | null;

export type ProfileSubscriptionPageClientProps = {
  userData: UserData;
  plans: SubscriptionPlan[];
  connectStatus: ConnectStatus;
  searchParams: { [key: string]: string | string[] | undefined };
};

export function ProfileSubscriptionPageClient({
  userData,
  plans,
  connectStatus,
  searchParams = {},
}: ProfileSubscriptionPageClientProps) {
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const router = useRouter();
  const toastsShown = useRef<Set<string>>(new Set());

  // Handle success messages as toasts
  useEffect(() => {
    const successAction =
      typeof searchParams.success === 'string'
        ? searchParams.success
        : undefined;
    const isStripeReturn = searchParams.stripe_return === 'true';
    const isRefresh = searchParams.refresh === 'true';
    const isCompleted = searchParams.completed === 'true';
    const message =
      typeof searchParams.message === 'string'
        ? decodeURIComponent(searchParams.message)
        : undefined;
    const showConnectSuccess =
      isStripeReturn && connectStatus?.connectStatus === 'complete';

    // Create a unique key for this set of parameters to prevent duplicate toasts
    const paramsKey = `${successAction}-${isStripeReturn}-${isRefresh}-${connectStatus?.connectStatus}`;

    // Check if we've already shown toasts for these parameters
    if (toastsShown.current.has(paramsKey)) {
      return;
    }

    let shouldClearParams = false;

    if (successAction === 'subscription') {
      toast({
        title: 'Subscription Activated!',
        description:
          'Your subscription has been activated. You now have access to professional features.',
      });

      // Show Stripe Connect modal if not connected
      if (!connectStatus || connectStatus.connectStatus !== 'complete') {
        setShowConnectModal(true);
      }

      shouldClearParams = true;
    }

    if (showConnectSuccess) {
      toast({
        title: 'Stripe Account Connected!',
        description:
          'Your Stripe account has been connected. You can now receive payments from clients.',
      });
      shouldClearParams = true;
    }

    if (isStripeReturn && !showConnectSuccess && isCompleted) {
      toast({
        title: 'Setup in Progress',
        description:
          'Your Stripe setup is still being processed. This may take a few minutes to complete.',
        variant: 'default',
      });
      shouldClearParams = true;
    }

    if (isRefresh && message) {
      toast({
        title: 'Setup Required',
        description: message,
        variant: 'default',
      });
      shouldClearParams = true;
    }

    if (successAction === 'cancel') {
      toast({
        title: 'Subscription Cancellation Scheduled',
        description:
          'Your subscription has been scheduled to cancel at the end of your current billing period. You will continue to have access until then.',
        variant: 'default',
      });
      shouldClearParams = true;
    }

    // Mark this combination as shown
    if (shouldClearParams) {
      toastsShown.current.add(paramsKey);

      // Clear the success parameters to prevent repeated notifications
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('success');
      newUrl.searchParams.delete('stripe_return');
      newUrl.searchParams.delete('session_id');
      newUrl.searchParams.delete('refresh');
      newUrl.searchParams.delete('completed');
      newUrl.searchParams.delete('message');

      // Replace current URL without triggering a full page reload
      router.replace(newUrl.pathname + newUrl.search, { scroll: false });
    }
  }, [searchParams, connectStatus, router]);

  const handleCancelSubmit = () => {
    // Show immediate feedback
    toast({
      title: 'Processing Cancellation...',
      description:
        'Please wait while we process your subscription cancellation.',
    });

    // Close the modal - the form action will handle the rest
    setShowCancelModal(false);
  };

  const handleSubscriptionRedirect = async (planId: string) => {
    try {
      await handleSubscriptionRedirectAction({
        planId,
        userId: userData.id,
      });
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to redirect to subscription checkout',
        variant: 'destructive',
      });
    }
  };

  const handleStripeConnectRedirect = async () => {
    try {
      await handleStripeConnectRedirectAction({
        userId: userData.id,
      });
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to redirect to Stripe Connect',
        variant: 'destructive',
      });
    }
  };

  const handleCancelSubscriptionRedirect = async () => {
    try {
      await handleCancelSubscriptionRedirectAction({
        userId: userData.id,
      });
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to cancel subscription',
        variant: 'destructive',
      });
    }
  };

  const isSubscribed = userData.subscriptionStatus === true;
  const isCancelledSubscription =
    userData.subscriptionDetails?.cancelAtPeriodEnd === true;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <Typography variant="h2" className="font-bold text-foreground">
            Subscription
          </Typography>
          <Typography className="text-muted-foreground">
            {isSubscribed
              ? 'Check your subscription details and billing information'
              : 'Choose a subscription plan to publish your profile and start receiving clients'}
          </Typography>
        </div>
      </div>

      {isSubscribed ? (
        <div className="space-y-6">
          {/* Active Subscription Card */}
          <Card
            className={cn(
              'border',
              isCancelledSubscription
                ? 'border-orange-500/20'
                : connectStatus?.connectStatus === 'complete'
                  ? 'border-green-500/20'
                  : 'border-amber-500/20',
            )}
          >
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center',
                      isCancelledSubscription
                        ? 'bg-orange-500/10'
                        : connectStatus?.connectStatus === 'complete'
                          ? 'bg-green-500/10'
                          : 'bg-primary/10',
                    )}
                  >
                    <Crown
                      className={cn(
                        'h-5 w-5',
                        connectStatus?.connectStatus === 'complete'
                          ? 'text-green-500'
                          : 'text-primary',
                      )}
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Typography
                        variant="h3"
                        className="text-xl font-bold text-foreground"
                      >
                        {userData.subscriptionDetails?.planName ||
                          'Professional Plan'}
                      </Typography>
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    </div>
                    <Typography className="text-sm text-muted-foreground">
                      {isCancelledSubscription
                        ? 'Cancelling at period end'
                        : 'Active subscription'}
                    </Typography>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Cancellation Notice */}
              {isCancelledSubscription && (
                <div className="border border-orange-200 bg-orange-50 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <PauseCircle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                    <div className="space-y-2 flex flex-col flex-1">
                      <Typography
                        variant="small"
                        className="font-medium text-orange-800"
                      >
                        Subscription Cancellation Scheduled
                      </Typography>
                      <Typography variant="small" className="text-orange-700">
                        Your subscription will end on{' '}
                        {userData.subscriptionDetails?.nextBillingDate
                          ? new Date(
                              userData.subscriptionDetails.nextBillingDate,
                            ).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                            })
                          : 'your next billing date'}
                        . You'll continue to have access to all professional
                        features until then.
                      </Typography>
                    </div>
                  </div>
                </div>
              )}

              {/* Billing Information */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center space-x-3 p-3 rounded-lg bg-muted/20 border">
                  <Calendar className="h-4 w-4 text-primary" />
                  <div className="flex gap-1">
                    <Typography
                      variant="small"
                      className="font-medium text-foreground"
                    >
                      {isCancelledSubscription
                        ? 'Ends on:'
                        : 'Next Billing Date:'}
                    </Typography>
                    <Typography
                      variant="small"
                      className="text-muted-foreground"
                    >
                      {userData.subscriptionDetails?.nextBillingDate
                        ? new Date(
                            userData.subscriptionDetails.nextBillingDate,
                          ).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                          })
                        : 'Not available'}
                    </Typography>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 rounded-lg bg-muted/20 border">
                  <CreditCard className="h-4 w-4 text-primary" />
                  <div className="flex gap-1">
                    <Typography
                      variant="small"
                      className="font-medium text-foreground"
                    >
                      Status:
                    </Typography>
                    <Typography
                      variant="small"
                      className={cn(
                        'text-muted-foreground',
                        isCancelledSubscription && 'text-orange-600',
                      )}
                    >
                      {isCancelledSubscription
                        ? 'Cancelling at period end'
                        : 'Active'}
                    </Typography>
                  </div>
                </div>
              </div>

              {/* Stripe Connect Alert */}
              {(!connectStatus ||
                connectStatus.connectStatus !== 'complete') && (
                <div className="border border-amber-200 bg-amber-50 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="space-y-3 flex-1">
                      <div className="flex flex-col gap-0.5">
                        <Typography
                          variant="small"
                          className="font-medium text-amber-800"
                        >
                          Complete your setup to start receiving payments
                        </Typography>
                        <Typography variant="small" className="mt-2">
                          You'll be redirected to Stripe to securely set up your
                          payment account. You can return to this page anytime
                          by bookmarking it or using your browser's back button.
                        </Typography>
                      </div>
                      <Button onClick={handleStripeConnectRedirect}>
                        <ExternalLink className="h-4 w-4 mr-1" />
                        Continue Setup with Stripe
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>

            {!isCancelledSubscription && (
              <CardFooter className="mt-2 py-4 bg-muted/10 border-t flex justify-end">
                <Dialog
                  open={showCancelModal}
                  onOpenChange={setShowCancelModal}
                >
                  <DialogTrigger asChild>
                    <Button variant="destructiveOutline">
                      Cancel Subscription
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Cancel Subscription</DialogTitle>
                      <DialogDescription>
                        Are you sure you want to cancel your subscription?
                        You'll continue to have access to professional features
                        until the end of your current billing period.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setShowCancelModal(false)}
                      >
                        Keep Subscription
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => {
                          handleCancelSubmit();
                          handleCancelSubscriptionRedirect();
                        }}
                      >
                        Cancel Subscription
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardFooter>
            )}
          </Card>
        </div>
      ) : (
        /* Subscription Plans */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={cn(
                'flex flex-col border overflow-hidden transition-all duration-200',
                'hover:border-primary/50 hover:shadow-md',
                plan.interval === 'year' && 'border-primary/20 relative',
              )}
            >
              {plan.interval === 'year' && (
                <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-3 py-1 text-xs font-medium rounded-bl-md">
                  Save 17%
                </div>
              )}

              <CardHeader className="pb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Circle className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <Typography
                      variant="h3"
                      className="text-xl font-bold text-foreground"
                    >
                      {plan.name}
                    </Typography>
                    <div className="flex items-baseline space-x-1 mt-1">
                      <Typography
                        variant="h2"
                        className="text-3xl font-bold text-foreground"
                      >
                        ${plan.price}
                      </Typography>
                      <Typography
                        variant="small"
                        className="text-muted-foreground"
                      >
                        / {plan.interval}
                      </Typography>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="grow space-y-4">
                <ul className="space-y-3">
                  <li className="flex items-center space-x-3">
                    <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <Typography className="text-foreground">
                      Profile listing
                    </Typography>
                  </li>
                  <li className="flex items-center space-x-3">
                    <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <Typography className="text-foreground">
                      Unlimited services
                    </Typography>
                  </li>
                  <li className="flex items-center space-x-3">
                    <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <Typography className="text-foreground">
                      Up to 50 portfolio photos
                    </Typography>
                  </li>
                  <li className="flex items-center space-x-3">
                    <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <Typography className="text-foreground">
                      Accept appointments
                    </Typography>
                  </li>
                  {plan.interval === 'year' && (
                    <li className="flex items-center space-x-3">
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <Typography className="text-foreground">
                        Priority support
                      </Typography>
                    </li>
                  )}
                </ul>
              </CardContent>

              <CardFooter className="pt-6 bg-muted/10 border-t">
                <Button
                  className={cn(
                    'w-full',
                    plan.interval === 'year' &&
                      'bg-primary hover:bg-primary/90',
                  )}
                  onClick={() => handleSubscriptionRedirect(plan.id)}
                >
                  Subscribe Now
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Stripe Connect Success Modal */}
      <Dialog open={showConnectModal} onOpenChange={setShowConnectModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-6 w-6 text-green-500" />
              Subscription Activated!
            </DialogTitle>
            <DialogDescription>
              To start publishing your profile and receiving clients, you'll
              need to complete your Stripe Connect setup.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <Typography variant="small" className="text-muted-foreground">
                Stripe Connect allows you to receive payments directly from
                clients. This is required to publish your profile.
              </Typography>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <Typography variant="small" className="text-blue-800 font-medium">
                What to expect:
              </Typography>
              <ul className="mt-2 space-y-1 text-sm text-blue-700">
                <li>• You'll be redirected to Stripe's secure setup process</li>
                <li>• Complete your business information and verification</li>
                <li>
                  • Return to this page when finished (bookmark this page for
                  easy return)
                </li>
                <li>• Setup typically takes 5-10 minutes</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConnectModal(false)}
            >
              Set Up Later
            </Button>
            <Button
              onClick={() => {
                setShowConnectModal(false);
                handleStripeConnectRedirect();
              }}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Continue Setup with Stripe
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
