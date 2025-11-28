'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from '@/components/ui/use-toast';

export type UseSetPasswordFormProps = {
  userEmail: string;
};

export function useSetPasswordForm({ userEmail }: UseSetPasswordFormProps) {
  const [isPending, setIsPending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const sendResetEmail = async () => {
    setIsPending(true);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(userEmail, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    if (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to send password reset email',
        description: error.message,
      });
    } else {
      setEmailSent(true);
      toast({
        title: 'Email sent',
        description: 'A password reset link has been sent to your email.',
      });
    }
    setIsPending(false);
  };

  return { isPending, emailSent, sendResetEmail };
}
