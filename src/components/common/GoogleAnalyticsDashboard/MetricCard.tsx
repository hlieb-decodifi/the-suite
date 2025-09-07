'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Typography } from '@/components/ui/typography';
import { LucideIcon } from 'lucide-react';

export type MetricCardProps = {
  title: string;
  value: string | number;
  icon: LucideIcon;
  iconColor?: string;
  className?: string;
};

export function MetricCard({
  title,
  value,
  icon: Icon,
  iconColor = 'text-blue-500',
  className,
}: MetricCardProps) {
  return (
    <Card className={className}>
      <CardContent className="p-6">
        <div className="flex items-center space-x-2">
          <Icon className={`w-5 h-5 ${iconColor}`} />
          <Typography className="text-sm font-medium text-muted-foreground">
            {title}
          </Typography>
        </div>
        <Typography variant="h2" className="mt-2">
          {value}
        </Typography>
      </CardContent>
    </Card>
  );
}
