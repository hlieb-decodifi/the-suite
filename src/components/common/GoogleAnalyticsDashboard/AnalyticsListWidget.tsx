'use client';

import { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Typography } from '@/components/ui/typography';
import { BarChart3 } from 'lucide-react';

export type AnalyticsListItem = {
  id: string | number;
  primary: string | ReactNode;
  secondary?: string | ReactNode;
  value: string | number;
  subValue?: string | ReactNode;
  icon?: ReactNode;
};

export type AnalyticsListWidgetProps = {
  title: string;
  items: AnalyticsListItem[];
  className?: string;
  emptyMessage?: string;
  emptyDescription?: string;
};

function EmptyState({
  message = 'No data available',
  description = 'Data will appear here once available.',
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

export function AnalyticsListWidget({
  title,
  items,
  className,
  emptyMessage,
  emptyDescription,
}: AnalyticsListWidgetProps) {
  const hasItems = items && items.length > 0;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {hasItems ? (
          <div className="space-y-4">
            {items.map((item) => (
              <div key={item.id} className="flex items-center justify-between">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  {item.icon && item.icon}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">
                      {typeof item.primary === 'string' ? (
                        <Typography className="font-medium truncate">
                          {item.primary}
                        </Typography>
                      ) : (
                        item.primary
                      )}
                    </div>
                    {item.secondary && (
                      <div className="text-sm text-muted-foreground">
                        {typeof item.secondary === 'string' ? (
                          <Typography className="text-sm text-muted-foreground">
                            {item.secondary}
                          </Typography>
                        ) : (
                          item.secondary
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <Typography className="font-medium">{item.value}</Typography>
                  {item.subValue && (
                    <div className="text-sm text-muted-foreground">
                      {typeof item.subValue === 'string' ? (
                        <Typography className="text-sm text-muted-foreground">
                          {item.subValue}
                        </Typography>
                      ) : (
                        item.subValue
                      )}
                    </div>
                  )}
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
