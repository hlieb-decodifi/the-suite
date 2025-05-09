'use client';

import { Button } from '@/components/ui/button';
import { ReactNode } from 'react';
import { cn } from '@/utils';

export type DashboardTemplateWidgetProps = {
  /** The content to display in the widget */
  children: ReactNode;
  /** The loading state of the widget */
  isLoading?: boolean;
  /** The loading content to display when loading */
  loadingContent?: ReactNode;
  /** The content to display when there is no data */
  emptyContent?: ReactNode;
  /** Whether the widget has data or not */
  isEmpty: boolean;
  /** The callback function when the "View all" button is clicked */
  onViewAllClick?: (() => void) | undefined;
  /** The text for the "View all" button */
  viewAllText?: string;
  /** Whether this widget links to an external page rather than just changing tabs */
  isExternalLink?: boolean;
  /** The URL to navigate to if isExternalLink is true */
  linkUrl?: string;
  /** Additional class names for the widget */
  className?: string;
};

export function DashboardTemplateWidget({
  children,
  isLoading = false,
  loadingContent,
  emptyContent,
  isEmpty,
  onViewAllClick,
  viewAllText = 'View all',
  isExternalLink = false,
  linkUrl,
  className,
}: DashboardTemplateWidgetProps) {
  // Handle click and scroll to top
  const handleViewAllClick = () => {
    if (onViewAllClick) {
      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
      // Call the provided callback
      onViewAllClick();
    }
  };

  // Determine button action based on whether it's an external link or not
  const ActionButton = () => (
    <Button
      variant="default"
      className="w-full"
      onClick={isExternalLink ? undefined : handleViewAllClick}
      disabled={isEmpty}
      {...(isExternalLink && linkUrl ? { asChild: true } : {})}
    >
      {isExternalLink && linkUrl ? (
        <a href={linkUrl}>{viewAllText}</a>
      ) : (
        viewAllText
      )}
    </Button>
  );

  return (
    <div
      className={cn(
        'rounded-md border overflow-hidden flex flex-col',
        className,
      )}
    >
      {/* Content area */}
      {isLoading ? (
        loadingContent
      ) : isEmpty ? (
        emptyContent
      ) : (
        <div className="divide-y flex-1 min-h-[210px]">{children}</div>
      )}

      {/* Action button */}
      <div className="p-4 bg-muted/5 border-t mt-auto">
        <ActionButton />
      </div>
    </div>
  );
}
