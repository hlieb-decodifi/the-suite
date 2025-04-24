'use client';

import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/utils/cn';

export type LogoProps = {
  variant?: 'large' | 'small';
  className?: string;
};

export function Logo({ variant = 'large', className }: LogoProps) {
  const logoSrc =
    variant === 'large' ? '/images/logo-large.svg' : '/images/logo-small.svg';

  const logoAlt = 'The Suite Logo';

  return (
    <Link href="/" className={cn('inline-block', className)}>
      <Image
        src={logoSrc}
        alt={logoAlt}
        width={variant === 'large' ? 140 : 80}
        height={variant === 'large' ? 60 : 40}
        className="h-auto"
        priority
      />
    </Link>
  );
}
