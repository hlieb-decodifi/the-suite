'use client';

import { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { Typography } from '@/components/ui/typography';
import { DepositSettingsForm } from '@/components/forms';
import { updateDepositSettingsAction } from './ProfileSettingsPage';
import type { User } from '@supabase/supabase-js';
import type { DepositSettings } from './ProfileSettingsPage';
import type { DepositSettingsFormValues } from '@/components/forms';

export type ProfileSettingsPageClientProps = {
  user: User;
  depositSettings: DepositSettings | null;
  isEditable?: boolean;
};

export function ProfileSettingsPageClient({
  user,
  depositSettings,
  isEditable = true,
}: ProfileSettingsPageClientProps) {
  const [isUpdatingDepositSettings, setIsUpdatingDepositSettings] =
    useState(false);
  const { toast } = useToast();

  const handleDepositSettingsSubmit = async (
    data: DepositSettingsFormValues,
  ) => {
    if (!isEditable) return;

    setIsUpdatingDepositSettings(true);
    try {
      const result = await updateDepositSettingsAction({
        userId: user.id,
        data,
      });

      if (result.success) {
        toast({
          title: 'Success',
          description:
            result.message || 'Deposit settings updated successfully',
        });
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to update deposit settings',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error updating deposit settings:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsUpdatingDepositSettings(false);
    }
  };

  if (!depositSettings) {
    return (
      <div className="mx-auto w-full">
        <div className="max-w-2xl mx-auto">
          <div className="space-y-6">
            <div>
              <Typography variant="h2" className="font-bold text-foreground">
                Settings
              </Typography>
              <Typography className="text-muted-foreground">
                Manage your professional settings and preferences.
              </Typography>
            </div>
            <div className="text-center py-8">
              <Typography className="text-muted-foreground">
                Unable to load settings. Please try again later.
              </Typography>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full">
      <div className="mx-auto">
        <div className="space-y-6">
          <div>
            <Typography variant="h2" className="font-bold text-foreground">
              Settings
            </Typography>
            <Typography className="text-muted-foreground">
              Manage your professional settings and preferences.
            </Typography>
          </div>

          {isEditable && (
            <DepositSettingsForm
              defaultValues={{
                requires_deposit: depositSettings.requires_deposit,
                deposit_type: depositSettings.deposit_type as
                  | 'percentage'
                  | 'fixed'
                  | undefined,
                deposit_value: depositSettings.deposit_value || 0,
                balance_payment_method:
                  (depositSettings.balance_payment_method as 'card' | 'cash') ||
                  'card',
              }}
              onSubmit={handleDepositSettingsSubmit}
              isLoading={isUpdatingDepositSettings}
            />
          )}

          {!isEditable && (
            <div className="text-center py-8">
              <Typography className="text-muted-foreground">
                You don't have permission to edit these settings.
              </Typography>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
