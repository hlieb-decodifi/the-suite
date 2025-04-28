'use client';

import Image from 'next/image';
import { Typography } from '@/components/ui/typography';
import { User } from 'lucide-react';
import { cn } from '@/utils/cn';
import * as React from 'react';

export type UserProfileSummaryProps = {
  userInfo: {
    name: string;
    email: string;
    avatarUrl?: string;
  };
  className?: string;
  as?: 'div' | 'button';
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  tabIndex?: number;
};

export function UserProfileSummary({
  userInfo,
  className,
  as = 'div',
  onClick,
  tabIndex,
}: UserProfileSummaryProps) {
  const shared = (
    <>
      {userInfo.avatarUrl ? (
        <Image
          src={userInfo.avatarUrl}
          alt="User avatar"
          width={40}
          height={40}
          className="rounded-full"
        />
      ) : (
        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
          <User size={20} className="text-primary-foreground" />
        </div>
      )}
      <div className="flex flex-col text-left justify-center">
        <Typography
          variant="small"
          className="font-medium text-foreground leading-tight"
        >
          {userInfo.name}
        </Typography>
        <Typography
          variant="small"
          className="text-muted-foreground text-xs leading-tight"
        >
          {userInfo.email}
        </Typography>
      </div>
    </>
  );

  if (as === 'button') {
    return (
      <button
        type="button"
        className={cn('flex items-center gap-3', className)}
        onClick={onClick}
        tabIndex={tabIndex}
        aria-haspopup="menu"
        aria-expanded={undefined}
      >
        {shared}
      </button>
    );
  }
  return (
    <div className={cn('flex items-center gap-3', className)}>{shared}</div>
  );
}
