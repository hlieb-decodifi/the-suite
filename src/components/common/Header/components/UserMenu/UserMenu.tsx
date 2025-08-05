'use client';

import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { SignOutButton } from '@/components/common/SignOutButton/SignOutButton';
import { UserProfileSummary } from '@/components/common/Header/components/UserProfileSummary/UserProfileSummary';
import { MessageBadge } from '@/components/ui/message-badge';

export type UserMenuProps = {
  userInfo: {
    name: string;
    email: string;
    avatarUrl?: string | null;
    isAdmin?: boolean;
  };
  isProfessional?: boolean;
  unreadMessagesCount?: number;
};

export function UserMenu({
  userInfo,
  isProfessional,
  unreadMessagesCount = 0,
}: UserMenuProps) {
  const isAdmin = userInfo?.isAdmin;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="cursor-pointer px-1 py-1 rounded-lg transition-colors">
          <UserProfileSummary
            userInfo={userInfo}
            as="div"
            className="cursor-pointer"
          />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem asChild>
          <Link href={isAdmin ? '/admin' : '/dashboard'} className="w-full cursor-pointer">
            Dashboard
          </Link>
        </DropdownMenuItem>
        {!isAdmin && (
          <>
            <DropdownMenuItem asChild>
              <Link
                href={isProfessional ? '/profile' : '/client-profile'}
                className="w-full cursor-pointer"
              >
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link
                href="/dashboard/appointments"
                className="w-full cursor-pointer"
              >
                My Bookings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link
                href="/dashboard/messages"
                className="w-full cursor-pointer flex items-center justify-between"
              >
                <span>Messages</span>
                <MessageBadge count={unreadMessagesCount} size="sm" />
              </Link>
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <SignOutButton className="w-full justify-start" />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
