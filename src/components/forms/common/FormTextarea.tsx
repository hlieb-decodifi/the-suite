import React, { forwardRef } from 'react';
import { Textarea } from '@/components/ui/textarea';

// Use React's TextareaHTMLAttributes
export type FormTextareaProps =
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
    // Add any custom props specific to form usage if needed later
  };

export const FormTextarea = forwardRef<HTMLTextAreaElement, FormTextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <Textarea
        className={className} // Pass className if needed
        ref={ref}
        {...props}
      />
    );
  },
);

FormTextarea.displayName = 'FormTextarea';
