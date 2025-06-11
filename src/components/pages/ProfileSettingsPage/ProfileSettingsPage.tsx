'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ProfileSettingsPageClient } from './ProfileSettingsPageClient';
import type { User } from '@supabase/supabase-js';
import type { DepositSettingsFormValues } from '@/components/forms';

// Types for deposit settings
export type DepositSettings = {
  requires_deposit: boolean;
  deposit_type: string | null;
  deposit_value: number | null;
  balance_payment_method: string | null;
};

export type ProfileSettingsPageProps = {
  userId?: string;
  isEditable?: boolean;
};

export async function ProfileSettingsPage({
  userId,
  isEditable = true,
}: ProfileSettingsPageProps) {
  const supabase = await createClient();

  let targetUserId = userId;
  let user = null;

  if (!userId) {
    // Get the current user if no userId provided
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    if (!currentUser) {
      redirect('/');
    }

    // Check if user is professional from database instead of metadata
    const { data: isProfessional } = await supabase.rpc('is_professional', {
      user_uuid: currentUser.id,
    });

    if (!isProfessional) {
      redirect('/dashboard');
    }

    targetUserId = currentUser.id;
    user = currentUser;
  } else {
    // For public viewing, create a mock user object
    const { data: userData } = await supabase
      .from('users')
      .select('id, first_name, last_name')
      .eq('id', userId)
      .single();

    if (userData) {
      user = {
        id: userData.id,
        email: '', // Email not available for public viewing
        user_metadata: {
          first_name: userData.first_name,
          last_name: userData.last_name,
        },
      };
    }
  }

  if (!targetUserId || !user) {
    redirect('/');
  }

  // Fetch deposit settings
  const depositSettings = await getDepositSettings(targetUserId);

  return (
    <ProfileSettingsPageClient
      user={user as User}
      depositSettings={depositSettings}
      isEditable={isEditable}
    />
  );
}

// Server function to get deposit settings
export async function getDepositSettings(
  userId: string,
): Promise<DepositSettings | null> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('professional_profiles')
      .select(
        'requires_deposit, deposit_type, deposit_value, balance_payment_method',
      )
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error fetching deposit settings:', error);
      return null;
    }

    return {
      requires_deposit: data.requires_deposit || false,
      deposit_type: data.deposit_type,
      deposit_value: data.deposit_value,
      balance_payment_method: data.balance_payment_method,
    };
  } catch (error) {
    console.error('Error fetching deposit settings:', error);
    return null;
  }
}

// Server action to update deposit settings
export async function updateDepositSettingsAction({
  userId,
  data,
}: {
  userId: string;
  data: DepositSettingsFormValues;
}) {
  try {
    const supabase = await createClient();

    // Verify user owns this profile
    const { data: profile, error: profileError } = await supabase
      .from('professional_profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile) {
      return {
        success: false,
        error: 'Professional profile not found',
      };
    }

    // Prepare update data
    const updateData: Record<
      string,
      string | number | boolean | null | undefined
    > = {
      requires_deposit: data.requires_deposit,
      balance_payment_method: data.balance_payment_method,
      updated_at: new Date().toISOString(),
    };

    // Only include deposit fields if deposit is required
    if (data.requires_deposit) {
      updateData.deposit_type = data.deposit_type;
      updateData.deposit_value = data.deposit_value;
    } else {
      // Clear deposit fields when not required
      updateData.deposit_type = null;
      updateData.deposit_value = null;
    }

    const { error: updateError } = await supabase
      .from('professional_profiles')
      .update(updateData)
      .eq('user_id', userId);

    if (updateError) {
      console.error('Error updating deposit settings:', updateError);
      return {
        success: false,
        error: 'Failed to update deposit settings',
      };
    }

    // Trigger Stripe service sync if needed
    try {
      const { syncAllServicesAction } = await import(
        '@/server/domains/stripe-services'
      );
      const syncResult = await syncAllServicesAction();
      if (!syncResult.success) {
        console.error(
          'Stripe sync failed after deposit settings update:',
          syncResult.errors,
        );
        // Don't fail the deposit update, just log the sync error
      }
    } catch (syncError) {
      console.error(
        'Error syncing services with Stripe after deposit settings update:',
        syncError,
      );
      // Don't fail the deposit update due to sync issues
    }

    return {
      success: true,
      message: 'Deposit settings updated successfully',
    };
  } catch (error) {
    console.error('Error updating deposit settings:', error);
    return {
      success: false,
      error: 'An unexpected error occurred',
    };
  }
}
