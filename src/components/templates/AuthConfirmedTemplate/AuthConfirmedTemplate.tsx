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
import { CheckCircledIcon } from '@radix-ui/react-icons';
import Link from 'next/link';
import { useState } from 'react';

export function AuthConfirmedTemplate() {
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
