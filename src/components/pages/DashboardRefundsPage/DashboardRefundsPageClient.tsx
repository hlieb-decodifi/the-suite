'use client';

import { User } from '@supabase/supabase-js';
import { Card, CardContent } from '@/components/ui/card';
import { Typography } from '@/components/ui/typography';
import { RefreshCwIcon } from 'lucide-react';

type DashboardRefundsPageClientProps = {
  user: User;
  isProfessional: boolean;
};

export function DashboardRefundsPageClient({
  isProfessional,
}: DashboardRefundsPageClientProps) {
  return (
    <div className="space-y-6">
      <Typography variant="h3" className="font-semibold">
        Refunds
      </Typography>

      <Card>
        <CardContent className="flex flex-col items-center justify-center text-center py-16">
          <div className="rounded-full bg-primary/10 p-6 mb-4">
            <RefreshCwIcon className="h-12 w-12 text-primary" />
          </div>
          <Typography variant="h3" className="font-semibold mb-2">
            Refund Management Coming Soon
          </Typography>
          <Typography className="text-muted-foreground max-w-md mb-6">
            We're working on an advanced refund management system to make
            handling refunds
            {isProfessional
              ? ' for your services easier and more transparent.'
              : ' smoother and more convenient.'}
          </Typography>
          <Typography variant="small" className="text-muted-foreground">
            For now, please contact
            {isProfessional
              ? ' your client directly to handle refund requests.'
              : ' the service provider directly for refund requests.'}
          </Typography>
        </CardContent>
      </Card>
    </div>
  );
}
