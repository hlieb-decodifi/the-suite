import { cn } from '@/utils/cn';

export type FormErrorProps = {
  /**
   * Error message to display
   */
  error?: string | undefined;
  /**
   * Additional className for custom styling
   */
  className?: string;
};

/**
 * FormError component for displaying form validation errors
 * Uses absolute positioning to prevent layout shifts when errors appear/disappear
 */
export function FormError({ error, className }: FormErrorProps) {
  if (!error) return null;

  return (
    <div className={cn('min-h-5 absolute bottom-0 left-0 w-full', className)}>
      <div className="text-xs text-destructive">{error}</div>
    </div>
  );
}
