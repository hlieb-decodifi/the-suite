'use client';

import Link from 'next/link';
import { MouseEventHandler } from 'react';

export type MobileNavLinksProps = {
  onItemClick?: () => void;
};

export function MobileNavLinks({ onItemClick }: MobileNavLinksProps) {
  const links = [
    { href: '/', label: 'Home' },
    { href: '/services', label: 'Services' },
    { href: '/specialists', label: 'Specialists' },
    { href: '/about', label: 'About Us' },
    { href: '/contact', label: 'Contact' },
  ];

  const handleClick: MouseEventHandler<HTMLAnchorElement> = () => {
    if (onItemClick) {
      onItemClick();
    }
  };

  return (
    <div className="flex flex-col gap-4 py-4">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="text-[#313131] font-medium"
          onClick={handleClick}
        >
          {link.label}
        </Link>
      ))}
    </div>
  );
}
