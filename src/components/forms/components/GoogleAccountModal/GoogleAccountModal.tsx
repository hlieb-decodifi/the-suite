
import React, { useState } from 'react';
import { getGoogleOAuthUrlAction } from '@/api/auth/actions';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';

type GoogleAccountModalProps = {
  open: boolean;
  mode: 'signin' | 'signup';
  email: string;
  onSecondary: () => void;
  onClose: () => void;
};

export function GoogleAccountModal({
  open,
  mode,
  email,
  onSecondary,
  onClose,
}: GoogleAccountModalProps) {
  const isSignIn = mode === 'signin';

  // Google OAuth handler
  const [isLoading, setIsLoading] = useState(false);
  const handleGoogleOAuth = async () => {
    setIsLoading(true);
    try {
      const redirectTo = '/profile';
      // If user is in the modal because they tried to sign in but no account exists, they are now signing up
      // If user is in the modal because they tried to sign up but account exists, they are now logging in
      const result = await getGoogleOAuthUrlAction(
        redirectTo,
        isSignIn ? 'signup' : 'signin'
      );
      if (result.success && result.url) {
        window.location.href = result.url;
        return;
      }
      setIsLoading(false);
    } catch {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent closeButton={false}>
        <DialogHeader>
          <DialogTitle>
            {isSignIn ? 'No account found' : 'Account already exists'}
          </DialogTitle>
          <DialogDescription>
            <span>
              {isSignIn
                ? `There's no account with the email address ${email}.`
                : `There's already an account associated with ${email}.`}
            </span>
            <br />
            <span>
              {isSignIn
                ? 'Would you like to create a new account?'
                : 'Would you like to log in?'}
            </span>
          </DialogDescription>
        </DialogHeader>
  <div className="flex flex-col gap-1 mt-3">
          <button
            className={
              `w-full px-4 py-2 rounded-md font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition bg-primary text-primary-foreground hover:bg-primary/90`
            }
            onClick={handleGoogleOAuth}
            type="button"
            disabled={isLoading}
          >
            {isLoading
              ? 'Redirecting...'
              : isSignIn
                ? 'Sign up with Google'
                : 'Log in with Google'}
          </button>
          <button
            className="w-full px-4 py-2 rounded-md bg-transparent text-muted-foreground text-sm hover:underline focus:outline-none"
            onClick={onSecondary}
            type="button"
          >
            {isSignIn ? 'Sign up with email instead' : 'Log in with email instead'}
          </button>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl"
              aria-label="Close"
              type="button"
            >
              ×
            </button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
