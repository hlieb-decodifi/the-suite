'use client';

import Link from 'next/link';
import { Facebook, Instagram } from 'lucide-react';
import { cn } from '@/utils/cn';

export type SocialLinksProps = {
  className?: string;
};

export function SocialLinks({ className }: SocialLinksProps) {
  return (
    <div className={cn('flex items-center gap-4', className)}>
      <Link
        href="https://www.instagram.com/thesuiteservice/"
        aria-label="Instagram"
        target="_blank"
        rel="noopener noreferrer"
      >
        <Instagram size={24} className="text-secondary hover:text-primary" />
      </Link>
      <Link
        href="https://www.facebook.com/TheSuiteService/"
        aria-label="Facebook"
        target="_blank"
        rel="noopener noreferrer"
      >
        <Facebook size={24} className="text-secondary hover:text-primary" />
      </Link>
    </div>
  );
}
