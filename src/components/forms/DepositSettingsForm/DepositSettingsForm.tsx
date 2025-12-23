'use client';

import {
  FormFieldWrapper,
  FormInput,
  FormSwitch,
} from '@/components/forms/common';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

// Validation schema
const depositSettingsSchema = z
  .object({
    requires_deposit: z.boolean(),
    deposit_type: z.enum(['percentage', 'fixed']).nullable().optional(),
    deposit_value: z.number().min(0).optional(),
  })
  .refine(
    (data) => {
      if (data.requires_deposit) {
        return data.deposit_type && data.deposit_value !== undefined;
      }
      return true;
    },
    {
      message: 'Please select a deposit type (percentage or fixed amount)',
      path: ['deposit_type'],
    },
  )
  .refine(
    (data) => {
      if (data.requires_deposit && data.deposit_type === 'percentage') {
        return (
          data.deposit_value !== undefined &&
          data.deposit_value >= 0 &&
          data.deposit_value <= 100
        );
      }
      return true;
    },
    {
      message: 'Percentage must be between 0 and 100',
      path: ['deposit_value'],
    },
  )
  .refine(
    (data) => {
      if (data.requires_deposit && data.deposit_type === 'fixed') {
        return data.deposit_value !== undefined && data.deposit_value >= 1;
      }
      return true;
    },
    {
      message: 'Fixed amount must be at least $1',
      path: ['deposit_value'],
    },
  );

export type DepositSettingsFormValues = z.infer<typeof depositSettingsSchema>;

export type DepositSettingsFormProps = {
  defaultValues?: Partial<DepositSettingsFormValues>;
  onSubmit: (data: DepositSettingsFormValues) => void | Promise<void>;
  isLoading?: boolean;
};

export function DepositSettingsForm({
  defaultValues,
  onSubmit,
  isLoading = false,
}: DepositSettingsFormProps) {
  const form = useForm<DepositSettingsFormValues>({
    resolver: zodResolver(depositSettingsSchema),
    defaultValues: {
      requires_deposit: false,
      deposit_type: 'percentage',
      deposit_value: 0,
      ...defaultValues,
    },
  });

  const requiresDeposit = form.watch('requires_deposit');
  const depositType = form.watch('deposit_type');

  const handleSubmit = async (data: DepositSettingsFormValues) => {
    try {
      await onSubmit(data);
    } catch (error) {
      console.error('Error submitting deposit settings:', error);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Require Deposit Toggle */}
        <div className="flex flex-row items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label className="text-base">Require Deposit</Label>
            <FormDescription>
              Require clients to pay a deposit when booking your services
            </FormDescription>
          </div>
          <FormFieldWrapper
            control={form.control}
            name="requires_deposit"
            label="Require Deposit"
            labelSrOnly
            showErrorMessage={false}
          >
            {(field) => (
              <FormSwitch
                checked={field.value as boolean}
                onCheckedChange={field.onChange}
                disabled={isLoading}
              />
            )}
          </FormFieldWrapper>
        </div>

        {/* Deposit Configuration */}
        {requiresDeposit && (
          <div className="space-y-4 border rounded-lg p-4 bg-muted/50">
            <div className="space-y-3">
              <Label className="text-sm font-medium">Deposit Type</Label>

              <FormField
                control={form.control}
                name="deposit_type"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value ?? undefined}
                        className="flex flex-col space-y-2"
                        disabled={isLoading}
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="percentage" id="percentage" />
                          <Label htmlFor="percentage">
                            Percentage of service price
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="fixed" id="fixed" />
                          <Label htmlFor="fixed">Fixed amount</Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormFieldWrapper
              control={form.control}
              name="deposit_value"
              label={
                depositType === 'percentage' ? 'Percentage (%)' : 'Amount ($)'
              }
            >
              {(field) => (
                <div className="space-y-2">
                  <FormInput
                    className="bg-white/80"
                    type="number"
                    min={depositType === 'fixed' ? '1' : '0'}
                    max={depositType === 'percentage' ? '100' : undefined}
                    step={depositType === 'percentage' ? '1' : '0.01'}
                    placeholder={depositType === 'percentage' ? '25' : '50.00'}
                    numericOnly
                    allowDecimal={depositType === 'fixed'}
                    value={field.value?.toString() || ''}
                    onChange={(e) =>
                      field.onChange(parseFloat(e.target.value) || 0)
                    }
                    onBlur={field.onBlur}
                    name={field.name}
                    disabled={isLoading}
                  />
                  <FormDescription>
                    {depositType === 'percentage'
                      ? 'Enter a percentage between 0 and 100. Note: Minimum deposit amount is $1'
                      : 'Enter a fixed dollar amount (minimum $1)'}
                  </FormDescription>
                </div>
              )}
            </FormFieldWrapper>
          </div>
        )}

        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? 'Saving...' : 'Save Deposit Settings'}
        </Button>
      </form>
    </Form>
  );
}
