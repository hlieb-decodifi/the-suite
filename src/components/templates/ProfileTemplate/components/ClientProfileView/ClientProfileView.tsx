'use client';

import { User } from '@supabase/supabase-js';
import { AccountSection } from './components/AccountSection/AccountSection';
import { DetailsSection } from './components/DetailsSection/DetailsSection';
import { LocationSection } from './components/LocationSection/LocationSection';
import { Typography } from '@/components/ui/typography';
import { Separator } from '@/components/ui/separator';
import { ServicesSection } from './components/ServicesSection/ServicesSection';

export type ClientProfileViewProps = {
  user: User;
};

export function ClientProfileView({ user }: ClientProfileViewProps) {
  const hasAddress = Boolean(
    user.user_metadata?.address?.city ||
      user.user_metadata?.address?.state ||
      user.user_metadata?.address?.country,
  );

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Typography variant="h2" className="font-bold text-[#313131]">
          Your Profile
        </Typography>
        <Typography className="text-[#5D6C6F]">
          Manage your personal information and preferences
        </Typography>
        <Separator className="my-4" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 space-y-6">
          <AccountSection user={user} />
          <div className="hidden md:block p-6 bg-[#F5F5F5] rounded-lg border border-[#ECECEC]">
            <Typography variant="h4" className="font-bold text-[#313131] mb-4">
              Manage Your Account
            </Typography>
            <ul className="space-y-2 text-[#5D6C6F]">
              <li className="flex items-center">
                <span className="mr-2 text-[#DEA85B]">•</span>
                <Typography variant="small">
                  Update your personal details
                </Typography>
              </li>
              <li className="flex items-center">
                <span className="mr-2 text-[#DEA85B]">•</span>
                <Typography variant="small">
                  Keep your address information current
                </Typography>
              </li>
              <li className="flex items-center">
                <span className="mr-2 text-[#DEA85B]">•</span>
                <Typography variant="small">
                  Change your password regularly
                </Typography>
              </li>
            </ul>
          </div>
        </div>

        <div className="md:col-span-2 space-y-8">
          <DetailsSection user={user} />
          <LocationSection user={user} />

          {hasAddress && (
            <>
              <Separator className="my-8" />
              <ServicesSection user={user} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
