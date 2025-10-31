'use client';

import { SignInModal } from '@/components/modals/SignInModal';
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

export function AuthConfirmedTemplate() {
  const [isSignInModalOpen, setIsSignInModalOpen] = useState(false);
  const searchParams = useSearchParams();

  const verified = searchParams
    ? searchParams.get('verified') === 'true'
    : false;
  const error = searchParams ? searchParams.get('error') : null;

  const handleLoginClick = () => {
    setIsSignInModalOpen(true);
  };

  // Error states
  if (!verified || error) {
    let errorTitle = 'Authentication Failed';
    let errorDescription = 'There was an issue with your authentication.';

    if (error === 'user_not_found') {
      errorTitle = 'Account Not Found';
      errorDescription =
        'No account found with this email. Please sign up first or use the correct account.';
    } else if (error === 'invalid_role') {
      errorTitle = 'Invalid Role';
      errorDescription = 'The selected role is invalid. Please try again.';
    }

    return (
      <div className="container flex flex-col items-center justify-center px-4">
        <Card className="w-full max-w-md mx-auto">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="h-12 w-12 bg-destructive/10 rounded-full flex items-center justify-center">
                <CrossCircledIcon className="h-6 w-6 text-destructive" />
              </div>
            </div>
            <CardTitle className="text-2xl">{errorTitle}</CardTitle>
            <CardDescription className="mt-2">
              {errorDescription}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground">
              Please try again or contact support if the problem persists.
            </p>
          </CardContent>
          <CardFooter className="flex flex-col gap-2">
            <Button asChild className="w-full">
              <Link href="/">Return to Home</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Success state
  return (
    <>
      <div className="container flex flex-col items-center justify-center px-4">
        <Card className="w-full max-w-md mx-auto">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div
                className={`h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center`}
              >
                <CheckCircledIcon className="h-6 w-6 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl">Email Verified!</CardTitle>
            <CardDescription className="mt-2">
              Your email has been successfully verified.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground">
              Your email has been successfully verified. Please log in with your
              credentials to access all features of the application.
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
