'use client';

import Image from 'next/image';
import { Typography } from '@/components/ui/typography';
import { User } from 'lucide-react';

export type MobileUserProfileProps = {
  userInfo: {
    name: string;
    email: string;
    avatarUrl?: string;
  };
};

export function MobileUserProfile({ userInfo }: MobileUserProfileProps) {
  return (
    <div className="flex items-center gap-3 p-3 bg-[#F5F5F5] rounded-md">
      {userInfo.avatarUrl ? (
        <Image
          src={userInfo.avatarUrl}
          alt="User avatar"
          width={40}
          height={40}
          className="rounded-full"
        />
      ) : (
        <div className="w-10 h-10 rounded-full bg-[#DEA85B] flex items-center justify-center">
          <User size={20} className="text-white" />
        </div>
      )}
      <div>
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
    </div>
  );
}
