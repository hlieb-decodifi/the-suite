'use client';

import { useState } from 'react';
import { Modal } from '../Modal';
import {
  ForgotPasswordForm,
  ForgotPasswordFormValues,
} from '@/components/forms/ForgotPasswordForm';
import { ForgotPasswordSuccess } from './components/ForgotPasswordSuccess';
import { resetPasswordAction } from '@/api/auth/actions';
import { useToast } from '@/components/ui/use-toast';

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
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleClose = () => {
    onOpenChange(false);
    // Reset state immediately when modal closes
    setIsSubmitted(false);
    setSubmittedEmail('');
    setIsLoading(false);
  };

  const handleSubmit = async (data: ForgotPasswordFormValues) => {
    setIsLoading(true);

    try {
      const result = await resetPasswordAction(data.email);

      if (result.success) {
        setSubmittedEmail(data.email);
        setIsSubmitted(true);

        if (onSuccess) {
          onSuccess();
        }
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to send password reset email',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Password reset error:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
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
          isLoading={isLoading}
        />
      )}
    </Modal>
  );
}
