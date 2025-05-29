'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Typography } from '@/components/ui/typography';
import { MessageCircleIcon } from 'lucide-react';

type DashboardMessagesPageClientProps = {
  isProfessional: boolean;
};

export function DashboardMessagesPageClient({
  isProfessional,
}: DashboardMessagesPageClientProps) {
  return (
    <div className="space-y-6">
      <Typography variant="h3" className="font-semibold">
        Messages
      </Typography>

      <Card>
        <CardContent className="flex flex-col items-center justify-center text-center py-16">
          <div className="rounded-full bg-primary/10 p-6 mb-4">
            <MessageCircleIcon className="h-12 w-12 text-primary" />
          </div>
          <Typography variant="h3" className="font-semibold mb-2">
            Messaging Coming Soon
          </Typography>
          <Typography className="text-muted-foreground max-w-md mb-6">
            We're working on an in-app messaging feature to make communication
            between
            {isProfessional
              ? ' you and your clients '
              : ' you and your service providers '}
            even easier.
          </Typography>
          <Typography variant="small" className="text-muted-foreground">
            For now, please use email or phone to communicate with
            {isProfessional ? ' your clients.' : ' your service providers.'}
          </Typography>
        </CardContent>
      </Card>
    </div>
  );
}
