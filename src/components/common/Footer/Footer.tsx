'use client';

import Link from 'next/link';
import { Typography } from '@/components/ui/typography';
import { cn } from '@/utils/cn';
import { SocialLinks } from './components/SocialLinks/SocialLinks';
import { FooterNavigation } from './components/FooterNavigation/FooterNavigation';

export type FooterProps = {
  className?: string;
};

export function Footer({ className }: FooterProps) {
  return (
    <footer className={cn('border-t border-border py-8', className)}>
      <div className="container">
        <div className="flex flex-col gap-8 md:flex-row md:justify-between md:gap-0">
          {/* Logo and Nav Links */}
          <FooterNavigation />

          {/* Social Links */}
          <SocialLinks />
        </div>

        {/* Footer Bottom */}
        <div className="mt-8 flex flex-col gap-4 md:flex-row md:justify-between md:items-center">
          <Typography variant="p" className="text-foreground">
            © {new Date().getFullYear()} The Suite. All rights reserved.
          </Typography>

          <div className="flex gap-6">
            <Link
              href="/terms-and-conditions"
              className="text-foreground hover:text-primary"
            >
              Terms & Conditions
            </Link>
            <Link
              href="/privacy-policy"
              className="text-foreground hover:text-primary"
            >
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
