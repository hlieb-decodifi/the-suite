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
      <div
        className="relative"
        style={{
          width: variant === 'large' ? '140px' : '80px',
          height: variant === 'large' ? '60px' : '40px',
        }}
      >
        <Image
          src={logoSrc}
          alt={logoAlt}
          fill
          className="object-contain"
          priority
        />
      </div>
    </Link>
  );
}
