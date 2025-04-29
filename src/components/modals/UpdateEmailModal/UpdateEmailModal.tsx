'use client';

import { useState } from 'react';
import { Modal } from '../Modal';
import { UpdateEmailForm } from '@/components/forms/UpdateEmailForm/UpdateEmailForm';
import { Typography } from '@/components/ui/typography';
import { Button } from '@/components/ui/button';
import { User } from '@supabase/supabase-js';

type UpdateEmailModalProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  user: User;
};

export function UpdateEmailModal({
  isOpen,
  onOpenChange,
  user,
}: UpdateEmailModalProps) {
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
      title={isSubmitted ? 'Email Updated' : 'Update Email Address'}
    >
      {isSubmitted ? (
        <div className="text-center py-6">
          <Typography variant="h3" className="font-futura font-bold mb-4">
            Email updated successfully!
          </Typography>

          <Typography variant="p" className="text-muted-foreground mb-6">
            A confirmation has been sent to your new email address. Please check
            your inbox to complete the verification process.
          </Typography>

          <Button
            onClick={handleClose}
            className="px-8 py-3 font-futura text-xl font-bold"
          >
            Close
          </Button>
        </div>
      ) : (
        <UpdateEmailForm
          onSubmit={handleSubmit}
          onCancel={handleClose}
          className="w-full"
          currentEmail={user.email}
        />
      )}
    </Modal>
  );
}
