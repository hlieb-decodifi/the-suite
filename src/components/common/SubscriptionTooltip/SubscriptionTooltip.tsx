'use client';

import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipArrow,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/utils/cn';
import { Sparkles } from 'lucide-react';

type SubscriptionTooltipProps = {
  isSubscribed: boolean;
  isConnected: boolean;
  activeTab: string;
};

export const SubscriptionTooltip = ({
  isSubscribed,
  isConnected,
  activeTab,
}: SubscriptionTooltipProps) => {
  if (isSubscribed && isConnected) return null;

  return (
    <TooltipProvider>
      <Tooltip delayDuration={100}>
        <TooltipTrigger className="ml-2" asChild>
          <div className="flex items-center">
            <Badge
              variant="outline"
              className={cn(
                'py-0 px-1 h-5',
                activeTab === 'subscription'
                  ? 'border-white text-white'
                  : 'border-primary text-primary',
              )}
            >
              <Sparkles className="h-3 w-3" />
            </Badge>
          </div>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          align="center"
          alignOffset={0}
          className="bg-white border border-primary text-primary"
          sideOffset={5}
        >
          <p>
            {isConnected
              ? 'Subscribe to enable client bookings and appointment scheduling'
              : 'Connect your Stripe account to enable client bookings and appointment scheduling'}
          </p>
          <TooltipArrow className="ml-1 fill-primary" width={11} height={5} />
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
