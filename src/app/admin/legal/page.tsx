'use client';

import { Typography } from '@/components/ui/typography';

export default function LegalPage() {
  return (
    <div className="p-4">
      <Typography variant="h3" className="mb-2">Legal</Typography>
      <Typography className="text-muted-foreground">Privacy policy and terms & conditions can be updated here.</Typography>
    </div>
  );
}
