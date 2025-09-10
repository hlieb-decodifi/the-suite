"use client";

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
import { useSearchParams } from 'next/navigation';

export default function SetPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();
  const searchParams = useSearchParams();

  useEffect(() => {
    const verifyInviteToken = async () => {
      try {
        const supabase = createClient();
        // Try to extract tokens from query string or hash fragment
        let access_token: string | null = null;
        let refresh_token: string | null = null;
        if (searchParams) {
          access_token = searchParams.get('access_token');
          refresh_token = searchParams.get('refresh_token');
        }
        // If not found in query, try hash fragment
        if (!access_token || !refresh_token) {
          if (typeof window !== 'undefined' && window.location.hash) {
            const hashParams = new URLSearchParams(window.location.hash.substring(1));
            access_token = access_token || hashParams.get('access_token');
            refresh_token = refresh_token || hashParams.get('refresh_token');
          }
        }
        if (access_token && refresh_token) {
          // Set session from tokens in URL
          await supabase.auth.setSession({
            access_token,
            refresh_token,
          });
        }
        // Verify user is authenticated after token exchange
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();
        if (userError || !user) {
          setError('Invalid or expired invitation link');
          return;
        }
        
        // Get session for authenticated user
        const { data: { session } } = await supabase.auth.getSession();
        setUserEmail(user.email || null);
        setAccessToken(session?.access_token || null);
        setRefreshToken(session?.refresh_token || null);
      } catch (err) {
        console.error('Error verifying invitation token:', err);
        setError('Failed to verify invitation link');
      } finally {
        setIsVerifying(false);
      }
    };
    verifyInviteToken();
    // Only run on mount and when searchParams changes
     
  }, [searchParams]);

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
          title: 'Password Set',
          description: 'Your password has been set. You can now access your admin account.',
        });
        router.push('/admin');
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to set password',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Password set error:', error);
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
                Verifying invitation link...
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
                Please request a new invitation link from your team.
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
          <div className="mb-6 text-center">
            <Typography variant="h2" className="text-xl font-bold">
              Set Your Password
            </Typography>
            <Typography className="text-muted-foreground mt-2">
              Please create your password to activate your admin account.
            </Typography>
          </div>
          <ResetPasswordForm
            onSubmit={handleSubmit}
            isLoading={isLoading}
            showHeadingAndDescription={false}
            userEmail={userEmail || undefined}
          />
        </CardContent>
      </Card>
    </div>
  );
}

