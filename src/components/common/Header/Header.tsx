'use client';

import Link from 'next/link';
import { Typography } from '@/components/ui/typography';
import { Button } from '@/components/ui/button';
import { cn } from '@/utils/cn';

export type HeaderProps = {
  className?: string;
};

export function Header({ className }: HeaderProps) {
  return (
    <header className={cn('border-b py-4', className)}>
      <div className="container flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-2">
          <Typography variant="large" className="font-bold tracking-tight">
            FOCUSED
          </Typography>
          <Typography variant="small" className="text-muted-foreground">
            for business
          </Typography>
        </Link>

        <nav className="flex items-center gap-4">
          <Link href="/" className="text-sm font-medium">
            Home
          </Link>
          <Link href="/#components" className="text-sm font-medium">
            Components
          </Link>
          <Button size="sm">Login</Button>
        </nav>
      </div>
    </header>
  );
}
