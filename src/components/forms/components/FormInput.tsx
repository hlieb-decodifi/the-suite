import { Input } from '@/components/ui/input';
import { forwardRef } from 'react';
import { cn } from '@/utils/cn';
import { FormField } from './FormField';

export type FormInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  hasError?: boolean;
  label: string;
  error?: string | undefined;
  containerClassName?: string;
};

export const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
  (
    { className, hasError, label, error, containerClassName, ...props },
    ref,
  ) => {
    const id = props.id || '';

    return (
      <FormField
        id={id}
        label={label}
        error={error}
        className={containerClassName}
      >
        <Input
          className={cn(
            hasError && 'border-destructive focus-visible:ring-destructive',
            className,
          )}
          ref={ref}
          {...props}
        />
      </FormField>
    );
  },
);

FormInput.displayName = 'FormInput';
