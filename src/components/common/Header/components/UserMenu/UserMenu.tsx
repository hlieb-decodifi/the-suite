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
  };
  isProfessional?: boolean;
  unreadMessagesCount?: number;
  unreadSupportRequestsCount?: number;
};

export function UserMenu({
  userInfo,
  isProfessional,
  unreadMessagesCount = 0,
  unreadSupportRequestsCount = 0,
}: UserMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="cursor-pointer px-1 py-1 rounded-lg transition-colors">
          <UserProfileSummary
            userInfo={userInfo}
            as="div"
            className="cursor-pointer"
            unreadMessagesCount={unreadMessagesCount}
            unreadSupportRequestsCount={unreadSupportRequestsCount}
          />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem asChild>
          <Link href="/dashboard" className="w-full cursor-pointer">
            Dashboard
          </Link>
        </DropdownMenuItem>
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
        <DropdownMenuItem asChild>
          <Link
            href="/dashboard/support-requests"
            className="w-full cursor-pointer flex items-center justify-between"
          >
            <span>Support Requests</span>
            <MessageBadge count={unreadSupportRequestsCount} size="sm" />
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <SignOutButton className="w-full justify-start" />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
