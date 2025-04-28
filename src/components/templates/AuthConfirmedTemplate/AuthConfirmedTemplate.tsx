'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { CheckCircledIcon, CrossCircledIcon } from '@radix-ui/react-icons';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { SignInModal } from '@/components/modals/SignInModal';

type AuthConfirmedTemplateProps = {
  isVerified?: boolean;
};

export function AuthConfirmedTemplate({
  isVerified: propIsVerified,
}: AuthConfirmedTemplateProps) {
  const searchParams = useSearchParams();
  // Use the prop if provided, otherwise check the query params
  const isVerified = propIsVerified ?? searchParams.get('verified') === 'true';
  const [isSignInModalOpen, setIsSignInModalOpen] = useState(false);

  const handleLoginClick = () => {
    setIsSignInModalOpen(true);
  };

  return (
    <>
      <div className="container px-4">
        <Card className="w-full max-w-md mx-auto">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div
                className={`h-12 w-12 ${isVerified ? 'bg-primary/10' : 'bg-destructive/10'} rounded-full flex items-center justify-center`}
              >
                {isVerified ? (
                  <CheckCircledIcon className="h-6 w-6 text-primary" />
                ) : (
                  <CrossCircledIcon className="h-6 w-6 text-destructive" />
                )}
              </div>
            </div>
            <CardTitle className="text-2xl">
              {isVerified ? 'Email Verified!' : 'Verification Failed'}
            </CardTitle>
            <CardDescription className="mt-2">
              {isVerified
                ? 'Your email has been successfully verified.'
                : 'We could not verify your email address.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground">
              {isVerified
                ? 'Your email has been successfully verified. Please log in with your credentials to access all features of the application.'
                : 'There was a problem verifying your email. Please try again or contact support if the issue persists.'}
            </p>
          </CardContent>
          <CardFooter className="flex flex-col gap-2">
            <Button className="w-full" onClick={handleLoginClick}>
              Continue to Login
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/">Return to Home</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>

      <SignInModal
        isOpen={isSignInModalOpen}
        onOpenChange={setIsSignInModalOpen}
        onSuccess={() => setIsSignInModalOpen(false)}
      />
    </>
  );
}
