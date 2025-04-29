'use client';

import { SignOutButton } from '@/components/common/SignOutButton/SignOutButton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Typography } from '@/components/ui/typography';
import { User } from '@supabase/supabase-js';
import { LayoutDashboard } from 'lucide-react';
import { useState } from 'react';
import { ChangePasswordModal } from '@/components/modals/ChangePasswordModal/ChangePasswordModal';
import { UpdateEmailModal } from '@/components/modals/UpdateEmailModal/UpdateEmailModal';
import Link from 'next/link';
import { AvatarUpload } from '@/components/common/AvatarUpload';

export type AccountSectionProps = {
  user: User;
};

export function AccountSection({ user }: AccountSectionProps) {
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);

  const fullName = `${user.user_metadata?.first_name || ''} ${
    user.user_metadata?.last_name || ''
  }`.trim();
  const email = user.email || '';

  return (
    <>
      <Card className="border-border overflow-hidden">
        <div className="bg-gradient-to-r from-primary to-primary/80 h-16" />
        <CardHeader className="-mt-8 flex flex-col items-center pb-2">
          <AvatarUpload
            userId={user.id}
            fallbackName={fullName || email}
            avatarContainerClassName="border-4 border-white shadow-md"
            buttonClassName="absolute bottom-0 right-0"
            size="xl"
          />
          <Typography variant="h3" className="font-bold mt-4 text-foreground">
            {fullName || 'User'}
          </Typography>
          <Typography variant="small" className="text-muted-foreground">
            {email}
          </Typography>
        </CardHeader>
        <CardContent className="pt-2">
          <Separator className="my-4" />
          <div className="space-y-3">
            <Link href="/dashboard" className="w-full cursor-pointer">
              <Button
                variant="outline"
                className="w-full font-medium justify-start text-foreground border-border hover:bg-muted hover:text-primary hover:border-primary"
              >
                <LayoutDashboard size={16} className="mr-2 text-primary" />
                Go to Dashboard
              </Button>
            </Link>
            <Separator className="my-3" />
            <SignOutButton className="w-full bg-background border border-border text-muted-foreground hover:bg-muted hover:text-foreground" />
          </div>
        </CardContent>
      </Card>
      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onOpenChange={setIsPasswordModalOpen}
      />
      <UpdateEmailModal
        isOpen={isEmailModalOpen}
        onOpenChange={setIsEmailModalOpen}
        user={user}
      />
    </>
  );
}
