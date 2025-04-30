import React, { forwardRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';

// Use React's InputHTMLAttributes
export type FormInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  numericOnly?: boolean;
  allowDecimal?: boolean;
};

export const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
  ({ onChange, numericOnly, allowDecimal, ...props }, ref) => {
    const handleChange = useCallback(
      (event: React.ChangeEvent<HTMLInputElement>) => {
        let value = event.target.value;

        if (numericOnly) {
          // Define the regex based on whether decimals are allowed
          const regex = allowDecimal ? /^[0-9]*\.?\d*$/ : /^[0-9]*$/;

          // Remove invalid characters
          // If allowing decimals, handle edge cases like multiple dots later if needed
          // This simplified regex allows typing like "12.34" but not "12..34"
          if (!regex.test(value)) {
            // Filter out characters not matching the basic pattern
            // For decimals: allow digits and one dot
            // For integers: allow only digits
            value = value
              .split('')
              .filter((char, index, arr) => {
                if (allowDecimal) {
                  if (char === '.') {
                    // Allow only the first dot
                    return arr.indexOf('.') === index;
                  }
                  return /[0-9]/.test(char);
                } else {
                  return /[0-9]/.test(char);
                }
              })
              .join('');
          }
          event.target.value = value; // Update the event value for the original handler
        }

        // Call the original onChange handler passed in props, if any
        if (onChange) {
          onChange(event);
        }
      },
      [onChange, numericOnly, allowDecimal],
    );

    return <Input ref={ref} onChange={handleChange} {...props} />;
  },
);

FormInput.displayName = 'FormInput';
