'use client';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

// Validation schema
const cancellationPolicyFormSchema = z
  .object({
    cancellation_policy_enabled: z.boolean(),
    cancellation_24h_charge_percentage: z
      .number()
      .min(0, 'Percentage must be at least 0')
      .max(100, 'Percentage cannot exceed 100'),
    cancellation_48h_charge_percentage: z
      .number()
      .min(0, 'Percentage must be at least 0')
      .max(100, 'Percentage cannot exceed 100'),
  })
  .refine(
    (data) =>
      data.cancellation_24h_charge_percentage >=
      data.cancellation_48h_charge_percentage,
    {
      message:
        '24-hour cancellation charge must be greater than or equal to 48-hour charge',
      path: ['cancellation_24h_charge_percentage'],
    },
  );

export type CancellationPolicyFormValues = z.infer<
  typeof cancellationPolicyFormSchema
>;

export type CancellationPolicyFormProps = {
  defaultValues?: Partial<CancellationPolicyFormValues>;
  onSubmit: (data: CancellationPolicyFormValues) => Promise<void>;
  isLoading?: boolean;
  disabled?: boolean;
};

export function CancellationPolicyForm({
  defaultValues = {
    cancellation_policy_enabled: true,
    cancellation_24h_charge_percentage: 50,
    cancellation_48h_charge_percentage: 25,
  },
  onSubmit,
  isLoading = false,
  disabled = false,
}: CancellationPolicyFormProps) {
  const form = useForm<CancellationPolicyFormValues>({
    resolver: zodResolver(cancellationPolicyFormSchema),
    defaultValues,
  });

  const watchEnabled = form.watch('cancellation_policy_enabled');

  const handleSubmit = async (data: CancellationPolicyFormValues) => {
    try {
      await onSubmit(data);
    } catch (error) {
      console.error('Error submitting cancellation policy form:', error);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Enable/Disable Policy */}
        <FormField
          control={form.control}
          name="cancellation_policy_enabled"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start justify-between rounded-lg border p-3">
              <div className="space-y-0.5 flex-1 pr-4">
                <FormLabel className="text-sm font-medium">
                  Enable Cancellation Policy
                </FormLabel>
                <FormDescription className="text-xs">
                  Apply charges when clients cancel appointments with short
                  notice
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={disabled}
                />
              </FormControl>
            </FormItem>
          )}
        />

        {/* Conditional Settings */}
        {watchEnabled && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 48-hour cancellation */}
            <FormField
              control={form.control}
              name="cancellation_48h_charge_percentage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>48+ hours notice (%)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      placeholder="25"
                      {...field}
                      value={field.value?.toString() || ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        field.onChange(value === '' ? 0 : parseFloat(value));
                      }}
                      disabled={disabled}
                    />
                  </FormControl>
                  <FormDescription>
                    Charge for cancellations with 24-48 hours notice
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 24-hour cancellation */}
            <FormField
              control={form.control}
              name="cancellation_24h_charge_percentage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Less than 24 hours (%)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      placeholder="50"
                      {...field}
                      value={field.value?.toString() || ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        field.onChange(value === '' ? 0 : parseFloat(value));
                      }}
                      disabled={disabled}
                    />
                  </FormControl>
                  <FormDescription>
                    Charge for cancellations with less than 24 hours notice
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            disabled={disabled || isLoading}
            className="min-w-[120px]"
          >
            {isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
