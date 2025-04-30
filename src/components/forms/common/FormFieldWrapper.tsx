import React from 'react';
import {
  Control,
  ControllerRenderProps,
  FieldValues,
  Path,
} from 'react-hook-form';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { cn } from '@/utils/cn';

// Define props for the wrapper
export type FormFieldWrapperProps<TFieldValues extends FieldValues> = {
  control: Control<TFieldValues>;
  name: Path<TFieldValues>;
  label: string;
  labelSrOnly?: boolean; // Add prop for screen-reader-only label
  children: (
    field: ControllerRenderProps<TFieldValues, Path<TFieldValues>>,
  ) => React.ReactNode;
  className?: string; // Optional className for FormItem
  labelClassName?: string; // Optional className for FormLabel
  messageClassName?: string; // Optional className for FormMessage
  showErrorMessage?: boolean; // New prop to control message visibility
};

export function FormFieldWrapper<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  labelSrOnly = false, // Default to false
  children,
  className,
  labelClassName,
  messageClassName,
  showErrorMessage = true, // Default to true
}: FormFieldWrapperProps<TFieldValues>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field, fieldState: { error } }) => (
        // Add relative positioning and bottom margin
        <FormItem className={cn('relative space-y-1', className)}>
          <FormLabel
            className={cn(
              error && 'text-foreground',
              labelSrOnly && 'sr-only', // Apply sr-only class if prop is true
              labelClassName,
            )}
          >
            {label}
          </FormLabel>
          <FormControl>{children(field)}</FormControl>
          {/* Conditionally render FormMessage */}
          {showErrorMessage && (
            <FormMessage
              className={cn(
                'absolute text-destructive text-xs',
                messageClassName,
              )}
            />
          )}
        </FormItem>
      )}
    />
  );
}
