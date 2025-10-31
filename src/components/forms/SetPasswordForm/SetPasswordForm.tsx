'use client';

import { useSetPasswordForm } from './useSetPasswordForm';

export type SetPasswordFormProps = {
  userEmail: string;
};

export function SetPasswordForm({ userEmail }: SetPasswordFormProps) {
  const { isPending, emailSent, sendResetEmail } = useSetPasswordForm({
    userEmail,
  });

  return (
    <div className="space-y-6">
      {emailSent ? (
        <div className="text-center">
          <div className="font-medium text-lg mb-2">Check your email</div>
          <div className="text-muted-foreground mb-4">
            A password reset link has been sent to{' '}
            <span className="font-semibold">{userEmail}</span>.<br />
            Please log out and follow the instructions in the email to set your
            password.
          </div>
        </div>
      ) : (
        <button
          className="w-full px-4 py-2 bg-primary text-white rounded font-medium"
          onClick={sendResetEmail}
          disabled={isPending}
        >
          {isPending ? 'Sending...' : 'Send Password Reset Email'}
        </button>
      )}
    </div>
  );
}
