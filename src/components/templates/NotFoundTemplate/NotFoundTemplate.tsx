'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Typography } from '@/components/ui/typography';
import { cn } from '@/utils/cn';

export type NotFoundTemplateProps = {
  className?: string;
};

export function NotFoundTemplate({ className }: NotFoundTemplateProps) {
  return (
    <div className={cn('container mx-auto px-4 py-16 text-center', className)}>
      <div className="max-w-md mx-auto flex flex-col items-center gap-6">
        {/* 404 Icon or Image */}
        <div className="text-primary text-7xl font-bold">404</div>

        {/* Heading */}
        <Typography variant="h2" className="text-foreground">
          Page Not Found
        </Typography>

        {/* Description */}
        <Typography variant="p" className="text-muted-foreground mb-6">
          The page you are looking for doesn't exist or has been moved.
        </Typography>

        {/* Back to Home Button */}
        <Button asChild className="font-medium">
          <Link href="/">Back to Home</Link>
        </Button>
      </div>
    </div>
  );
}
