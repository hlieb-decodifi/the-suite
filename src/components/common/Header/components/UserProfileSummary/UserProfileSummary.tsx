'use client';

import { Avatar, AvatarImage } from '@/components/ui/avatar';
import { Typography } from '@/components/ui/typography';
import { cn } from '@/utils/cn';
import { User } from 'lucide-react';
import * as React from 'react';
import { useAuthStore } from '@/stores/authStore';

export type UserProfileSummaryProps = {
  userInfo: {
    name: string;
    email: string;
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
  const avatarUrl = useAuthStore((state) => state.avatarUrl);

  const shared = (
    <>
      {avatarUrl ? (
        <Avatar>
          <AvatarImage
            src={avatarUrl}
            alt="User avatar"
            className="object-cover size-10 rounded-full"
          />
        </Avatar>
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
