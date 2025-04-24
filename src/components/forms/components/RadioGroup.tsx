import { forwardRef } from 'react';
import { cn } from '@/utils/cn';

export type RadioOption = {
  value: string;
  label: string;
};

export type RadioGroupProps = React.InputHTMLAttributes<HTMLInputElement> & {
  options: RadioOption[];
  containerClassName?: string;
  error?: string | undefined;
  label?: string;
};

export const RadioGroup = forwardRef<HTMLInputElement, RadioGroupProps>(
  (
    { options, containerClassName, error, label, onChange, value, ...props },
    ref,
  ) => {
    return (
      <div className={cn('space-y-2 relative pb-6', containerClassName)}>
        {label && <div className="font-medium text-sm mb-1">{label}</div>}
        <div className="flex items-center gap-6">
          {options.map((option) => (
            <label
              key={option.value}
              className="flex items-center gap-3 cursor-pointer"
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
                <div className="w-5 h-5 border-2 border-[#DEA85B] rounded-full"></div>
                <div
                  className={`absolute w-3 h-3 bg-[#DEA85B] rounded-full transform transition-transform duration-200 ${
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
        <div className="min-h-5 absolute bottom-0 left-0 w-full">
          {error && <div className="text-xs text-destructive">{error}</div>}
        </div>
      </div>
    );
  },
);

RadioGroup.displayName = 'RadioGroup';
