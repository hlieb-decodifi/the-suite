'use client';

import { useState } from 'react';
import { User } from '@supabase/supabase-js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit2, MapPinned } from 'lucide-react';
import {
  LocationForm,
  LocationFormValues,
  LocationDisplay,
} from '@/components/forms/LocationForm';

export type LocationSectionProps = {
  user: User;
};

export function LocationSection({ user }: LocationSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<LocationFormValues>({
    address: user.user_metadata?.address?.fullAddress || '',
    country: user.user_metadata?.address?.country || '',
    state: user.user_metadata?.address?.state || '',
    city: user.user_metadata?.address?.city || '',
    streetAddress: `${user.user_metadata?.address?.houseNumber || ''} ${
      user.user_metadata?.address?.street || ''
    }`.trim(),
  });

  const handleSubmit = async (data: LocationFormValues) => {
    try {
      // In a real implementation, you would update the user's address in Supabase
      console.log('Saving address:', data);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Update local state with new values
      setFormData(data);
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving address:', error);
      throw error;
    }
  };

  return (
    <Card className="border-[#ECECEC]">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b border-[#ECECEC]">
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
