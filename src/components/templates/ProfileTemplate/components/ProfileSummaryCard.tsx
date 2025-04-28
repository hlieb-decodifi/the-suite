'use client';

import { Typography } from '@/components/ui/typography';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SignOutButton } from '@/components/common/SignOutButton/SignOutButton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export type ProfileSummaryCardProps = {
  fullName: string;
  email: string;
  avatarUrl?: string;
};

export function ProfileSummaryCard({
  fullName,
  email,
  avatarUrl,
}: ProfileSummaryCardProps) {
  return (
    <Card className="md:col-span-1">
      <CardHeader>
        <CardTitle>Profile</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        <Avatar className="h-24 w-24">
          {avatarUrl ? (
            <AvatarImage src={avatarUrl} alt={fullName} />
          ) : (
            <AvatarFallback>
              {fullName
                .split(' ')
                .map((n) => n[0])
                .join('')}
            </AvatarFallback>
          )}
        </Avatar>

        <div className="text-center">
          <Typography variant="h3" className="font-semibold">
            {fullName}
          </Typography>
          <Typography variant="small" className="text-muted-foreground">
            {email}
          </Typography>
        </div>

        <SignOutButton className="w-full mt-4" />
      </CardContent>
    </Card>
  );
}
