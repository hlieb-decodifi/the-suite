'use client';

import Link from 'next/link';
import { Facebook, Instagram, Twitter } from 'lucide-react';
import { cn } from '@/utils/cn';

export type SocialLinksProps = {
  className?: string;
};

export function SocialLinks({ className }: SocialLinksProps) {
  return (
    <div className={cn('flex items-center gap-4', className)}>
      <Link href="#" aria-label="Twitter">
        <Twitter size={24} className="text-secondary hover:text-primary" />
      </Link>
      <Link href="#" aria-label="Instagram">
        <Instagram size={24} className="text-secondary hover:text-primary" />
      </Link>
      <Link href="#" aria-label="Facebook">
        <Facebook size={24} className="text-secondary hover:text-primary" />
      </Link>
    </div>
  );
}
