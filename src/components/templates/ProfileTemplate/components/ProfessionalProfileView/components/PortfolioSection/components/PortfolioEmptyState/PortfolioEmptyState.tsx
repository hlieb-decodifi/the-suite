'use client';

import { Typography } from '@/components/ui/typography';

export function PortfolioEmptyState() {
  return (
    <div className="bg-muted rounded-md p-8 text-center">
      <Typography className="text-muted-foreground">
        No portfolio images yet. Upload your first photo to showcase your work.
      </Typography>
    </div>
  );
}
