'use server';

import { createClient } from '@/lib/supabase/server';
import { getStripeConnectStatus as domainGetStripeConnectStatus } from '@/server/domains/subscriptions/actions';
import { getWorkingHoursAction } from '@/server/domains/working_hours/actions';
import { getProfessionalPaymentMethodsAction } from '@/server/domains/payment_methods/actions';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { ProfilePageLayoutClient } from './ProfilePageLayoutClient';
import type { WorkingHoursEntry } from '@/types/working_hours';
import type { PaymentMethod } from '@/types/payment_methods';

export type UserData = {
  id: string;
  firstName: string;
  lastName: string;
  roleName: string;
  isProfessional: boolean;
  subscriptionStatus: boolean | null;
  isPublished: boolean | null;
  email?: string | undefined;
  subscriptionDetails?:
    | {
        planName: string;
        nextBillingDate: string;
        status: string;
        cancelAtPeriodEnd?: boolean;
      }
    | undefined;
};

export type ProfileValidationData = {
  workingHours: WorkingHoursEntry[];
  paymentMethods: PaymentMethod[];
  hasAddress: boolean;
};

export type ProfilePageLayoutProps = {
  children: React.ReactNode;
};

export async function ProfilePageLayout({ children }: ProfilePageLayoutProps) {
  const supabase = await createClient();

  // Get the current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }

  // Fetch user data first to get the role from database
  const userData = await getUserData(user.id);
  const userRole = userData.roleName;

  console.log('userRole', userRole);

  if (userRole === 'client') {
    redirect('/client-profile');
  }

  if (userRole !== 'professional') {
    redirect('/dashboard');
  }

  // Get Stripe Connect status if user is subscribed
  let connectStatus = null;
  if (userData.isProfessional && userData.subscriptionStatus) {
    try {
      connectStatus = await getStripeConnectStatus(user.id);
    } catch (error) {
      console.error('Error fetching Stripe Connect status:', error);
    }
  }

  // Fetch validation data (working hours and payment methods)
  const validationData = await getValidationData(user.id);

  // Fetch unread messages count
  let unreadMessagesCount = 0;
  try {
    const { getUnreadMessagesCount } = await import(
      '@/components/layouts/DashboardPageLayout/DashboardPageLayout'
    );
    unreadMessagesCount = await getUnreadMessagesCount(user.id);
  } catch (messageError) {
    console.error('Error fetching unread messages count:', messageError);
  }

  return (
    <div className="w-full mx-auto">
      <ProfilePageLayoutClient
        user={user}
        userData={userData}
        connectStatus={connectStatus}
        validationData={validationData}
        unreadMessagesCount={unreadMessagesCount}
      >
        {children}
      </ProfilePageLayoutClient>
    </div>
  );
}

// Server actions for this layout
export async function getUserData(userId: string): Promise<UserData> {
  if (!userId) {
    throw new Error('User ID is required');
  }

  try {
    // Create a Supabase client
    const supabase = await createClient();

    // Fetch user data from the users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select(
        `
        id,
        first_name,
        last_name
      `,
      )
      .eq('id', userId)
      .single();

    if (userError || !userData) {
      throw new Error(
        `Error fetching user data: ${userError?.message || 'User not found'}`,
      );
    }

    // Get user's email from the current authenticated user
    let email: string | undefined;
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (authUser?.id === userId) {
      // If requesting data for the current user, get email from authenticated user
      email = authUser.email;
    }

    // Check user roles using RPC functions (these bypass RLS as they are security definer)
    const { data: isProfessional, error: professionalError } =
      await supabase.rpc('is_professional', { user_uuid: userId });

    const { data: isClient, error: clientError } = await supabase.rpc(
      'is_client',
      { user_uuid: userId },
    );

    const { data: isAdmin, error: adminError } = await supabase.rpc(
      'is_admin',
      { user_uuid: userId },
    );

    if (professionalError) {
      console.error('Error checking professional status:', professionalError);
    }
    if (clientError) {
      console.error('Error checking client status:', clientError);
    }
    if (adminError) {
      console.error('Error checking admin status:', adminError);
    }

    console.log('Role checks:', { isProfessional, isClient, isAdmin });

    // If professional, fetch subscription status and publish status
    let subscriptionStatus = null;
    let isPublished = null;
    let subscriptionDetails = undefined;

    if (isProfessional) {
      const { data: profileData, error: profileError } = await supabase
        .from('professional_profiles')
        .select('is_subscribed, is_published')
        .eq('user_id', userId)
        .single();

      if (!profileError && profileData) {
        subscriptionStatus = profileData.is_subscribed;
        isPublished = profileData.is_published;

        // If subscribed, check if we have professional_subscriptions record
        if (subscriptionStatus) {
          // Get professional profile ID
          const { data: profileIdData } = await supabase
            .from('professional_profiles')
            .select('id')
            .eq('user_id', userId)
            .single();

          if (profileIdData) {
            // Look for active subscription in our database
            const { data: subData } = await supabase
              .from('professional_subscriptions')
              .select(
                `
                status,
                end_date,
                stripe_subscription_id,
                cancel_at_period_end,
                subscription_plans(name)
              `,
              )
              .eq('professional_profile_id', profileIdData.id)
              .eq('status', 'active')
              .single();

            if (subData && subData.stripe_subscription_id) {
              subscriptionDetails = {
                planName:
                  subData.subscription_plans?.name || 'Professional Plan',
                nextBillingDate: subData.end_date || new Date().toISOString(),
                status: subData.status,
                cancelAtPeriodEnd: subData.cancel_at_period_end || false,
              };
            }
          }
        }
      }
    }

    // Determine role name based on RPC function results
    let roleName = 'User'; // default fallback
    if (isAdmin) {
      roleName = 'admin';
    } else if (isProfessional) {
      roleName = 'professional';
    } else if (isClient) {
      roleName = 'client';
    }

    return {
      id: userData.id,
      firstName: userData.first_name,
      lastName: userData.last_name,
      roleName,
      isProfessional: !!isProfessional,
      subscriptionStatus,
      isPublished,
      email,
      subscriptionDetails,
    };
  } catch (error) {
    console.error('Error in getUserData:', error);
    throw new Error('Failed to get user data');
  }
}

export async function getValidationData(
  userId: string,
): Promise<ProfileValidationData> {
  try {
    // Fetch working hours
    const workingHoursResult = await getWorkingHoursAction(userId);
    const workingHours = workingHoursResult.success
      ? workingHoursResult.hours || []
      : [];

    // Fetch payment methods
    const paymentMethodsResult =
      await getProfessionalPaymentMethodsAction(userId);
    const paymentMethods = paymentMethodsResult.success
      ? paymentMethodsResult.methods || []
      : [];

    // Check if professional has an address
    const supabase = await createClient();
    const { data: profProfile } = await supabase
      .from('professional_profiles')
      .select('address_id')
      .eq('user_id', userId)
      .single();

    const hasAddress = !!profProfile?.address_id;

    return {
      workingHours,
      paymentMethods,
      hasAddress,
    };
  } catch (error) {
    console.error('Error fetching validation data:', error);
    return {
      workingHours: [],
      paymentMethods: [],
      hasAddress: false,
    };
  }
}

export async function getStripeConnectStatus(userId: string): Promise<{
  isConnected: boolean;
  accountId?: string;
  connectStatus?: string;
}> {
  return domainGetStripeConnectStatus(userId);
}

export async function toggleProfilePublishStatus(
  userId: string,
  isPublished: boolean,
): Promise<{ success: boolean; message: string }> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('professional_profiles')
      .update({
        is_published: isPublished,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to update publish status: ${error.message}`);
    }

    // Revalidate the profile layout to refresh the userData
    revalidatePath('/profile', 'layout');

    return {
      success: true,
      message: `Profile ${isPublished ? 'published' : 'unpublished'} successfully.`,
    };
  } catch (error) {
    console.error('Error toggling publish status:', error);
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : 'Failed to update publish status',
    };
  }
}
