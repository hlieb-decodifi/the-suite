'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Typography } from '@/components/ui/typography';
import { cn } from '@/utils/cn';
import { CheckCircle, ArrowLeft, AlertCircle } from 'lucide-react';

export type EmailConfirmedTemplateProps = {
  className?: string;
  hasError?: boolean;
  message?: string | undefined;
};

export function EmailConfirmedTemplate({
  className,
  hasError = false,
  message,
}: EmailConfirmedTemplateProps) {
  if (hasError) {
    return (
      <div
        className={cn(
          'flex flex-col justify-center flex-grow container mx-auto px-4',
          className,
        )}
      >
        <div className="max-w-md mx-auto flex flex-col items-center gap-6">
          {/* Error Icon */}
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>

          {/* Heading */}
          <Typography variant="h2" className="text-red-600">
            Confirmation Failed
          </Typography>

          {/* Description */}
          <Typography
            variant="p"
            className="text-muted-foreground text-center mb-6"
          >
            {message ||
              'There was an error confirming your email address. Please try again or contact support.'}
          </Typography>

          {/* Actions */}
          <div className="flex flex-col gap-3 w-full">
            <Button asChild variant="outline" className="font-medium">
              <Link href="/profile">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Return to Profile
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex flex-col justify-center flex-grow container mx-auto px-4',
        className,
      )}
    >
      <div className="max-w-md mx-auto flex flex-col items-center gap-6">
        {/* Success Icon */}
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>

        {/* Heading */}
        <Typography variant="h2" className="text-green-600">
          Email Confirmed!
        </Typography>

        {/* Description */}
        <Typography
          variant="p"
          className="text-muted-foreground text-center mb-6"
        >
          Your email address has been successfully updated. You can now use your
          new email address to sign in to your account.
        </Typography>

        {/* Actions */}
        <div className="flex flex-col gap-3 w-full">
          <Button asChild className="font-medium">
            <Link href="/profile">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Return to Profile
            </Link>
          </Button>

          <Button asChild variant="outline" className="font-medium">
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
