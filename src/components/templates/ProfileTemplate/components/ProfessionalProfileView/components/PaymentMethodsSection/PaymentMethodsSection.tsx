/* eslint-disable max-lines-per-function */
'use client';

import { useState } from 'react';
import { User } from '@supabase/supabase-js';
import { Typography } from '@/components/ui/typography';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Pencil, CreditCard, Banknote, Check, AlertCircle } from 'lucide-react';
import {
  PaymentMethodsForm,
  PaymentMethodsFormValues,
  PaymentMethodId,
} from '@/components/forms/PaymentMethodsForm';

export type PaymentMethodsSectionProps = {
  user: User;
};

// Define structure for payment methods with icons
const METHOD_DETAILS: Record<
  PaymentMethodId,
  { name: string; icon: React.ElementType }
> = {
  creditCard: { name: 'Credit Card', icon: CreditCard },
  cash: { name: 'Cash', icon: Banknote },
};

export function PaymentMethodsSection({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  user,
}: PaymentMethodsSectionProps) {
  const [isEditing, setIsEditing] = useState(false);

  // State to hold the currently enabled payment methods (boolean map)
  // In a real app, this would come from API/DB based on user settings
  const [enabledMethods, setEnabledMethods] =
    useState<PaymentMethodsFormValues>({
      creditCard: true,
      cash: true,
    });

  const handleEditToggle = () => {
    setIsEditing(!isEditing);
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Optionally reset form state here if using form.reset in hook wasn't desired
  };

  const handleSave = async (data: PaymentMethodsFormValues) => {
    // Simulate API Call
    await new Promise((res) => setTimeout(res, 500));

    // Update local state on successful save
    setEnabledMethods(data);
    setIsEditing(false);
  };

  const enabledMethodIds = Object.entries(enabledMethods)
    .filter(([, isEnabled]) => isEnabled)
    .map(([id]) => id as PaymentMethodId);

  return (
    <Card className="border border-border">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <Typography variant="h3" className="font-bold text-foreground">
          Payment Methods
        </Typography>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleEditToggle}
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
        >
          <Pencil className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <PaymentMethodsForm
            onSubmitSuccess={handleSave}
            onCancel={handleCancel}
            defaultValues={enabledMethods} // Pass current state as defaults
          />
        ) : (
          <div>
            {enabledMethodIds.length > 0 ? (
              <div className="space-y-2 pr-2">
                {enabledMethodIds.map((id) => {
                  const method = METHOD_DETAILS[id];
                  return (
                    <div key={id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 h-6">
                        <method.icon className="h-4 w-4 text-primary" />
                        <Typography className="text-foreground">
                          {method.name}
                        </Typography>
                      </div>
                      <Check className="h-4 w-4 text-primary" />
                    </div>
                  );
                })}
              </div>
            ) : (
              // Placeholder when no methods are enabled
              <div className="flex items-center space-x-2 text-muted-foreground bg-muted/50 p-3 rounded-md">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <Typography variant="small">
                  No payment methods are currently enabled.
                </Typography>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
