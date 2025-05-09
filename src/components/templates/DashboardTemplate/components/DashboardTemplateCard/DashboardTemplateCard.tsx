import { ReactNode } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Typography } from '@/components/ui/typography';
import { cn } from '@/utils';

export type DashboardTemplateCardProps = {
  title: string;
  value: string | number;
  description?: string;
  icon?: ReactNode;
  className?: string;
  valueClassName?: string;
  isLoading?: boolean;
  colorVariant?: 'default' | 'primary' | 'success' | 'warning' | 'destructive';
};

export function DashboardTemplateCard({
  title,
  value,
  description,
  icon,
  className,
  valueClassName,
  isLoading = false,
  colorVariant = 'default',
}: DashboardTemplateCardProps) {
  const colorVariants = {
    default: '',
    primary: 'border-primary/20',
    success: 'border-green-500/20',
    warning: 'border-yellow-500/20',
    destructive: 'border-destructive/20',
  };

  const valueColorVariants = {
    default: 'text-foreground',
    primary: 'text-primary',
    success: 'text-green-500',
    warning: 'text-yellow-500',
    destructive: 'text-destructive',
  };

  return (
    <Card className={cn('border', colorVariants[colorVariant], className)}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
          {icon && <div className="text-muted-foreground">{icon}</div>}
        </div>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-10 w-20 bg-muted/30 animate-pulse rounded" />
        ) : (
          <Typography
            variant="h3"
            className={cn(
              'text-2xl font-bold',
              valueColorVariants[colorVariant],
              valueClassName,
            )}
          >
            {value}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
