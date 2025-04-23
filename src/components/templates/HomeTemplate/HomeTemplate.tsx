'use client';

import { useCurrentUser } from '@/api/auth';
import { LoadingOverlay } from '@/components/common/LoadingOverlay';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useRouter } from 'next/navigation';

export const HomeTemplate = () => {
  const { data: user, isLoading } = useCurrentUser();
  const router = useRouter();

  if (isLoading) {
    return <LoadingOverlay />;
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl text-center">
            Welcome to Our App
          </CardTitle>
          <CardDescription className="text-center">
            A fully featured authentication demo with Supabase and Next.js
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          {user ? (
            <p>You are logged in as {user.email}</p>
          ) : (
            <p>Please sign in to access your dashboard</p>
          )}
        </CardContent>
        <CardFooter className="flex justify-center gap-4">
          {user ? (
            <Button onClick={() => router.push('/dashboard')}>
              Go to Dashboard
            </Button>
          ) : (
            <Button onClick={() => router.push('/login')}>
              Sign In / Sign Up
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
};
