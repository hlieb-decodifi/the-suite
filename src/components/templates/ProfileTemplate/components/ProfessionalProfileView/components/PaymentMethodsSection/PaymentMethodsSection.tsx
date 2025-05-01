/* eslint-disable max-lines-per-function */
'use client';

import { useState } from 'react';
import { User } from '@supabase/supabase-js';
import { Typography } from '@/components/ui/typography';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Pencil, Check, AlertCircle } from 'lucide-react';
import {
  PaymentMethodsForm,
  PaymentMethodsFormValues,
} from '@/components/forms/PaymentMethodsForm';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useAvailablePaymentMethods,
  useProfessionalPaymentMethods,
  useUpdateProfessionalPaymentMethods,
} from '@/api/payment_methods/hooks';

export type PaymentMethodsSectionProps = {
  user: User;
};

export function PaymentMethodsSection({ user }: PaymentMethodsSectionProps) {
  const [isEditing, setIsEditing] = useState(false);

  // Fetch data using React Query
  const {
    data: availableMethods = [],
    isLoading: isLoadingAvailable,
    error: availableError,
  } = useAvailablePaymentMethods();

  const {
    data: acceptedMethods = [],
    isLoading: isLoadingAccepted,
    error: acceptedError,
  } = useProfessionalPaymentMethods(user.id);

  // Setup mutation for updating payment methods
  const updatePaymentMethods = useUpdateProfessionalPaymentMethods();

  const isLoading = isLoadingAvailable || isLoadingAccepted;

  const handleEditToggle = () => {
    setIsEditing(!isEditing);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  // Prepare default values for the form (boolean map)
  const defaultValuesForForm: PaymentMethodsFormValues =
    availableMethods.reduce((acc, method) => {
      acc[method.id] = acceptedMethods.some((am) => am.id === method.id);
      return acc;
    }, {} as PaymentMethodsFormValues);

  const handleSave = async (formData: PaymentMethodsFormValues) => {
    // Convert boolean map back to array of selected IDs
    const selectedMethodIds = Object.entries(formData)
      .filter(([, isSelected]) => isSelected)
      .map(([id]) => id);

    updatePaymentMethods.mutate(
      {
        userId: user.id,
        selectedMethodIds,
      },
      {
        onSuccess: () => {
          setIsEditing(false);
        },
      },
    );
  };

  // Check for errors
  if ((availableError || acceptedError) && !isLoading) {
    return (
      <Card className="border border-border">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <Typography variant="h3" className="font-bold text-foreground">
            Payment Methods
          </Typography>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 text-destructive bg-destructive/10 p-3 rounded-md">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <Typography variant="small" className="leading-snug">
              Error loading payment methods. Please try again later.
            </Typography>
          </div>
        </CardContent>
      </Card>
    );
  }

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
          disabled={isLoading || updatePaymentMethods.isPending} // Disable edit while loading or submitting
        >
          <Pencil className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2 pr-2">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
          </div>
        ) : isEditing ? (
          <PaymentMethodsForm
            onSubmitSuccess={handleSave}
            onCancel={handleCancel}
            availableMethods={availableMethods}
            defaultValues={defaultValuesForForm}
            isSubmitting={updatePaymentMethods.isPending}
          />
        ) : (
          <div>
            {acceptedMethods.length > 0 ? (
              <div className="space-y-2 pr-2">
                {acceptedMethods.map((method) => (
                  <div
                    key={method.id}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-2 h-6">
                      <Typography className="text-foreground">
                        {method.name}
                      </Typography>
                    </div>
                    <Check className="h-4 w-4 text-primary" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center space-x-2 text-muted-foreground bg-muted/50 p-3 rounded-md">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <Typography variant="small" className="leading-snug">
                  Click the edit icon to select the payment methods you accept.
                </Typography>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
