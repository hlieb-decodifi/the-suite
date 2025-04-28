'use client';

import { SignOutButton } from '@/components/common/SignOutButton/SignOutButton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Typography } from '@/components/ui/typography';
import { User } from '@supabase/supabase-js';
import { Key, Mail } from 'lucide-react';
import { useState } from 'react';
import { UploadButton } from './components/UploadButton';

export type AccountSectionProps = {
  user: User;
};

export function AccountSection({ user }: AccountSectionProps) {
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(
    user.user_metadata?.avatar_url,
  );

  const fullName = `${user.user_metadata?.first_name || ''} ${
    user.user_metadata?.last_name || ''
  }`.trim();

  const email = user.email || '';

  return (
    <Card className="border-[#ECECEC] overflow-hidden">
      <div className="bg-gradient-to-r from-[#DEA85B] to-[#C89245] h-16" />
      <CardHeader className="-mt-8 flex flex-col items-center pb-2">
        <div className="relative">
          <Avatar className="h-24 w-24 border-4 border-white shadow-md">
            {avatarUrl ? (
              <AvatarImage src={avatarUrl} alt={fullName} />
            ) : (
              <AvatarFallback className="bg-[#DEA85B] text-white text-xl font-semibold">
                {fullName
                  .split(' ')
                  .map((n) => n[0])
                  .join('')}
              </AvatarFallback>
            )}
          </Avatar>
          <UploadButton
            userId={user.id}
            onSuccess={setAvatarUrl}
            className="absolute bottom-0 right-0"
          />
        </div>
        <Typography variant="h3" className="font-bold mt-4 text-[#313131]">
          {fullName}
        </Typography>
        <Typography variant="small" className="text-[#5D6C6F]">
          {email}
        </Typography>
      </CardHeader>
      <CardContent className="pt-2">
        <Separator className="my-4" />
        <div className="space-y-3">
          <Button
            variant="outline"
            size="sm"
            className="w-full font-medium justify-start text-[#313131] border-[#ECECEC] hover:bg-[#F5F5F5] hover:text-[#DEA85B] hover:border-[#DEA85B]"
          >
            <Key size={16} className="mr-2 text-[#DEA85B]" />
            Change Password
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full font-medium justify-start text-[#313131] border-[#ECECEC] hover:bg-[#F5F5F5] hover:text-[#DEA85B] hover:border-[#DEA85B]"
          >
            <Mail size={16} className="mr-2 text-[#DEA85B]" />
            Update Email
          </Button>
          <Separator className="my-4" />
          <SignOutButton className="w-full bg-white border border-[#ECECEC] text-[#5D6C6F] hover:bg-[#F5F5F5] hover:text-[#313131]" />
        </div>
      </CardContent>
    </Card>
  );
}
