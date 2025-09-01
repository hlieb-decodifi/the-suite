'use client';

import { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { Typography } from '@/components/ui/typography';
import {
  DepositSettingsForm,
  CancellationPolicyForm,
} from '@/components/forms';
import {
  updateDepositSettingsAction,
  updateMessagingSettingsAction,
  updateCancellationPolicySettingsAction,
} from './ProfileSettingsPage';
import type { User } from '@supabase/supabase-js';
import type {
  DepositSettings,
  MessagingSettings,
  CancellationPolicySettings,
} from './ProfileSettingsPage';
import type {
  DepositSettingsFormValues,
  CancellationPolicyFormValues,
} from '@/components/forms';
import { ChangeEmailForm } from '@/components/forms/ChangeEmailForm';
import { ChangePasswordForm } from '@/components/forms/ChangePasswordForm';
import { ConvertOAuthToEmailForm } from '@/components/forms/ConvertOAuthToEmailForm';
import {
  canChangeEmail,
  canChangePassword,
  getOAuthProvider,
} from '@/utils/auth';
import { hasPassword } from '@/utils/hasPassword';
import { SetPasswordForm } from '@/components/forms/SetPasswordForm/SetPasswordForm';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Mail, Lock, DollarSign, MessageCircle, Calendar } from 'lucide-react';

export type ProfileSettingsPageClientProps = {
  user: User;
  depositSettings: DepositSettings | null;
  messagingSettings: MessagingSettings | null;
  cancellationPolicySettings: CancellationPolicySettings | null;
  isEditable?: boolean;
};

export function ProfileSettingsPageClient({
  user,
  depositSettings,
  messagingSettings,
  cancellationPolicySettings,
  isEditable = true,
}: ProfileSettingsPageClientProps) {
  const [isUpdatingDepositSettings, setIsUpdatingDepositSettings] =
    useState(false);
  const [isUpdatingMessagingSettings, setIsUpdatingMessagingSettings] =
    useState(false);
  const [isUpdatingCancellationPolicy, setIsUpdatingCancellationPolicy] =
    useState(false);
  const [isChangeEmailOpen, setIsChangeEmailOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isConvertOAuthOpen, setIsConvertOAuthOpen] = useState(false);
  const { toast } = useToast();
  const [messagingSettingsState, setMessagingSettingsState] = useState(
    messagingSettings ?? { allow_messages: false }
  );

  const canUserChangeEmail = canChangeEmail(user);
  const canUserChangePassword = canChangePassword(user);
  const oauthProvider = getOAuthProvider(user);
  const userHasPassword = hasPassword(user);

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

  const handleEmailChangeSuccess = () => {
    setIsChangeEmailOpen(false);
  };

  const handlePasswordChangeSuccess = () => {
    setIsChangePasswordOpen(false);
  };

  const handleConvertOAuthSuccess = () => {
    setIsConvertOAuthOpen(false);
  };

  const handleMessagingToggle = async (allowMessages: boolean) => {
    if (!isEditable) return;

    setIsUpdatingMessagingSettings(true);
    try {
      const result = await updateMessagingSettingsAction({
        userId: user.id,
        allowMessages,
      });

      if (result.success) {
        // Update local state directly for a more responsive and robust UI
        setMessagingSettingsState((prev) =>
          prev ? { ...prev, allow_messages: allowMessages } : { allow_messages: allowMessages }
        );
        toast({
          title: 'Success',
          description: 'Messaging settings updated successfully',
        });
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to update messaging settings',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error updating messaging settings:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsUpdatingMessagingSettings(false);
    }
  };

  const handleCancellationPolicySubmit = async (
    data: CancellationPolicyFormValues,
  ) => {
    if (!isEditable) return;

    setIsUpdatingCancellationPolicy(true);
    try {
      const result = await updateCancellationPolicySettingsAction({
        userId: user.id,
        data,
      });

      if (result.success) {
        toast({
          title: 'Success',
          description: 'Cancellation policy updated successfully',
        });
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to update cancellation policy',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error updating cancellation policy:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsUpdatingCancellationPolicy(false);
    }
  };

  if (!depositSettings || !messagingSettings || !cancellationPolicySettings) {
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
    <>
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

            {/* Account Security Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="size-5" />
                  <Typography
                    variant="h4"
                    className="text-foreground leading-tight"
                  >
                    Account Security
                  </Typography>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Show OAuth status only if user has both OAuth and email authentication */}
                {oauthProvider && canUserChangeEmail && (
                  <div className="p-3 bg-muted rounded-md">
                    <Typography
                      variant="small"
                      className="text-muted-foreground"
                    >
                      Signed in with{' '}
                      {oauthProvider === 'google' ? 'Google' : oauthProvider}.
                      You also have email/password authentication enabled.
                    </Typography>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Email Change or Add Email Authentication Button */}
                  {!canUserChangeEmail && oauthProvider ? (
                    /* Add Email Authentication Button for OAuth users */
                    <Button
                      variant="outline"
                      className="justify-start h-auto p-4"
                      onClick={() => setIsConvertOAuthOpen(true)}
                      disabled={!isEditable}
                    >
                      <div className="flex items-center gap-3">
                        <Mail size={18} />
                        <div className="text-left">
                          <div className="font-medium">Add Email Authentication</div>
                          <div className="text-sm text-muted-foreground">
                            Enable email changes and password login
                          </div>
                        </div>
                      </div>
                    </Button>
                  ) : (
                    /* Regular Email Change Button */
                    <Button
                      variant="outline"
                      className="justify-start h-auto p-4"
                      onClick={() => setIsChangeEmailOpen(true)}
                      disabled={!canUserChangeEmail || !isEditable}
                    >
                      <div className="flex items-center gap-3">
                        <Mail size={18} />
                        <div className="text-left">
                          <div className="font-medium">Change Email</div>
                          <div className="text-sm text-muted-foreground">
                            Update your email address
                          </div>
                        </div>
                      </div>
                    </Button>
                  )}

                  {/* Password/Set Password Button - Hide for OAuth-only users */}
                  {(canUserChangePassword || userHasPassword || !oauthProvider) && (
                    <Button
                      variant="outline"
                      className="justify-start h-auto p-4"
                      onClick={() => setIsChangePasswordOpen(true)}
                      disabled={(!canUserChangePassword && userHasPassword) || !isEditable}
                    >
                      <div className="flex items-center gap-3">
                        <Lock size={18} />
                        <div className="text-left">
                          <div className="font-medium">{userHasPassword ? 'Change Password' : 'Set Password'}</div>
                          <div className="text-sm text-muted-foreground">
                            {userHasPassword ? 'Update your password' : 'Set a password for email login'}
                          </div>
                        </div>
                      </div>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Messaging Settings Section */}
            {isEditable && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageCircle className="size-5" />
                    <Typography
                      variant="h4"
                      className="text-foreground leading-tight"
                    >
                      Messaging Settings
                    </Typography>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                      <Label
                        htmlFor="allow-messages"
                        className="text-base font-medium"
                      >
                        Allow Messages
                      </Label>
                      <Typography
                        variant="small"
                        className="text-muted-foreground"
                      >
                        Let new clients contact you through messages
                      </Typography>
                    </div>
                    <Switch
                      id="allow-messages"
                      checked={Boolean(messagingSettingsState?.allow_messages)}
                      onCheckedChange={handleMessagingToggle}
                      disabled={
                        isUpdatingMessagingSettings ||
                        typeof messagingSettingsState?.allow_messages === 'undefined'
                      }
                    />
                    {typeof messagingSettingsState?.allow_messages === 'undefined' && (
                      <Typography variant="small" className="text-muted-foreground ml-2">
                        Loading messaging settings…
                      </Typography>
                    )}
                  </div>
                  <div className="p-3 bg-muted/30 rounded-md">
                    <Typography
                      variant="small"
                      className="text-muted-foreground"
                    >
                      Note: Clients who have existing appointments with you can
                      always message you, regardless of this setting.
                    </Typography>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Cancellation Policy Settings Section */}
            {isEditable && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="size-5" />
                    <Typography
                      variant="h4"
                      className="text-foreground leading-tight"
                    >
                      Cancellation Policy
                    </Typography>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CancellationPolicyForm
                    defaultValues={{
                      cancellation_policy_enabled:
                        cancellationPolicySettings.cancellation_policy_enabled,
                      cancellation_24h_charge_percentage:
                        cancellationPolicySettings.cancellation_24h_charge_percentage,
                      cancellation_48h_charge_percentage:
                        cancellationPolicySettings.cancellation_48h_charge_percentage,
                    }}
                    onSubmit={handleCancellationPolicySubmit}
                    isLoading={isUpdatingCancellationPolicy}
                    disabled={!isEditable}
                  />
                </CardContent>
              </Card>
            )}

            <Separator />

            {isEditable && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="size-5" />
                    <Typography
                      variant="h4"
                      className="text-foreground leading-tight"
                    >
                      Deposit Settings
                    </Typography>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <DepositSettingsForm
                    defaultValues={{
                      requires_deposit: depositSettings.requires_deposit,
                      deposit_type: depositSettings.deposit_type as
                        | 'percentage'
                        | 'fixed'
                        | undefined,
                      deposit_value: depositSettings.deposit_value || 0,
                    }}
                    onSubmit={handleDepositSettingsSubmit}
                    isLoading={isUpdatingDepositSettings}
                  />
                </CardContent>
              </Card>
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

      {/* Change Email Dialog */}
      <Dialog open={isChangeEmailOpen} onOpenChange={setIsChangeEmailOpen}>
        <DialogContent
          className="w-full max-w-md mx-auto"
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="text-2xl font-futura font-bold text-center">
              Change Email
            </DialogTitle>
          </DialogHeader>
          <ChangeEmailForm
            currentEmail={user.email || ''}
            onSubmit={handleEmailChangeSuccess}
          />
        </DialogContent>
      </Dialog>

      {/* Change/Set Password Dialog */}
      <Dialog
        open={isChangePasswordOpen}
        onOpenChange={setIsChangePasswordOpen}
      >
        <DialogContent
          className="w-full max-w-md mx-auto"
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="text-2xl font-futura font-bold text-center">
              {userHasPassword ? 'Change Password' : 'Set Password'}
            </DialogTitle>
          </DialogHeader>
          {userHasPassword ? (
            <ChangePasswordForm onSubmit={handlePasswordChangeSuccess} />
          ) : (
            <SetPasswordForm userEmail={user.email || ''} />
          )}
        </DialogContent>
      </Dialog>

      {/* Convert OAuth to Email Modal */}
      <Dialog open={isConvertOAuthOpen} onOpenChange={setIsConvertOAuthOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Email Authentication</DialogTitle>
          </DialogHeader>
          <ConvertOAuthToEmailForm
            onSuccess={handleConvertOAuthSuccess}
            onCancel={() => setIsConvertOAuthOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
