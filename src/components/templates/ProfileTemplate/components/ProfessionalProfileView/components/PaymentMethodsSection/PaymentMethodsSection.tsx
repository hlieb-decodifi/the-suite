'use client';

import { useState } from 'react';
import { User } from '@supabase/supabase-js';
import { Typography } from '@/components/ui/typography';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Pencil, CreditCard, Banknote, Check } from 'lucide-react';

export type PaymentMethodsSectionProps = {
  user: User;
};

export function PaymentMethodsSection({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  user,
}: PaymentMethodsSectionProps) {
  const [isEditing, setIsEditing] = useState(false);

  // Mock data - would come from API in a real app
  const paymentMethods = [
    { id: 'credit-card', name: 'Credit Card', icon: CreditCard, enabled: true },
    { id: 'cash', name: 'Cash', icon: Banknote, enabled: true },
  ];

  return (
    <Card className="border border-border">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <Typography variant="h3" className="font-bold text-foreground">
          Payment Methods
        </Typography>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsEditing(!isEditing)}
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
        >
          <Pencil className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="space-y-4">
          <div className="space-y-2 pr-2">
            {paymentMethods.map((method) => (
              <div
                key={method.id}
                className="flex items-center justify-between"
              >
                <div className="flex items-center space-x-2">
                  <method.icon className="h-4 w-4 text-primary" />
                  <Typography className="text-foreground">
                    {method.name}
                  </Typography>
                </div>
                {method.enabled && <Check className="h-4 w-4 text-primary" />}
              </div>
            ))}
          </div>

          {isEditing && (
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button onClick={() => setIsEditing(false)}>Save Changes</Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
