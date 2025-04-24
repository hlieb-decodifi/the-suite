'use client';

import { Button } from '@/components/ui/button';
import { Typography } from '@/components/ui/typography';

type SignInSuccessProps = {
  onClose: () => void;
};

export function SignInSuccess({ onClose }: SignInSuccessProps) {
  return (
    <div className="text-center py-6">
      <Typography variant="h3" className="font-futura font-bold mb-4">
        Welcome back!
      </Typography>

      <Typography variant="p" className="text-muted-foreground mb-6">
        You have successfully signed in to your account.
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
