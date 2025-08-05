"use client";

import { Typography } from '@/components/ui/typography';

export default function AdminAdminsPageClient() {
  return (
    <div className="p-4">
      <Typography variant="h3" className="mb-2">Admins</Typography>
      <Typography className="text-muted-foreground">List of admin users will be displayed here.</Typography>
    </div>
  );
}
