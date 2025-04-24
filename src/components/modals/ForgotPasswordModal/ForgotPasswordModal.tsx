'use client';

import { useState } from 'react';
import { Modal } from '../Modal';
import {
  ForgotPasswordForm,
  ForgotPasswordFormValues,
} from '@/components/forms/ForgotPasswordForm';
import { ForgotPasswordSuccess } from './components/ForgotPasswordSuccess';

type ForgotPasswordModalProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onLoginClick: () => void;
  onSuccess?: () => void;
};

export function ForgotPasswordModal({
  isOpen,
  onOpenChange,
  onLoginClick,
  onSuccess,
}: ForgotPasswordModalProps) {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');

  const handleClose = () => {
    onOpenChange(false);

    // Reset form state when modal is closed
    setTimeout(() => {
      if (!isOpen) {
        setIsSubmitted(false);
      }
    }, 300);
  };

  const handleSubmit = async (data: ForgotPasswordFormValues) => {
    console.log('Forgot password form submitted:', data);
    setSubmittedEmail(data.email);
    setIsSubmitted(true);

    if (onSuccess) {
      onSuccess();
    }
  };

  const handleCancel = () => {
    handleClose();
    onLoginClick();
  };

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      contentClassName="w-[95%] sm:w-[500px] md:w-[600px] max-w-2xl mx-auto p-6 sm:p-8 rounded-xl"
      hideCloseButton
      title={isSubmitted ? 'Password Reset' : 'Forgot Password'}
    >
      {isSubmitted ? (
        <ForgotPasswordSuccess onClose={handleClose} email={submittedEmail} />
      ) : (
        <ForgotPasswordForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          className="w-full"
        />
      )}
    </Modal>
  );
}
