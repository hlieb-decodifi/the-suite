'use client';

import { useProfile } from '@/api/profiles/hooks';
import { useWorkingHours } from '@/api/working_hours/hooks';
import { useProfessionalPaymentMethods } from '@/api/payment_methods/hooks';
import { Skeleton } from '@/components/ui/skeleton';
import { User } from '@supabase/supabase-js';
import { ContactSection } from '../ContactSection/ContactSection';
import { HeaderSection } from '../HeaderSection/HeaderSection';
import { LocationSection } from '../LocationSection/LocationSection';
import { PaymentMethodsSection } from '../PaymentMethodsSection/PaymentMethodsSection';
import { ProfileOverviewSection } from '../ProfileOverviewSection/ProfileOverviewSection';
import { ReviewsSection } from '../ReviewsSection/ReviewsSection';

// Type for ProfileTabContent props
export type ProfileTabContentProps = {
  user: User;
  onEditPortfolio?: () => void;
  onPublishToggle?: () => void;
  isEditable?: boolean;
};

export function ProfileTabContent({
  user,
  onEditPortfolio,
  onPublishToggle,
  isEditable = true,
}: ProfileTabContentProps) {
  // Fetch profile data using React Query
  const {
    data: profileViewData,
    isFetching: isLoadingProfile,
    error: profileError,
  } = useProfile(user.id);

  // Fetch working hours using React Query
  const { data: workingHours, isFetching: isLoadingWorkingHours } =
    useWorkingHours(user.id);

  // Fetch payment methods
  const { data: acceptedPaymentMethods = [] } = useProfessionalPaymentMethods(
    user.id,
  );

  // Determine if payment methods section should be shown
  const showPaymentMethods = isEditable || acceptedPaymentMethods.length > 0;

  // Handle loading state
  if (isLoadingProfile) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-[200px] w-full" />
        <Skeleton className="h-[100px] w-full" />
        <Skeleton className="h-[150px] w-full" />
      </div>
    );
  }

  // Handle error state
  if (profileError || !profileViewData) {
    return (
      <div className="p-4 border border-red-200 bg-red-50 rounded-md">
        Error loading profile data. Please try again later.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8">
          <HeaderSection
            user={user}
            {...(onPublishToggle && { onPublishToggle })}
            isEditable={isEditable}
          />
          <ProfileOverviewSection
            user={user}
            {...(onEditPortfolio && { onEditPortfolio })}
            isEditable={isEditable}
          />
        </div>
        <div className="md:col-span-1 space-y-8">
          <ContactSection
            user={user}
            workingHours={workingHours ?? null}
            isLoading={isLoadingWorkingHours}
            isEditable={isEditable}
          />
          <LocationSection user={user} isEditable={isEditable} />
          {showPaymentMethods && (
            <PaymentMethodsSection user={user} isEditable={isEditable} />
          )}
        </div>
      </div>
      <ReviewsSection user={user} isEditable={isEditable} />
    </div>
  );
}
