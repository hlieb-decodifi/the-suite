'use client';

import { useState, useRef, useLayoutEffect, useId } from 'react';
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

// Toggle button component to reduce main component line count
const ToggleButton = ({
  isExpanded,
  onClick,
}: {
  isExpanded: boolean;
  onClick: () => void;
}) => (
  <Button
    variant="ghost"
    size="sm"
    className="h-6 px-1 text-xs text-muted-foreground hover:text-foreground"
    onClick={onClick}
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
);

// Check if content is overflowing by comparing clamped height to full height
const checkContentOverflow = (
  textElement: HTMLDivElement | null,
  contentElement: HTMLDivElement | null,
): boolean => {
  if (!textElement || !contentElement) return false;

  // Create a temporary clone to measure full height without clamp
  const tempDiv = document.createElement('div');
  tempDiv.style.position = 'absolute';
  tempDiv.style.visibility = 'hidden';
  tempDiv.style.width = `${textElement.clientWidth}px`;
  tempDiv.innerHTML = contentElement.innerHTML;
  document.body.appendChild(tempDiv);

  // Get heights and compare
  const clampedHeight = textElement.clientHeight;
  const fullHeight = tempDiv.clientHeight;

  // Clean up
  document.body.removeChild(tempDiv);

  // Compare heights to determine if content is clamped
  return fullHeight > clampedHeight;
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
  const [hasBeenExpanded, setHasBeenExpanded] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const instanceId = useId();

  // Check overflow after DOM updates but before browser paint
  useLayoutEffect(() => {
    const checkOverflow = () => {
      const isOverflow = checkContentOverflow(
        textRef.current,
        contentRef.current,
      );
      setIsOverflowing(isOverflow);
    };

    // Check after component mounts or updates
    checkOverflow();

    // Check again after a delay to handle fonts or images loading
    const timer = setTimeout(checkOverflow, 100);

    return () => clearTimeout(timer);
  }, [text, maxLines, isExpanded]);

  // Toggle handler that also re-checks overflow state
  const handleToggle = () => {
    const newExpandedState = !isExpanded;
    setIsExpanded(newExpandedState);

    // If we're expanding, mark that this content has been expanded at least once
    if (newExpandedState) {
      setHasBeenExpanded(true);
    }
  };

  // Determine if we should show the toggle button
  const shouldShowToggle =
    isOverflowing || // Show when content overflows
    (hasBeenExpanded && isExpanded); // Always show "Show less" if expanded

  return (
    <div className={cn('space-y-1', className)} data-instance-id={instanceId}>
      <div
        ref={textRef}
        className={cn(
          'overflow-hidden transition-all duration-200 whitespace-normal break-words',
          !isExpanded && `line-clamp-${maxLines}`,
          textClassName,
        )}
      >
        <div ref={contentRef}>
          <Typography
            variant={variant}
            className={cn(variant === 'p' && 'leading-6')}
          >
            {text}
          </Typography>
        </div>
      </div>

      {shouldShowToggle && (
        <ToggleButton isExpanded={isExpanded} onClick={handleToggle} />
      )}
    </div>
  );
}
