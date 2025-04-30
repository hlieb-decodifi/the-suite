import React, { forwardRef } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SelectProps } from '@radix-ui/react-select'; // Import underlying props

// Define props, extending Radix SelectProps
export type FormSelectProps = SelectProps & {
  placeholder?: string;
  options: { value: string; label: string }[];
  // field value/onChange are typically handled by Controller's render prop
  value?: string;
  onChange?: (value: string) => void;
  // Allow className pass-through for Trigger
  className?: string;
};

// Note: This component is often used within a react-hook-form Controller or FormFieldWrapper
// It receives value/onChange from the field render prop.
export const FormSelect = forwardRef<
  React.ElementRef<typeof SelectTrigger>,
  FormSelectProps
>(({ value, onChange, placeholder, options, className, ...props }, ref) => {
  return (
    <Select
      value={value ?? ''}
      onValueChange={onChange ?? (() => {})}
      {...props}
    >
      <SelectTrigger ref={ref} className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
});

FormSelect.displayName = 'FormSelect';
