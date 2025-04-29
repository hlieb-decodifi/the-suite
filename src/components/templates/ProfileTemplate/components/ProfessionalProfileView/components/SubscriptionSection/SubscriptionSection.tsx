'use client';

import { useState } from 'react';
import { User } from '@supabase/supabase-js';
import { Typography } from '@/components/ui/typography';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardFooter,
} from '@/components/ui/card';
import { CheckCircle2, Circle, Check } from 'lucide-react';

export type SubscriptionSectionProps = {
  user: User;
  isSubscribed: boolean;
  onSubscribe: () => void;
};

export function SubscriptionSection({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  user,
  isSubscribed,
  onSubscribe,
}: SubscriptionSectionProps) {
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual'>(
    'annual',
  );

  // Mock data - would come from API in a real app
  const plans = {
    monthly: {
      id: 'monthly',
      name: 'Monthly Plan',
      price: 19.99,
      billing: 'per month',
      features: [
        'Profile listing',
        'Unlimited services',
        'Up to 50 portfolio photos',
        'Accept appointments',
      ],
    },
    annual: {
      id: 'annual',
      name: 'Annual Plan',
      price: 199.99,
      billing: 'per year',
      discount: 'Save 17%',
      features: [
        'Profile listing',
        'Unlimited services',
        'Up to 50 portfolio photos',
        'Accept appointments',
        'Priority support',
      ],
    },
  };

  return (
    <div className="space-y-6">
      <div>
        <Typography variant="h2" className="font-bold text-foreground">
          Subscription
        </Typography>
        <Typography className="text-muted-foreground">
          Choose a subscription plan to publish your profile and start receiving
          clients
        </Typography>
      </div>

      {isSubscribed ? (
        <Card className="border border-primary/30 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-3">
              <CheckCircle2 className="h-6 w-6 text-primary" />
              <div>
                <Typography variant="h4" className="font-bold text-foreground">
                  You are subscribed to the{' '}
                  {selectedPlan === 'annual' ? 'Annual' : 'Monthly'} Plan
                </Typography>
                <Typography className="text-muted-foreground">
                  Your subscription will renew on January 1, 2025
                </Typography>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-2 pt-4">
            <Button variant="outline">Manage Subscription</Button>
          </CardFooter>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Monthly Plan */}
          <Card
            className={`border ${selectedPlan === 'monthly' ? 'border-primary' : 'border-border'}`}
          >
            <CardHeader className="pb-3">
              <div
                className="flex items-center space-x-2 cursor-pointer"
                onClick={() => setSelectedPlan('monthly')}
              >
                {selectedPlan === 'monthly' ? (
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground" />
                )}
                <Typography variant="h3" className="font-bold text-foreground">
                  {plans.monthly.name}
                </Typography>
              </div>
              <div className="mt-2">
                <div className="flex items-baseline">
                  <Typography
                    variant="h2"
                    className="font-bold text-foreground"
                  >
                    ${plans.monthly.price}
                  </Typography>
                  <Typography
                    variant="small"
                    className="text-muted-foreground ml-1"
                  >
                    / {plans.monthly.billing}
                  </Typography>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pb-3">
              <ul className="space-y-2">
                {plans.monthly.features.map((feature, index) => (
                  <li key={index} className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-primary" />
                    <Typography className="text-foreground">
                      {feature}
                    </Typography>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full"
                variant={selectedPlan === 'monthly' ? 'default' : 'outline'}
                onClick={() => {
                  setSelectedPlan('monthly');
                  onSubscribe();
                }}
              >
                {selectedPlan === 'monthly' ? 'Subscribe Now' : 'Select Plan'}
              </Button>
            </CardFooter>
          </Card>

          {/* Annual Plan */}
          <Card
            className={`border ${selectedPlan === 'annual' ? 'border-primary' : 'border-border'}`}
          >
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div
                  className="flex items-center space-x-2 cursor-pointer"
                  onClick={() => setSelectedPlan('annual')}
                >
                  {selectedPlan === 'annual' ? (
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground" />
                  )}
                  <Typography
                    variant="h3"
                    className="font-bold text-foreground"
                  >
                    {plans.annual.name}
                  </Typography>
                </div>
                <div className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-medium">
                  {plans.annual.discount}
                </div>
              </div>
              <div className="mt-2">
                <div className="flex items-baseline">
                  <Typography
                    variant="h2"
                    className="font-bold text-foreground"
                  >
                    ${plans.annual.price}
                  </Typography>
                  <Typography
                    variant="small"
                    className="text-muted-foreground ml-1"
                  >
                    / {plans.annual.billing}
                  </Typography>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pb-3">
              <ul className="space-y-2">
                {plans.annual.features.map((feature, index) => (
                  <li key={index} className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-primary" />
                    <Typography className="text-foreground">
                      {feature}
                    </Typography>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full"
                variant={selectedPlan === 'annual' ? 'default' : 'outline'}
                onClick={() => {
                  setSelectedPlan('annual');
                  onSubscribe();
                }}
              >
                {selectedPlan === 'annual' ? 'Subscribe Now' : 'Select Plan'}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}
