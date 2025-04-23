'use client';

import { Typography } from '@/components/ui/typography';
import { cn } from '@/utils/cn';

export type FooterProps = {
  className?: string;
};

export function Footer({ className }: FooterProps) {
  return (
    <footer className={cn('border-t py-6 md:py-8', className)}>
      <div className="container flex flex-col items-center justify-between gap-4 md:flex-row">
        <Typography variant="small" className="text-center md:text-left">
          &copy; {new Date().getFullYear()} FOCUSED for business. All rights
          reserved.
        </Typography>
        <div className="flex items-center gap-4">
          <Typography variant="small" className="text-muted-foreground">
            Powered by Next.js
          </Typography>
        </div>
      </div>
    </footer>
  );
}
