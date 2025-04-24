'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Typography } from '@/components/ui/typography';
import { Button } from '@/components/ui/button';
import { User } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export type UserMenuProps = {
  userInfo: {
    name: string;
    email: string;
    avatarUrl?: string;
  };
};

export function UserMenu({ userInfo }: UserMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex items-center gap-2 p-0 hover:bg-transparent"
        >
          {userInfo.avatarUrl ? (
            <Image
              src={userInfo.avatarUrl}
              alt="User avatar"
              width={36}
              height={36}
              className="rounded-full"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-[#DEA85B] flex items-center justify-center">
              <User size={18} className="text-white" />
            </div>
          )}
          <div className="text-left">
            <Typography
              variant="small"
              className="font-futura font-medium text-[#313131]"
            >
              {userInfo.name}
            </Typography>
            <Typography
              variant="small"
              className="font-futura text-[#5D6C6F] text-xs"
            >
              {userInfo.email}
            </Typography>
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem>
          <Link href="/profile" className="w-full">
            Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Link href="/bookings" className="w-full">
            My Bookings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Link href="/logout" className="w-full">
            Logout
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
