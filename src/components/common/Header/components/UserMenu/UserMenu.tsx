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

export type UserMenuProps = {
  userInfo: {
    name: string;
    email: string;
    avatarUrl?: string | null;
  };
  isProfessional?: boolean;
};

export function UserMenu({ userInfo, isProfessional }: UserMenuProps) {
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
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <SignOutButton className="w-full justify-start" />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
