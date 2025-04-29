'use client';

import { useClientProfile } from '@/api/profiles';
import { Separator } from '@/components/ui/separator';
import { Typography } from '@/components/ui/typography';
import { User } from '@supabase/supabase-js';
import { AccountSection } from './components/AccountSection/AccountSection';
import { DetailsSection } from './components/DetailsSection/DetailsSection';
import { LocationSection } from './components/LocationSection/LocationSection';
import { ProfileSkeleton } from './components/ProfileSkeleton';
import { ServicesSection } from './components/ServicesSection/ServicesSection';

export type ClientProfileViewProps = {
  user: User;
};

export function ClientProfileView({ user }: ClientProfileViewProps) {
  const { data, isLoading, error } = useClientProfile(user.id);
  const { profile, address } = data || { profile: null, address: null };

  if (isLoading) {
    return <ProfileSkeleton />;
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 rounded-lg border border-red-200 text-red-700">
        <h3 className="text-lg font-semibold mb-2">Error loading profile</h3>
        <p>There was a problem loading your profile. Please try again later.</p>
        <p className="text-sm mt-2">
          {error instanceof Error ? error.message : 'Unknown error'}
        </p>
      </div>
    );
  }

  const hasAddress = Boolean(
    address?.city || address?.state || address?.country,
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
          <DetailsSection user={user} profile={profile} />
          <LocationSection user={user} profile={profile} address={address} />
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
