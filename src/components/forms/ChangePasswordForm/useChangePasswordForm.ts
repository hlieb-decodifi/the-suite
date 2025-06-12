'use client';

import { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChangePasswordFormValues, changePasswordSchema } from './schema';
import { changePasswordAction } from '@/api/auth/actions';
import { toast } from '@/components/ui/use-toast';

export type UseChangePasswordFormProps = {
  onSubmit: (data: ChangePasswordFormValues) => void;
  defaultValues?: Partial<ChangePasswordFormValues>;
};

export function useChangePasswordForm({ 
  onSubmit, 
  defaultValues
}: UseChangePasswordFormProps) {
  const [isPending, setIsPending] = useState(false);

  const form = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
      ...defaultValues,
    },
  });

  const handleSubmit = useCallback(async (data: ChangePasswordFormValues) => {
    try {
      setIsPending(true);
      
      // Call the server action for password change
      const result = await changePasswordAction(data.currentPassword, data.newPassword);
      
      if (!result.success) {
        toast({
          variant: "destructive",
          title: "Password change failed",
          description: result.error || "Failed to change password"
        });
        return;
      }
      
      // Call the onSubmit callback passed from parent
      onSubmit(data);
      
      toast({
        title: "Password changed successfully",
        description: "Your password has been updated."
      });
      
      // Reset form
      form.reset();
    } catch (error) {
      console.error('Error submitting form:', error);
      toast({
        variant: "destructive",
        title: "Password change failed",
        description: "Failed to change password. Please try again."
      });
    } finally {
      setIsPending(false);
    }
  }, [onSubmit, form]);

  return {
    form,
    isPending,
    onSubmit: handleSubmit,
  };
} 