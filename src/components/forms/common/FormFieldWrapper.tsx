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
  children: (
    field: ControllerRenderProps<TFieldValues, Path<TFieldValues>>,
  ) => React.ReactNode;
  className?: string; // Optional className for FormItem
  labelClassName?: string; // Optional className for FormLabel
  messageClassName?: string; // Optional className for FormMessage
};

export function FormFieldWrapper<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  children,
  className,
  labelClassName,
  messageClassName,
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
              error && 'text-foreground', // Keep label color normal on error
              labelClassName,
            )}
          >
            {label}
          </FormLabel>
          <FormControl>{children(field)}</FormControl>
          {/* Position message absolutely */}
          <FormMessage
            className={cn(
              'absolute text-destructive text-xs',
              messageClassName,
            )}
          />
        </FormItem>
      )}
    />
  );
}
