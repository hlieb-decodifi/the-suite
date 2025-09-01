'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { FormInput } from '@/components/forms/components';
import { useToast } from '@/components/ui/use-toast';
import { convertOAuthToEmailAction } from '@/api/auth/actions';
import { Typography } from '@/components/ui/typography';
import { AlertCircle, Check, ChevronDown, ChevronUp } from 'lucide-react';

const convertOAuthSchema = z
  .object({
    email: z
      .string()
      .min(1, 'Email is required')
      .email('Please enter a valid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type ConvertOAuthFormValues = z.infer<typeof convertOAuthSchema>;

type ConvertOAuthToEmailFormProps = {
  onSuccess?: () => void;
  onCancel?: () => void;
};

export function ConvertOAuthToEmailForm({
  onSuccess,
  onCancel,
}: ConvertOAuthToEmailFormProps) {
  const [isPending, setIsPending] = useState(false);
  const [isConverted, setIsConverted] = useState(false);
  const [isInfoExpanded, setIsInfoExpanded] = useState(false);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ConvertOAuthFormValues>({
    resolver: zodResolver(convertOAuthSchema),
  });

  const onSubmit = async (data: ConvertOAuthFormValues) => {
    setIsPending(true);
    try {
      const result = await convertOAuthToEmailAction(data.email, data.password);

      if (result.success) {
        setIsConverted(true);
        toast({
          title: 'Success',
          description: result.message,
        });

        // Refresh the page after a short delay to reflect the changes
        setTimeout(() => {
          window.location.reload();
        }, 2000);

        if (onSuccess) onSuccess();
      } else {
        toast({
          title: 'Error',
          description: result.error,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error converting account:', error);
      toast({
        title: 'Error',
        description: 'Failed to convert account. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsPending(false);
    }
  };

  if (isConverted) {
    return (
      <div className="text-center space-y-4 py-6">
        <div className="flex justify-center">
          <div className="bg-green-100 p-3 rounded-full">
            <Check className="h-6 w-6 text-green-600" />
          </div>
        </div>
        <Typography variant="h3" className="text-green-800">
          Conversion Successful!
        </Typography>
        <Typography className="text-muted-foreground">
          Your account now supports both Google and email/password
          authentication. You can now change your email address and password.
        </Typography>
        <Typography variant="small" className="text-muted-foreground">
          The page will refresh automatically to reflect the changes.
        </Typography>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full max-h-[60vh]">
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto pr-2 -mr-2">
        <div className="space-y-4">
          {/* Collapsible Info Section */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-md">
            {/* Header with toggle button */}
            <button
              type="button"
              onClick={() => setIsInfoExpanded(!isInfoExpanded)}
              className="w-full p-3 flex items-start gap-3 hover:bg-yellow-100 transition-colors rounded-md"
              disabled={isPending}
            >
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1 text-left">
                <Typography
                  variant="small"
                  className="text-yellow-800 font-medium"
                >
                  What this does:
                </Typography>
              </div>
              {isInfoExpanded ? (
                <ChevronUp className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
              ) : (
                <ChevronDown className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
              )}
            </button>

            {/* Collapsible Content */}
            {isInfoExpanded && (
              <div className="px-3 pb-3">
                <div className="pl-8">
                  <ul className="text-sm text-yellow-700 space-y-1">
                    <li>
                      • Adds email/password authentication to your Google
                      account
                    </li>
                    <li>
                      • Allows you to change your email address and password
                    </li>
                    <li>
                      • You can sign in with either Google OR email/password
                    </li>
                    <li>• Your Google authentication will remain active</li>
                    <li>• This change is permanent and cannot be undone</li>
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Form Fields */}
          <div className="flex flex-col gap-2">
            <FormInput
              id="email"
              label="New Email Address"
              type="email"
              placeholder="Enter your new email address"
              {...register('email')}
              hasError={!!errors.email}
              error={errors.email?.message}
            />

            <FormInput
              id="password"
              label="New Password"
              type="password"
              placeholder="Enter a new password (minimum 8 characters)"
              {...register('password')}
              hasError={!!errors.password}
              error={errors.password?.message}
            />

            <FormInput
              className="!pb-0"
              id="confirmPassword"
              label="Confirm Password"
              type="password"
              placeholder="Enter your new password"
              {...register('confirmPassword')}
              hasError={!!errors.confirmPassword}
              error={errors.confirmPassword?.message}
            />
          </div>
        </div>
      </div>

      {/* Fixed Action Buttons */}
      <div className="flex-shrink-0 mt-6">
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="flex gap-3">
            <Button type="submit" disabled={isPending} className="flex-1">
              {isPending ? 'Converting...' : 'Add Email Authentication'}
            </Button>

            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isPending}
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
