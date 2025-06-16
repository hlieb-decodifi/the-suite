'use client';

import Link from 'next/link';
import { cn } from '@/utils/cn';
import { Logo } from '@/components/common/Logo/Logo';
import { FooterNavigationProps } from './types';

export function FooterNavigation({ className }: FooterNavigationProps) {
  return (
    <div className={cn('flex flex-col gap-6', className)}>
      <div className="flex items-center gap-3">
        <Logo variant="large" />
      </div>

      <nav>
        <ul className="flex flex-wrap gap-6">
          <li>
            <Link
              href="/about-us"
              className="text-foreground hover:text-primary"
            >
              About us
            </Link>
          </li>
          <li>
            <Link
              href="/services"
              className="text-foreground hover:text-primary"
            >
              Services
            </Link>
          </li>
          <li>
            <Link
              href="/specialists"
              className="text-foreground hover:text-primary"
            >
              Specialists
            </Link>
          </li>
          <li>
            <Link
              href="/contact"
              className="text-foreground hover:text-primary"
            >
              Contact
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  );
}
