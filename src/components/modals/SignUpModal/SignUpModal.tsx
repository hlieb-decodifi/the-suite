'use client';

import { useState } from 'react';
import { Modal } from '../Modal';
import { SignUpForm, SignUpFormValues } from '@/components/forms/SignUpForm';
import { Typography } from '@/components/ui/typography';
import { Button } from '@/components/ui/button';

type SignUpModalProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSignInClick?: () => void;
  onSuccess?: () => void;
};

export function SignUpModal({
  isOpen,
  onOpenChange,
  onSignInClick,
  onSuccess,
}: SignUpModalProps) {
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleClose = () => {
    onOpenChange(false);

    // Reset form state when modal is closed
    setTimeout(() => {
      if (!isOpen) {
        setIsSubmitted(false);
      }
    }, 300);
  };

  const handleSubmit = (data: SignUpFormValues) => {
    console.log('Sign up form submitted:', data);
    setIsSubmitted(true);

    if (onSuccess) {
      onSuccess();
    }
  };

  const handleSignInClick = () => {
    handleClose();
    if (onSignInClick) {
      onSignInClick();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      contentClassName="w-[95%] sm:w-[500px] md:w-[600px] max-w-2xl mx-auto p-6 sm:p-8 rounded-xl"
      hideCloseButton
      title={isSubmitted ? 'Account created' : 'Create an account'}
    >
      {isSubmitted ? (
        <div className="text-center py-6">
          <Typography variant="h3" className="font-futura font-bold mb-4">
            Account created successfully!
          </Typography>

          <Typography variant="p" className="text-muted-foreground mb-6">
            Your account has been created. You can now sign in.
          </Typography>

          <Button
            onClick={handleClose}
            className="px-8 py-3 font-futura text-xl font-bold"
          >
            Close
          </Button>
        </div>
      ) : (
        <SignUpForm
          onSubmit={handleSubmit}
          onLoginClick={handleSignInClick}
          className="w-full"
        />
      )}
    </Modal>
  );
}
