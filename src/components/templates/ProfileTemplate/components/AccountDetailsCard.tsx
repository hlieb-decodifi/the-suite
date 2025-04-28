'use client';

import { Typography } from '@/components/ui/typography';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export type AccountDetailsCardProps = {
  firstName: string;
  lastName: string;
  email: string;
  userId: string;
};

export function AccountDetailsCard({
  firstName,
  lastName,
  email,
  userId,
}: AccountDetailsCardProps) {
  return (
    <Card className="md:col-span-2">
      <CardHeader>
        <CardTitle>Account Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Typography variant="small" className="text-muted-foreground">
              First Name
            </Typography>
            <Typography>{firstName || '-'}</Typography>
          </div>
          <div>
            <Typography variant="small" className="text-muted-foreground">
              Last Name
            </Typography>
            <Typography>{lastName || '-'}</Typography>
          </div>
          <div>
            <Typography variant="small" className="text-muted-foreground">
              Email
            </Typography>
            <Typography>{email}</Typography>
          </div>
          <div>
            <Typography variant="small" className="text-muted-foreground">
              Account ID
            </Typography>
            <Typography className="text-sm break-all">{userId}</Typography>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
