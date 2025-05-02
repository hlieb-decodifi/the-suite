'use client';

import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit2, MapPinned } from 'lucide-react';
import {
  LocationForm,
  LocationFormValues,
  LocationDisplay,
} from '@/components/forms/LocationForm';
import { Address, ClientProfile } from '@/api/profiles';
import { useAddressFormatter } from './useAddressFormatter';
import { useLocationSection } from './useLocationSection';

export type LocationSectionProps = {
  user: User;
  profile: ClientProfile | null;
  address: Address | null;
};

export function LocationSection({
  user,
  profile,
  address,
}: LocationSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const { formatAddress } = useAddressFormatter();

  const [formData, setFormData] = useState<LocationFormValues>(
    formatAddress(address, user.user_metadata),
  );

  // Update form data when the address changes
  useEffect(() => {
    setFormData(formatAddress(address, user.user_metadata));
  }, [address, user.user_metadata, formatAddress]);

  const { handleSubmit } = useLocationSection({
    user,
    profile,
    setFormData,
    setIsEditing,
  });

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
