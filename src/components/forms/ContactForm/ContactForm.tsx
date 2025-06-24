'use client';

import { ContactFormContent } from './components/ContactFormContent';
import { ContactFormData } from './schema';
import { useContactForm } from './useContactForm';

export type ContactFormProps = {
  onSubmit?: (data: ContactFormData) => void;
  onSuccess?: () => void;
  className?: string;
  userData?: {
    name?: string;
    email?: string;
    phone?: string;
  };
};

export function ContactForm({
  onSubmit,
  onSuccess,
  className = '',
  userData,
}: ContactFormProps) {
  const {
    form,
    isPending,
    submitError,
    onSubmit: handleSubmit,
  } = useContactForm({
    ...(onSubmit && { onSubmit }),
    ...(onSuccess && { onSuccess }),
    defaultValues: {
      name: userData?.name || '',
      email: userData?.email || '',
      phone: userData?.phone || '',
      subject: '',
      message: '',
    },
  });

  return (
    <div className={className}>
      <ContactFormContent
        form={form}
        isPending={isPending}
        submitError={submitError}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
