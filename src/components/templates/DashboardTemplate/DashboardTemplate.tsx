'use client';

import { useCurrentUser } from '@/api/auth';
import { Button } from '@/components/ui/button';
import { useSignOut } from '@/api/auth';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ProfileSection } from './components';
import { LoadingOverlay } from '@/components/common/LoadingOverlay';

export const DashboardTemplate = () => {
  const { data: user, isLoading } = useCurrentUser();
  const { mutate: signOut } = useSignOut();
  const router = useRouter();

  const handleSignOut = () => {
    signOut(undefined, {
      onSuccess: () => {
        router.push('/login');
      },
    });
  };

  if (isLoading) {
    return <LoadingOverlay />;
  }

  return (
    <div className="container mx-auto py-10">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Dashboard</CardTitle>
          <CardDescription>Welcome to your dashboard</CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileSection user={user || null} />
        </CardContent>
        <CardFooter>
          <Button onClick={handleSignOut} variant="outline">
            Sign Out
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};
