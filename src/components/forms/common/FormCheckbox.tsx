import React, { forwardRef } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { cn } from '@/utils/cn';

export type FormCheckboxProps = {
  field: {
    value?: boolean | undefined;
    onChange: (value: boolean) => void;
    name: string;
  };
  label: string;
  id: string;
  className?: string;
  labelClassName?: string;
};

export const FormCheckbox = forwardRef<HTMLButtonElement, FormCheckboxProps>(
  ({ field, label, id, className, labelClassName }, ref) => {
    return (
      <div className={cn('flex items-center space-x-2', className)}>
        <Checkbox
          ref={ref}
          id={id}
          checked={field.value ?? false}
          onCheckedChange={field.onChange}
          name={field.name}
        />
        <Label
          htmlFor={id}
          className={cn(
            'font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
            labelClassName,
          )}
        >
          {label}
        </Label>
      </div>
    );
  },
);

FormCheckbox.displayName = 'FormCheckbox';
