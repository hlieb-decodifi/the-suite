'use client';

import type {
  Address,
  AddressFormData,
  ClientProfile,
} from '@/api/profiles/types';
import { AvatarUpload } from '@/components/common/AvatarUpload';
import { SignOutButton } from '@/components/common/SignOutButton/SignOutButton';
import { ChangeEmailForm, ChangePasswordForm } from '@/components/forms';
import {
  DetailsDisplay,
  DetailsForm,
  DetailsFormValues,
} from '@/components/forms/DetailsForm';
import {
  LocationDisplay,
  LocationForm,
  LocationFormValues,
} from '@/components/forms/LocationForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { MessageBadge } from '@/components/ui/message-badge';
import { Separator } from '@/components/ui/separator';
import { Typography } from '@/components/ui/typography';
import { toast } from '@/components/ui/use-toast';
import {
  canChangeEmail,
  canChangePassword,
  getOAuthProvider,
} from '@/utils/auth';
import { User } from '@supabase/supabase-js';
import {
  Edit2,
  LayoutDashboard,
  Lock,
  Mail,
  MapPinned,
  UserRound,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState, useTransition } from 'react';
import {
  updateClientLocationAction,
  updateUserDetailsAction,
} from './ClientProfilePage';

export type ClientProfilePageClientProps = {
  user: User;
  profile: ClientProfile | null;
  address: Address | null;
  unreadMessagesCount?: number;
};

// Inline AccountSection component
function InlineAccountSection({
  user,
  unreadMessagesCount = 0,
}: {
  user: User;
  unreadMessagesCount?: number;
}) {
  const [isChangeEmailOpen, setIsChangeEmailOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  const fullName = `${user.user_metadata?.first_name || ''} ${
    user.user_metadata?.last_name || ''
  }`.trim();
  const email = user.email || '';

  const canUserChangeEmail = canChangeEmail(user);
  const canUserChangePassword = canChangePassword(user);
  const oauthProvider = getOAuthProvider(user);

  const handleEmailChangeSuccess = () => {
    setIsChangeEmailOpen(false);
  };

  const handlePasswordChangeSuccess = () => {
    setIsChangePasswordOpen(false);
  };

  return (
    <>
      <Card className="border-border overflow-hidden">
        <div className="bg-gradient-to-r from-primary to-primary/80 h-16" />
        <CardHeader className="-mt-8 flex flex-col items-center pb-2">
          <AvatarUpload
            userId={user.id}
            fallbackName={fullName || email}
            avatarContainerClassName="border-4 border-white shadow-md"
            buttonClassName="absolute bottom-0 right-0"
            size="xl"
          />
          <Typography variant="h3" className="font-bold mt-4 text-foreground">
            {fullName || 'User'}
          </Typography>
          <Typography variant="small" className="text-muted-foreground">
            {email}
          </Typography>
        </CardHeader>
        <CardContent className="pt-2">
          <Separator className="my-4" />
          <div className="space-y-2">
            <Link href="/dashboard" className="w-full cursor-pointer">
              <Button
                variant="outline"
                className="w-full font-medium justify-start text-foreground border-border hover:bg-muted hover:text-primary hover:border-primary relative"
              >
                <LayoutDashboard size={16} className="mr-2 text-primary" />
                Go to Dashboard
                {unreadMessagesCount > 0 && (
                  <MessageBadge
                    count={unreadMessagesCount}
                    size="sm"
                    className="ml-auto"
                  />
                )}
              </Button>
            </Link>

            {/* Account Security Section */}
            <div className="space-y-2">
              <Separator className="mt-3" />
              <div className="flex items-center gap-2">
                <Typography className="font-semibold text-[#313131]">
                  Account Security
                </Typography>
              </div>

              {/* OAuth Information */}
              {oauthProvider && (
                <div className="p-3 bg-muted rounded-md">
                  <Typography variant="small" className="text-muted-foreground">
                    Signed in with{' '}
                    {oauthProvider === 'google' ? 'Google' : oauthProvider}.
                    Email and password changes are managed by your{' '}
                    {oauthProvider === 'google' ? 'Google' : oauthProvider}{' '}
                    account.
                  </Typography>
                </div>
              )}

              {/* Email Change Button */}
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start text-sm font-medium text-foreground border-border hover:bg-muted hover:text-primary hover:border-primary"
                onClick={() => setIsChangeEmailOpen(true)}
                disabled={!canUserChangeEmail}
              >
                <Mail size={14} className="mr-2 text-primary" />
                Change Email
              </Button>

              {/* Password Change Button */}
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start text-sm font-medium text-foreground border-border hover:bg-muted hover:text-primary hover:border-primary"
                onClick={() => setIsChangePasswordOpen(true)}
                disabled={!canUserChangePassword}
              >
                <Lock size={14} className="mr-2 text-primary" />
                Change Password
              </Button>
            </div>

            <Separator className="my-3" />
            <SignOutButton className="w-full bg-background border border-border text-muted-foreground hover:bg-muted hover:text-foreground" />
          </div>
        </CardContent>
      </Card>

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
            currentEmail={email}
            onSubmit={handleEmailChangeSuccess}
          />
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
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
              Change Password
            </DialogTitle>
          </DialogHeader>
          <ChangePasswordForm onSubmit={handlePasswordChangeSuccess} />
        </DialogContent>
      </Dialog>
    </>
  );
}

// Inline DetailsSection component
function InlineDetailsSection({
  user,
  profile,
}: {
  user: User;
  profile: ClientProfile | null;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [formData, setFormData] = useState<DetailsFormValues>({
    firstName: user.user_metadata?.first_name || '',
    lastName: user.user_metadata?.last_name || '',
    phone: profile?.phone_number || user.user_metadata?.phone || '',
  });

  // Update form data when profile changes
  useEffect(() => {
    setFormData({
      firstName: user.user_metadata?.first_name || '',
      lastName: user.user_metadata?.last_name || '',
      phone: profile?.phone_number || user.user_metadata?.phone || '',
    });
  }, [profile, user.user_metadata]);

  const handleSubmit = async (data: DetailsFormValues) => {
    startTransition(async () => {
      try {
        const result = await updateUserDetailsAction(user.id, {
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone || '',
        });

        if (result.success) {
          setFormData(data);
          setIsEditing(false);
        } else {
          toast({
            variant: 'destructive',
            title: 'Error updating details',
            description: result.error || 'An unexpected error occurred',
          });
        }
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Error updating details',
          description:
            error instanceof Error
              ? error.message
              : 'An unexpected error occurred',
        });
      }
    });
  };

  return (
    <Card className="border-[#ECECEC]">
      <CardHeader className="min-h-16 flex flex-row items-center justify-between space-y-0 pb-2 border-b border-[#ECECEC]">
        <div className="flex items-center">
          <UserRound size={18} className="text-[#DEA85B] mr-2" />
          <CardTitle className="text-[#313131] text-lg">
            Personal Details
          </CardTitle>
        </div>
        {!isEditing && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(true)}
            className="text-sm text-[#5D6C6F] hover:text-[#DEA85B] hover:bg-[#F5F5F5]"
            disabled={isPending}
          >
            <Edit2 size={16} className="mr-2" />
            Edit
          </Button>
        )}
      </CardHeader>
      <CardContent className="pt-6">
        {isEditing ? (
          <DetailsForm
            user={user}
            onSubmit={handleSubmit}
            onCancel={() => setIsEditing(false)}
            initialData={formData}
          />
        ) : (
          <DetailsDisplay data={formData} />
        )}
      </CardContent>
    </Card>
  );
}

// Inline LocationSection component
function InlineLocationSection({
  user,
  profile,
  address,
}: {
  user: User;
  profile: ClientProfile | null;
  address: Address | null;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Helper function to format address display
  const formatAddress = useMemo(() => {
    if (address) {
      // Format from database address
      return {
        address:
          `${address.street_address || ''}, ${address.city || ''}, ${address.state || ''}, ${address.country || ''}`
            .replace(/^,\s*|,\s*$|(?:,\s*){2,}/g, '')
            .trim(),
        country: address.country || '',
        state: address.state || '',
        city: address.city || '',
        streetAddress: address.street_address || '',
        apartment: address.apartment || '',
        googlePlaceId: address.google_place_id || '',
        latitude: address.latitude || undefined,
        longitude: address.longitude || undefined,
      };
    } else if (user.user_metadata?.address) {
      // Fallback to user metadata if no address in DB
      const userAddress = user.user_metadata.address;
      return {
        address: userAddress.fullAddress || '',
        country: userAddress.country || '',
        state: userAddress.state || '',
        city: userAddress.city || '',
        streetAddress:
          `${userAddress.houseNumber || ''} ${userAddress.street || ''}`.trim(),
        apartment: '',
        googlePlaceId: '',
        latitude: undefined,
        longitude: undefined,
      };
    }

    // Default empty values
    return {
      address: '',
      country: '',
      state: '',
      city: '',
      streetAddress: '',
      apartment: '',
      googlePlaceId: '',
      latitude: undefined,
      longitude: undefined,
    };
  }, [address, user.user_metadata]);

  const [formData, setFormData] = useState<LocationFormValues>(formatAddress);

  // Update form data when the address changes
  useEffect(() => {
    setFormData(formatAddress);
  }, [formatAddress]);

  const handleSubmit = async (data: LocationFormValues) => {
    startTransition(async () => {
      try {
        const addressData: AddressFormData = {
          country: data.country || '',
          state: data.state || '',
          city: data.city || '',
          streetAddress: data.streetAddress || '',
          apartment: data.apartment || '',
          googlePlaceId: data.googlePlaceId || '',
        };

        // Only include latitude/longitude if they exist
        if (data.latitude !== undefined) {
          addressData.latitude = data.latitude;
        }
        if (data.longitude !== undefined) {
          addressData.longitude = data.longitude;
        }

        const result = await updateClientLocationAction(
          user.id,
          addressData,
          profile?.address_id || null,
        );

        if (result.success) {
          setFormData(data);
          setIsEditing(false);
          toast({
            description: 'Location updated successfully.',
          });
        } else {
          toast({
            variant: 'destructive',
            title: 'Error updating location',
            description: result.error || 'An unexpected error occurred',
          });
        }
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Error updating location',
          description:
            error instanceof Error
              ? error.message
              : 'An unexpected error occurred',
        });
      }
    });
  };

  return (
    <Card className="border-[#ECECEC]">
      <CardHeader className="min-h-16 flex flex-row items-center justify-between space-y-0 pb-2 border-b border-[#ECECEC]">
        <div className="flex items-center">
          <MapPinned size={18} className="text-[#DEA85B] mr-2" />
          <CardTitle className="text-[#313131] text-lg">Location</CardTitle>
        </div>
        {!isEditing && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(true)}
            className="text-sm text-[#5D6C6F] hover:text-[#DEA85B] hover:bg-[#F5F5F5]"
            disabled={isPending}
          >
            <Edit2 size={16} className="mr-2" />
            Edit
          </Button>
        )}
      </CardHeader>
      <CardContent className="pt-6">
        {isEditing ? (
          <LocationForm
            user={user}
            onSubmit={handleSubmit}
            onCancel={() => setIsEditing(false)}
            initialData={formData}
          />
        ) : (
          <LocationDisplay
            data={formData}
            onEditClick={() => setIsEditing(true)}
          />
        )}
      </CardContent>
    </Card>
  );
}

export function ClientProfilePageClient({
  user,
  profile,
  address,
  unreadMessagesCount = 0,
}: ClientProfilePageClientProps) {
  return (
    <div className="w-full space-y-8">
      <div className="space-y-2">
        <Typography
          variant="h2"
          className="border-none font-bold text-[#313131]"
        >
          Client Profile
        </Typography>
        <Typography className="text-[#5D6C6F]">
          Manage your personal information and preferences
        </Typography>
        <Separator className="my-4" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 space-y-6">
          <InlineAccountSection
            user={user}
            unreadMessagesCount={unreadMessagesCount}
          />
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
          <InlineDetailsSection user={user} profile={profile} />
          <InlineLocationSection
            user={user}
            profile={profile}
            address={address}
          />
        </div>
      </div>
    </div>
  );
}
