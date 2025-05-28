'use client';

import { User } from '@supabase/supabase-js';
import { useState, useTransition, useEffect, useMemo } from 'react';
import type { ClientProfile, Address } from '@/api/profiles/types';
import { Separator } from '@/components/ui/separator';
import { Typography } from '@/components/ui/typography';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AvatarUpload } from '@/components/common/AvatarUpload';
import { SignOutButton } from '@/components/common/SignOutButton/SignOutButton';
import { toast } from '@/components/ui/use-toast';
import {
  Edit2,
  UserRound,
  MapPinned,
  LayoutDashboard,
  Calendar,
} from 'lucide-react';
import Link from 'next/link';
import {
  DetailsForm,
  DetailsFormValues,
  DetailsDisplay,
} from '@/components/forms/DetailsForm';
import {
  LocationForm,
  LocationFormValues,
  LocationDisplay,
} from '@/components/forms/LocationForm';
import {
  updateUserDetailsAction,
  updateClientLocationAction,
} from './ClientProfilePage';

export type ClientProfilePageClientProps = {
  user: User;
  profile: ClientProfile | null;
  address: Address | null;
};

// Inline AccountSection component
function InlineAccountSection({ user }: { user: User }) {
  const fullName = `${user.user_metadata?.first_name || ''} ${
    user.user_metadata?.last_name || ''
  }`.trim();
  const email = user.email || '';

  return (
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
        <div className="space-y-3">
          <Link href="/dashboard" className="w-full cursor-pointer">
            <Button
              variant="outline"
              className="w-full font-medium justify-start text-foreground border-border hover:bg-muted hover:text-primary hover:border-primary"
            >
              <LayoutDashboard size={16} className="mr-2 text-primary" />
              Go to Dashboard
            </Button>
          </Link>
          <Separator className="my-3" />
          <SignOutButton className="w-full bg-background border border-border text-muted-foreground hover:bg-muted hover:text-foreground" />
        </div>
      </CardContent>
    </Card>
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
          toast({
            description: 'Personal details updated successfully.',
          });
          // Refresh the page to show updated data
          window.location.reload();
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
          <CardTitle className="text-[#313131]">Personal Details</CardTitle>
        </div>
        {!isEditing && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(true)}
            className="text-[#5D6C6F] hover:text-[#DEA85B] hover:bg-[#F5F5F5]"
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
      };
    }

    // Default empty values
    return {
      address: '',
      country: '',
      state: '',
      city: '',
      streetAddress: '',
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
        const result = await updateClientLocationAction(
          user.id,
          {
            country: data.country || '',
            state: data.state || '',
            city: data.city || '',
            streetAddress: data.streetAddress || '',
          },
          profile?.address_id || null,
        );

        if (result.success) {
          setFormData(data);
          setIsEditing(false);
          toast({
            description: 'Location updated successfully.',
          });
          // Refresh the page to show updated data
          window.location.reload();
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
          <CardTitle className="text-[#313131]">Location</CardTitle>
        </div>
        {!isEditing && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(true)}
            className="text-[#5D6C6F] hover:text-[#DEA85B] hover:bg-[#F5F5F5]"
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

// Inline ServicesSection component (simplified for client view)
function InlineServicesSection() {
  return (
    <Card className="border-[#ECECEC]">
      <CardHeader className="min-h-16 flex flex-row items-center justify-between space-y-0 pb-2 border-b border-[#ECECEC]">
        <div className="flex items-center">
          <Calendar size={18} className="text-[#DEA85B] mr-2" />
          <CardTitle className="text-[#313131]">Your Bookings</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="text-center py-8">
          <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <Typography variant="h4" className="text-[#313131] mb-2">
            No bookings yet
          </Typography>
          <Typography variant="small" className="text-[#5D6C6F] mb-4">
            When you book services, they'll appear here
          </Typography>
          <Link href="/dashboard">
            <Button
              variant="outline"
              className="text-[#DEA85B] border-[#DEA85B] hover:bg-[#DEA85B] hover:text-white"
            >
              Browse Services
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export function ClientProfilePageClient({
  user,
  profile,
  address,
}: ClientProfilePageClientProps) {
  const hasAddress = Boolean(
    address?.city || address?.state || address?.country,
  );

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
          <InlineAccountSection user={user} />
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
          {hasAddress && (
            <>
              <Separator className="my-8" />
              <InlineServicesSection />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
