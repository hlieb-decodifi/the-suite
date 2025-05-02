'use client';

import { useState, useRef, useEffect } from 'react';
import { Typography } from '@/components/ui/typography';
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';

export type ExpandableTextProps = {
  text: string;
  maxLines?: number;
  className?: string;
  textClassName?: string;
  variant?: React.ComponentProps<typeof Typography>['variant'];
  lineHeight?: string;
};

// Helper function to calculate max height
const calculateMaxHeight = (
  element: HTMLDivElement,
  maxLines: number,
): number => {
  const computedStyle = getComputedStyle(element);
  const lineHeightValue = parseFloat(computedStyle.lineHeight);

  // Use actual line height from computed style or estimate based on font size
  const calculatedLineHeight = isNaN(lineHeightValue)
    ? parseFloat(computedStyle.fontSize) * 1.2
    : lineHeightValue;

  return calculatedLineHeight * maxLines;
};

export function ExpandableText({
  text,
  maxLines = 3,
  className,
  textClassName,
  variant = 'p',
}: ExpandableTextProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkOverflow = () => {
      const element = textRef.current;
      if (!element) return;

      const maxHeight = calculateMaxHeight(element, maxLines);
      setIsOverflowing(element.scrollHeight > maxHeight);
    };

    // Run on mount and when text changes
    const timer = setTimeout(checkOverflow, 10); // Small delay to ensure rendering
    window.addEventListener('resize', checkOverflow);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', checkOverflow);
    };
  }, [text, maxLines]);

  return (
    <div className={cn('space-y-1', className)}>
      <div
        ref={textRef}
        className={cn(
          'overflow-hidden transition-all duration-200 whitespace-normal break-words',
          !isExpanded && `line-clamp-${maxLines}`,
          textClassName,
        )}
      >
        <Typography
          variant={variant}
          className={cn(
            // Override Typography's default line height when using variant 'p'
            variant === 'p' && 'leading-6',
          )}
        >
          {text}
        </Typography>
      </div>

      {isOverflowing && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-1 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? (
            <>
              <ChevronUp className="h-3 w-3 mr-1" />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3 mr-1" />
              Show more
            </>
          )}
        </Button>
      )}
    </div>
  );
}
