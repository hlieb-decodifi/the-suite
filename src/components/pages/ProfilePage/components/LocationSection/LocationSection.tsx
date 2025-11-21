'use client';

import { useState, useTransition } from 'react';
import { User } from '@supabase/supabase-js';
import { Typography } from '@/components/ui/typography';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/components/ui/use-toast';
import { MapPin, Pencil, ExternalLink } from 'lucide-react';
import { LeafletMap } from '@/components/common/LeafletMap';
import { LocationFormValues } from '@/components/forms/LocationForm';
import { LocationModal } from '@/components/modals/LocationModal';
import {
  updateLocationAction,
  updateAddressPrivacyAction,
} from '@/api/profiles/actions';
import type { Address, AddressFormData } from '@/api/profiles/types';

export type LocationSectionProps = {
  user: User;
  address: Address | null;
  professionalProfile: {
    address_id: string | null;
    hide_full_address: boolean;
  } | null;
  isEditable?: boolean;
};

// Address display widget component
function AddressWidget({
  address,
  hideFullAddress = false,
}: {
  address: Address;
  hideFullAddress?: boolean;
}) {
  const displayAddress = hideFullAddress
    ? `${address.city}, ${address.state}, ${address.country}`
    : `${address.street_address}${address.apartment ? `, ${address.apartment}` : ''}, ${address.city}, ${address.state}, ${address.country}`;

  const fullAddress = `${address.street_address}${address.apartment ? `, ${address.apartment}` : ''}, ${address.city}, ${address.state}, ${address.country}`;

  const handleDirectionsClick = () => {
    const encodedAddress = encodeURIComponent(fullAddress);
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`;
    window.open(googleMapsUrl, '_blank');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start space-x-3">
        <MapPin className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <Typography className="text-sm leading-relaxed">
            {displayAddress}
          </Typography>
        </div>
      </div>

      {/* Show map if coordinates are available */}
      {address.latitude && address.longitude && (
        <div className="space-y-3">
          <LeafletMap
            latitude={address.latitude}
            longitude={address.longitude}
            address={displayAddress}
            height="h-48"
            className="border border-border"
            showAreaOnly={hideFullAddress}
            city={address.city || ''}
            state={address.state || ''}
            country={address.country || ''}
          />
        </div>
      )}

      <div className={address.latitude && address.longitude ? '' : 'pl-8'}>
        <Button
          onClick={handleDirectionsClick}
          variant="outline"
          size="sm"
          className="text-primary border-primary hover:bg-primary hover:text-white"
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          Get Directions
        </Button>
      </div>
    </div>
  );
}

export function LocationSection({
  user,
  address,
  professionalProfile,
  isEditable = true,
}: LocationSectionProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isUpdatingPrivacy, setIsUpdatingPrivacy] = useState(false);

  // Format existing address data for the form
  const formatAddressForForm = (
    addr: Address | null,
  ): LocationFormValues | undefined => {
    if (!addr) return undefined;

    return {
      address: `${addr.street_address}, ${addr.city}, ${addr.state}, ${addr.country}`,
      country: addr.country || '',
      state: addr.state || '',
      city: addr.city || '',
      streetAddress: addr.street_address || '',
      apartment: addr.apartment || '',
      googlePlaceId: addr.google_place_id || '',
      latitude: addr.latitude || undefined,
      longitude: addr.longitude || undefined,
    };
  };

  const handleEditClick = () => {
    setIsModalOpen(true);
  };

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

        const result = await updateLocationAction({
          userId: user.id,
          addressData,
          existingAddressId: professionalProfile?.address_id || null,
        });

        if (result.success) {
          setIsModalOpen(false);
          toast({
            description: 'Location updated successfully.',
          });
          // The updateLocationAction already calls revalidatePath('/profile')
          // So the page should automatically update with the new data
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

  const handlePrivacyToggle = async (hideFullAddress: boolean) => {
    setIsUpdatingPrivacy(true);
    try {
      const result = await updateAddressPrivacyAction({
        userId: user.id,
        hideFullAddress,
      });

      if (result.success) {
        toast({
          description: hideFullAddress
            ? 'Full address is now hidden from your public profile'
            : 'Full address is now visible on your public profile',
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Error updating privacy setting',
          description: result.error || 'An unexpected error occurred',
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error updating privacy setting',
        description:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred',
      });
    } finally {
      setIsUpdatingPrivacy(false);
    }
  };

  return (
    <>
      <Card className="border border-border">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <Typography variant="h3" className="font-bold text-foreground">
            Location
          </Typography>
          {isEditable && (
            <Button
              variant="outline"
              size="icon"
              onClick={handleEditClick}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              disabled={isPending}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}
        </CardHeader>
        <CardContent className="pt-2">
          <div className="space-y-4">
            {address ? (
              <>
                <AddressWidget
                  address={address}
                  hideFullAddress={
                    professionalProfile?.hide_full_address || false
                  }
                />

                {/* Privacy Settings - only show in edit mode */}
                {isEditable && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <Typography variant="h4" className="text-sm font-medium">
                        Privacy Settings
                      </Typography>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="hide-address"
                          checked={
                            professionalProfile?.hide_full_address || false
                          }
                          onCheckedChange={handlePrivacyToggle}
                          disabled={isUpdatingPrivacy}
                        />
                        <Label htmlFor="hide-address" className="text-sm">
                          Do not display your full address on your profile
                        </Label>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        When enabled, only your city, state, and country will be
                        visible to clients
                      </p>
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center text-center py-8 space-y-3">
                <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                <Typography variant="h4" className="text-foreground">
                  No location set
                </Typography>
                <Typography
                  variant="small"
                  className="text-muted-foreground mb-2"
                >
                  Add your business location to help clients find you
                </Typography>
                {isEditable && (
                  <Button
                    onClick={handleEditClick}
                    variant="outline"
                    className="w-fit text-primary border-primary hover:bg-primary hover:text-white"
                  >
                    Add Location
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <LocationModal
        isOpen={isModalOpen}
        onOpenChange={setIsModalOpen}
        onSubmitSuccess={handleSubmit}
        defaultValues={formatAddressForForm(address)}
        user={user}
        isSubmitting={isPending}
      />
    </>
  );
}
