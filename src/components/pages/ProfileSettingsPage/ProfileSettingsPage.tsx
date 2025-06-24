'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ProfileSettingsPageClient } from './ProfileSettingsPageClient';
import type { User } from '@supabase/supabase-js';
import type {
  DepositSettingsFormValues,
  CancellationPolicyFormValues,
} from '@/components/forms';

// Types for settings
export type DepositSettings = {
  requires_deposit: boolean;
  deposit_type: string | null;
  deposit_value: number | null;
};

export type MessagingSettings = {
  allow_messages: boolean;
};

export type CancellationPolicySettings = {
  cancellation_policy_enabled: boolean;
  cancellation_24h_charge_percentage: number;
  cancellation_48h_charge_percentage: number;
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

  // Fetch settings
  const depositSettings = await getDepositSettings(targetUserId);
  const messagingSettings = await getMessagingSettings(targetUserId);
  const cancellationPolicySettings =
    await getCancellationPolicySettings(targetUserId);

  return (
    <ProfileSettingsPageClient
      user={user as User}
      depositSettings={depositSettings}
      messagingSettings={messagingSettings}
      cancellationPolicySettings={cancellationPolicySettings}
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
      .select('requires_deposit, deposit_type, deposit_value')
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
    };
  } catch (error) {
    console.error('Error fetching deposit settings:', error);
    return null;
  }
}

// Server function to get messaging settings
export async function getMessagingSettings(
  userId: string,
): Promise<MessagingSettings | null> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('professional_profiles')
      .select('allow_messages')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error fetching messaging settings:', error);
      return null;
    }

    return {
      allow_messages: data.allow_messages || false,
    };
  } catch (error) {
    console.error('Error fetching messaging settings:', error);
    return null;
  }
}

// Server function to get cancellation policy settings
export async function getCancellationPolicySettings(
  userId: string,
): Promise<CancellationPolicySettings | null> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('professional_profiles')
      .select(
        'cancellation_policy_enabled, cancellation_24h_charge_percentage, cancellation_48h_charge_percentage',
      )
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error fetching cancellation policy settings:', error);
      return null;
    }

    return {
      cancellation_policy_enabled: data.cancellation_policy_enabled || false,
      cancellation_24h_charge_percentage:
        data.cancellation_24h_charge_percentage || 50,
      cancellation_48h_charge_percentage:
        data.cancellation_48h_charge_percentage || 25,
    };
  } catch (error) {
    console.error('Error fetching cancellation policy settings:', error);
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
      updated_at: new Date().toISOString(),
    };

    // Add deposit configuration if deposit is required
    if (data.requires_deposit) {
      updateData.deposit_type = data.deposit_type || null;
      updateData.deposit_value = data.deposit_value || null;
    } else {
      // Clear deposit configuration if not required
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

// Server action to update cancellation policy settings
export async function updateCancellationPolicySettingsAction({
  userId,
  data,
}: {
  userId: string;
  data: CancellationPolicyFormValues;
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

    // Validate percentages
    if (
      data.cancellation_24h_charge_percentage < 0 ||
      data.cancellation_24h_charge_percentage > 100 ||
      data.cancellation_48h_charge_percentage < 0 ||
      data.cancellation_48h_charge_percentage > 100
    ) {
      return {
        success: false,
        error: 'Charge percentages must be between 0 and 100',
      };
    }

    if (
      data.cancellation_24h_charge_percentage <
      data.cancellation_48h_charge_percentage
    ) {
      return {
        success: false,
        error:
          '24-hour cancellation charge must be greater than or equal to 48-hour charge',
      };
    }

    // Update cancellation policy settings
    const { error: updateError } = await supabase
      .from('professional_profiles')
      .update({
        cancellation_policy_enabled: data.cancellation_policy_enabled,
        cancellation_24h_charge_percentage:
          data.cancellation_24h_charge_percentage,
        cancellation_48h_charge_percentage:
          data.cancellation_48h_charge_percentage,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error(
        'Error updating cancellation policy settings:',
        updateError,
      );
      return {
        success: false,
        error: 'Failed to update cancellation policy settings',
      };
    }

    return {
      success: true,
      message: 'Cancellation policy settings updated successfully',
    };
  } catch (error) {
    console.error('Error updating cancellation policy settings:', error);
    return {
      success: false,
      error: 'An unexpected error occurred',
    };
  }
}

// Server action to update messaging settings
export async function updateMessagingSettingsAction({
  userId,
  allowMessages,
}: {
  userId: string;
  allowMessages: boolean;
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

    // Update messaging settings
    const { error: updateError } = await supabase
      .from('professional_profiles')
      .update({
        allow_messages: allowMessages,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error('Error updating messaging settings:', updateError);
      return {
        success: false,
        error: 'Failed to update messaging settings',
      };
    }

    return {
      success: true,
      message: 'Messaging settings updated successfully',
    };
  } catch (error) {
    console.error('Error updating messaging settings:', error);
    return {
      success: false,
      error: 'An unexpected error occurred',
    };
  }
}
