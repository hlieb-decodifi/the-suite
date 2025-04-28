'use client';

import { useState } from 'react';
import { User } from '@supabase/supabase-js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit2, UserRound } from 'lucide-react';
import {
  DetailsForm,
  DetailsFormValues,
  DetailsDisplay,
} from '@/components/forms/DetailsForm';

export type DetailsSectionProps = {
  user: User;
};

export function DetailsSection({ user }: DetailsSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<DetailsFormValues>({
    firstName: user.user_metadata?.first_name || '',
    lastName: user.user_metadata?.last_name || '',
    phone: user.user_metadata?.phone || '',
  });

  const handleSubmit = async (data: DetailsFormValues) => {
    try {
      // Here you would update the user's metadata in Supabase
      console.log('Updating user details:', data);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Update local state with new values
      setFormData(data);
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving user details:', error);
      throw error;
    }
  };

  return (
    <Card className="border-[#ECECEC]">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b border-[#ECECEC]">
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
