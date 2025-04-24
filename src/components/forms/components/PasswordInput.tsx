import { forwardRef, useState } from 'react';
import { FormInput, FormInputProps } from './FormInput';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/utils/cn';

export type PasswordInputProps = Omit<FormInputProps, 'type'> & {
  showPasswordToggle?: boolean;
};

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, showPasswordToggle = true, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);

    const togglePasswordVisibility = () => {
      setShowPassword((prev) => !prev);
    };

    return (
      <div className="relative">
        <FormInput
          type={showPassword ? 'text' : 'password'}
          className={cn(showPasswordToggle && 'pr-10', className)}
          ref={ref}
          {...props}
        />
        {showPasswordToggle && (
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/4 text-gray-400 hover:text-gray-600"
            onClick={togglePasswordVisibility}
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeOff size={20} aria-hidden="true" />
            ) : (
              <Eye size={20} aria-hidden="true" />
            )}
            <span className="sr-only">
              {showPassword ? 'Hide password' : 'Show password'}
            </span>
          </button>
        )}
      </div>
    );
  },
);

PasswordInput.displayName = 'PasswordInput';
