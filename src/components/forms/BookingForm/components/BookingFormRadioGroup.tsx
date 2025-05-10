'use client';

import { forwardRef } from 'react';
import { cn } from '@/utils/cn';
import { FormError } from '@/components/forms/components/FormError';

export type RadioOption = {
  value: string;
  label: string;
};

export type BookingFormRadioGroupProps =
  React.InputHTMLAttributes<HTMLInputElement> & {
    options: RadioOption[];
    containerClassName?: string;
    error?: string | undefined;
    label?: string;
  };

export const BookingFormRadioGroup = forwardRef<
  HTMLInputElement,
  BookingFormRadioGroupProps
>(
  (
    { options, containerClassName, error, label, onChange, value, ...props },
    ref,
  ) => {
    return (
      <div className={cn('space-y-2 relative', containerClassName)}>
        {label && <div className="font-medium text-sm mb-1">{label}</div>}
        <div className="flex flex-col gap-2">
          {options.map((option) => (
            <label
              key={option.value}
              className="flex items-center gap-3 p-3 border rounded-md cursor-pointer hover:bg-muted/10 transition-colors"
            >
              <div className="relative flex items-center justify-center">
                <input
                  ref={ref}
                  type="radio"
                  className="absolute w-5 h-5 opacity-0 z-10 cursor-pointer"
                  value={option.value}
                  checked={value === option.value}
                  onChange={(e) => {
                    if (onChange) {
                      onChange(e);
                    }
                  }}
                  {...props}
                />
                <div className="w-5 h-5 border-2 border-primary rounded-full"></div>
                <div
                  className={`absolute w-3 h-3 bg-primary rounded-full transform transition-transform duration-200 ${
                    value === option.value ? 'scale-100' : 'scale-0'
                  }`}
                >
                  {/* Selected circle */}
                </div>
              </div>
              <span className="text-sm font-medium">{option.label}</span>
            </label>
          ))}
        </div>

        <FormError className="bottom-[-24px]" error={error} />
      </div>
    );
  },
);

BookingFormRadioGroup.displayName = 'BookingFormRadioGroup';
