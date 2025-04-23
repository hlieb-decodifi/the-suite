import { Label } from '@/components/ui/label';
import { ReactNode } from 'react';
import { cn } from '@/utils/cn';

export type FormFieldProps = {
  /**
   * Label for the form field
   */
  label: string;

  /**
   * ID for the form field (for label association)
   */
  id: string;

  /**
   * Child component (input, select, etc.)
   */
  children: ReactNode;

  /**
   * Error message to display if any
   */
  error?: string | undefined;

  /**
   * Additional className for the container
   */
  className?: string | undefined;
};

export function FormField({
  label,
  id,
  children,
  error,
  className,
}: FormFieldProps) {
  return (
    <div className={cn('space-y-1.5 w-full relative pb-5', className)}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error && (
        <div className="text-xs text-destructive absolute bottom-0 left-0">
          {error}
        </div>
      )}
    </div>
  );
}
