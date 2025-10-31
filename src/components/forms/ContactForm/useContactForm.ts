'use client';

import { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { contactFormSchema, type ContactFormData } from './schema';
import { submitContactInquiry } from '@/server/domains/contact/actions';
import { toast } from '@/components/ui/use-toast';

export type UseContactFormProps = {
  onSubmit?: (data: ContactFormData) => void;
  defaultValues?: Partial<ContactFormData>;
  onSuccess?: () => void;
};

export function useContactForm({
  onSubmit,
  defaultValues,
  onSuccess,
}: UseContactFormProps = {}) {
  const [isPending, setIsPending] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<ContactFormData>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      subject: '',
      message: '',
      ...defaultValues,
    },
  });

  const handleSubmit = useCallback(
    async (data: ContactFormData) => {
      try {
        setIsPending(true);
        setSubmitError(null);

        // Call the server action for contact form submission
        const result = await submitContactInquiry(data);

        if (!result.success) {
          setSubmitError(
            result.error || 'Failed to send message. Please try again.',
          );
          return;
        }

        // Call the onSubmit callback if provided
        onSubmit?.(data);

        // Show success toast
        toast({
          title: 'Message Sent!',
          description:
            'Thank you for contacting us. We will get back to you shortly.',
        });

        // Reset form on success
        form.reset();

        // Call success callback if provided
        onSuccess?.();
      } catch (error) {
        console.error('Error submitting contact form:', error);
        setSubmitError('An unexpected error occurred. Please try again.');
      } finally {
        setIsPending(false);
      }
    },
    [onSubmit, onSuccess, form],
  );

  return {
    form,
    isPending,
    submitError,
    onSubmit: handleSubmit,
  };
}
