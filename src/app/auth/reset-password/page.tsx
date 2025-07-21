'use client';

import { updatePasswordAction } from '@/api/auth/actions';
import { ResetPasswordForm } from '@/components/forms/ResetPasswordForm/ResetPasswordForm';
import { ResetPasswordFormValues } from '@/components/forms/ResetPasswordForm/schema';
import { Card, CardContent } from '@/components/ui/card';
import { Typography } from '@/components/ui/typography';
import { useToast } from '@/components/ui/use-toast';
import { createClient } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function ResetPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const verifyPasswordResetToken = async () => {
      try {
        const supabase = createClient();

        // Get the session to check if user is authenticated via password reset
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError || !session) {
          setError('Invalid or expired password reset link');
          return;
        }

        // Get user email
        setUserEmail(session.user.email || null);
        // Get access and refresh tokens
        setAccessToken(session.access_token || null);
        setRefreshToken(session.refresh_token || null);
      } catch (err) {
        console.error('Error verifying password reset token:', err);
        setError('Failed to verify password reset link');
      } finally {
        setIsVerifying(false);
      }
    };

    verifyPasswordResetToken();
  }, []);

  const handleSubmit = async (
    data: ResetPasswordFormValues,
    at?: string | null,
    rt?: string | null
  ) => {
    setIsLoading(true);

    try {
      const result = await updatePasswordAction(
        data.password,
        at ?? accessToken,
        rt ?? refreshToken
      );

      if (result.success) {
        toast({
          title: 'Password Updated',
          description: 'Your password has been successfully updated.',
        });

        // Redirect to profile after successful password update
        router.push('/profile');
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to update password',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Password update error:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isVerifying) {
    return (
      <div className="flex w-full items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="p-8">
            <div className="text-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin mx-auto" />
              <Typography className="text-muted-foreground">
                Verifying password reset link...
              </Typography>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="p-8">
            <div className="text-center space-y-4">
              <Typography
                variant="h2"
                className="text-xl font-bold text-destructive"
              >
                Invalid Link
              </Typography>
              <Typography className="text-muted-foreground">{error}</Typography>
              <Typography className="text-sm text-muted-foreground">
                Please request a new password reset link.
              </Typography>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardContent className="p-8">
          <ResetPasswordForm
            onSubmit={handleSubmit}
            isLoading={isLoading}
            userEmail={userEmail || undefined}
          />
        </CardContent>
      </Card>
    </div>
  );
}
