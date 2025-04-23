import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/utils/cn';

const typographyVariants = cva('text-foreground', {
  variants: {
    variant: {
      h1: 'scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl',
      h2: 'scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0',
      h3: 'scroll-m-20 text-2xl font-semibold tracking-tight',
      h4: 'scroll-m-20 text-xl font-semibold tracking-tight',
      h5: 'scroll-m-20 text-lg font-semibold tracking-tight',
      h6: 'scroll-m-20 text-base font-semibold tracking-tight',
      p: 'leading-7',
      blockquote: 'mt-6 border-l-2 pl-6 italic',
      ul: 'my-6 ml-6 list-disc [&>li]:mt-2',
      inlineCode:
        'relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold',
      lead: 'text-xl text-muted-foreground',
      large: 'text-lg font-semibold',
      small: 'text-sm font-medium leading-none',
      muted: 'text-sm text-muted-foreground',
      subtle: 'text-muted-foreground',
    },
  },
  defaultVariants: {
    variant: 'p',
  },
});

export type TypographyProps = React.HTMLAttributes<HTMLElement> &
  VariantProps<typeof typographyVariants> & {
    as?: React.ElementType;
  };

// Map variant to appropriate HTML element if not explicitly specified
const getElementFromVariant = (
  variant: string | null | undefined,
): React.ElementType => {
  if (!variant) return 'p';

  // Handle heading variants
  if (/^h[1-6]$/.test(variant))
    return variant as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

  // Handle special variants
  switch (variant) {
    case 'blockquote':
      return 'blockquote';
    case 'inlineCode':
      return 'code';
    case 'ul':
      return 'ul';
    case 'p':
      return 'p';
    case 'lead':
      return 'p';
    case 'large':
      return 'div';
    case 'small':
      return 'small';
    case 'muted':
      return 'p';
    case 'subtle':
      return 'p';
    default:
      return 'p';
  }
};

const Typography = React.forwardRef<HTMLElement, TypographyProps>(
  ({ className, variant, as, ...props }, ref) => {
    // Use explicitly provided element type or determine based on variant
    const Component = as || getElementFromVariant(variant?.toString());

    return (
      <Component
        className={cn(typographyVariants({ variant, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);

Typography.displayName = 'Typography';

export { Typography, typographyVariants };
