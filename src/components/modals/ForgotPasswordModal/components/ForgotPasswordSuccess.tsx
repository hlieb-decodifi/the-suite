'use client';

import { Button } from '@/components/ui/button';
import { Typography } from '@/components/ui/typography';

type ForgotPasswordSuccessProps = {
  onClose: () => void;
  email: string;
};

export function ForgotPasswordSuccess({
  onClose,
  email,
}: ForgotPasswordSuccessProps) {
  return (
    <div className="text-center py-6">
      <Typography variant="h3" className="font-futura font-bold mb-4">
        Reset link sent
      </Typography>

      <Typography variant="p" className="text-muted-foreground mb-6">
        We've sent a password reset link to{' '}
        <span className="font-semibold text-foreground">{email}</span>. Please
        check your inbox and follow the instructions to reset your password.
      </Typography>

      <Button
        onClick={onClose}
        className="px-8 py-3 font-futura text-xl font-bold"
      >
        Close
      </Button>
    </div>
  );
}
