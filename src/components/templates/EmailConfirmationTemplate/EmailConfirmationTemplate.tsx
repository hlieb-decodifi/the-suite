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
import { EnvelopeOpenIcon } from '@radix-ui/react-icons';
import Link from 'next/link';

export type EmailConfirmationTemplateProps = {
  email?: string | null | undefined;
};

export function EmailConfirmationTemplate({
  email,
}: EmailConfirmationTemplateProps) {
  return (
    <div className="container px-4">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
              <EnvelopeOpenIcon className="h-6 w-6 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Check your email</CardTitle>
          <CardDescription className="mt-2">
            We've sent a confirmation link to
            {email ? (
              <span className="font-medium text-primary"> {email}</span>
            ) : (
              ' your email address'
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="mb-4 text-muted-foreground">
            Please click the link in the email to verify your account and
            continue.
          </p>
          <p className="text-sm text-muted-foreground">
            If you don't see the email, check your spam folder or make sure you
            entered the correct email address.
          </p>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button asChild variant="outline" className="w-full">
            <Link href="/">Return to home</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
