'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Typography } from '@/components/ui/typography';
import { BarChart3 } from 'lucide-react';

export type TopPageItem = {
  page: string;
  pageViews: number;
  averageTimeOnPage: number;
};

export type TopPagesWidgetProps = {
  title?: string;
  pages: TopPageItem[];
  formatNumber: (num: number) => string;
  formatDuration: (seconds: number) => string;
  className?: string;
  emptyMessage?: string;
  emptyDescription?: string;
};

function EmptyState({
  message = 'No page data available',
  description = 'Page analytics will appear here once your site receives traffic.',
}: {
  message?: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="rounded-full bg-muted p-3 mb-4">
        <BarChart3 className="w-6 h-6 text-muted-foreground" />
      </div>
      <Typography variant="h4" className="text-muted-foreground mb-2">
        {message}
      </Typography>
      <Typography className="text-sm text-muted-foreground max-w-sm">
        {description}
      </Typography>
    </div>
  );
}

export function TopPagesWidget({
  title = 'Top Pages',
  pages,
  formatNumber,
  formatDuration,
  className,
  emptyMessage,
  emptyDescription,
}: TopPagesWidgetProps) {
  const hasPages = pages && pages.length > 0;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {hasPages ? (
          <div className="space-y-4">
            {pages.map((page, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <Typography className="font-medium truncate">
                    {page.page}
                  </Typography>
                </div>
                <div className="flex items-center space-x-6">
                  <div className="text-right">
                    <Typography className="text-sm text-muted-foreground">
                      Page Views
                    </Typography>
                    <Typography className="font-medium">
                      {formatNumber(page.pageViews)}
                    </Typography>
                  </div>
                  <div className="text-right">
                    <Typography className="text-sm text-muted-foreground">
                      Avg. Time
                    </Typography>
                    <Typography className="font-medium">
                      {formatDuration(page.averageTimeOnPage)}
                    </Typography>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            {...(emptyMessage && { message: emptyMessage })}
            {...(emptyDescription && { description: emptyDescription })}
          />
        )}
      </CardContent>
    </Card>
  );
}
