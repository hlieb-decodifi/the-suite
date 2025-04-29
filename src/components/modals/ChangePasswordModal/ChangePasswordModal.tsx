'use client';

import { useState } from 'react';
import { Modal } from '../Modal';
import { ChangePasswordForm } from '@/components/forms/ChangePasswordForm/ChangePasswordForm';
import { Typography } from '@/components/ui/typography';
import { Button } from '@/components/ui/button';

type ChangePasswordModalProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ChangePasswordModal({
  isOpen,
  onOpenChange,
}: ChangePasswordModalProps) {
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

  const handleSubmit = () => {
    setIsSubmitted(true);
  };

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      contentClassName="w-[95%] sm:w-[500px] md:w-[600px] max-w-2xl mx-auto p-6 sm:p-8 rounded-xl"
      hideCloseButton
      title={isSubmitted ? 'Password Changed' : 'Change Password'}
    >
      {isSubmitted ? (
        <div className="text-center py-6">
          <Typography variant="h3" className="font-futura font-bold mb-4">
            Password changed successfully!
          </Typography>

          <Typography variant="p" className="text-muted-foreground mb-6">
            Your password has been updated. You can now use your new password to
            sign in.
          </Typography>

          <Button
            onClick={handleClose}
            className="px-8 py-3 font-futura text-xl font-bold"
          >
            Close
          </Button>
        </div>
      ) : (
        <ChangePasswordForm
          onSubmit={handleSubmit}
          onCancel={handleClose}
          className="w-full"
        />
      )}
    </Modal>
  );
}
