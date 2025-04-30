/* eslint-disable max-lines-per-function */
'use client';

import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { Typography } from '@/components/ui/typography';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Pencil, Check, AlertCircle } from 'lucide-react';
import {
  PaymentMethodsForm,
  PaymentMethodsFormValues,
} from '@/components/forms/PaymentMethodsForm';
import {
  getAvailablePaymentMethodsAction,
  getProfessionalPaymentMethodsAction,
  updateProfessionalPaymentMethodsAction,
  PaymentMethod,
} from '@/api/payment_methods';
import { toast } from '@/components/ui/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

export type PaymentMethodsSectionProps = {
  user: User;
};

export function PaymentMethodsSection({ user }: PaymentMethodsSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State for fetched data
  const [availableMethods, setAvailableMethods] = useState<PaymentMethod[]>([]);
  const [acceptedMethods, setAcceptedMethods] = useState<PaymentMethod[]>([]);
  const [isLoadingAvailable, setIsLoadingAvailable] = useState(true);
  const [isLoadingAccepted, setIsLoadingAccepted] = useState(true);

  const isLoading = isLoadingAvailable || isLoadingAccepted;

  // Fetch data on mount
  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      if (!availableMethods.length) setIsLoadingAvailable(true);
      if (!acceptedMethods.length && !isLoadingAccepted)
        setIsLoadingAccepted(true); // Check previous loading state

      try {
        const [availableResult, acceptedResult] = await Promise.all([
          getAvailablePaymentMethodsAction(),
          getProfessionalPaymentMethodsAction(user.id),
        ]);

        if (!isMounted) return;

        if (availableResult.success && availableResult.methods) {
          setAvailableMethods(availableResult.methods);
        } else {
          toast({
            title: 'Error loading payment options',
            description:
              availableResult.error || 'Could not load available methods.',
            variant: 'destructive',
          });
        }

        if (acceptedResult.success && acceptedResult.methods) {
          setAcceptedMethods(acceptedResult.methods);
        } else {
          // Don't show error if it was just profile not found (might be loading)
          if (acceptedResult.error !== 'Professional profile not found.') {
            toast({
              title: 'Error loading your payment methods',
              description:
                acceptedResult.error || 'Could not load accepted methods.',
              variant: 'destructive',
            });
          }
          setAcceptedMethods([]); // Default to empty array on error
        }
      } catch (error) {
        if (!isMounted) return;
        console.error('Failed to fetch payment methods data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load payment methods.',
          variant: 'destructive',
        });
      } finally {
        if (isMounted) {
          setIsLoadingAvailable(false);
          setIsLoadingAccepted(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
    // Only depend on user.id
  }, [user.id]);

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
    setIsSubmitting(true);

    // Convert boolean map back to array of selected IDs
    const selectedMethodIds = Object.entries(formData)
      .filter(([, isSelected]) => isSelected)
      .map(([id]) => id);

    const payload = {
      userId: user.id,
      selectedMethodIds,
    };

    const result = await updateProfessionalPaymentMethodsAction(payload);

    if (result.success) {
      // Re-fetch or update local state optimistically
      const newAcceptedMethods = availableMethods.filter((am) =>
        selectedMethodIds.includes(am.id),
      );
      setAcceptedMethods(newAcceptedMethods);
      toast({ description: 'Payment methods updated successfully.' });
      setIsEditing(false);
    } else {
      toast({
        title: 'Error saving payment methods',
        description: result.error || 'Could not save changes.',
        variant: 'destructive',
      });
    }
    setIsSubmitting(false);
  };

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
          disabled={isLoading} // Disable edit while loading initial data
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
            isSubmitting={isSubmitting}
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
