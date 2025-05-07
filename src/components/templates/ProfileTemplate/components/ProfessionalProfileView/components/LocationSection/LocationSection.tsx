'use client';

import { useState } from 'react';
import { User } from '@supabase/supabase-js';
import { Typography } from '@/components/ui/typography';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { MapPin, Pencil } from 'lucide-react';

export type LocationSectionProps = {
  user: User;
  isEditable?: boolean;
};

export function LocationSection({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  user,
  isEditable = true,
}: LocationSectionProps) {
  const [isEditing, setIsEditing] = useState(false);

  // Mock data - would come from API in a real app
  const address = {
    street: '123 Main Street',
    city: 'New York',
    state: 'NY',
    postalCode: '10001',
    country: 'USA',
  };

  return (
    <Card className="border border-border">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <Typography variant="h3" className="font-bold text-foreground">
          Location
        </Typography>
        {isEditable && (
          <Button
            variant="ghost"
            size="icon"
            disabled
            onClick={() => setIsEditing(!isEditing)}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            <Pencil className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="pt-2">
        <div className="space-y-3">
          <div className="flex items-start space-x-2">
            <MapPin className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <Typography className="text-sm">
              {address.street}, {address.city}, {address.state}{' '}
              {address.postalCode}, {address.country}
            </Typography>
          </div>

          {/* Map placeholder */}
          <div className="h-32 bg-muted rounded-md relative overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center">
              <Typography className="text-muted-foreground text-sm">
                Map View
              </Typography>
            </div>
            <div className="absolute bottom-2 right-2 p-1 bg-background rounded shadow-sm">
              <Typography
                variant="small"
                className="text-primary font-semibold text-xs"
              >
                Get Directions
              </Typography>
            </div>
          </div>

          {isEditing && (
            <div className="flex justify-end gap-2 mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(false)}
              >
                Cancel
              </Button>
              <Button size="sm" onClick={() => setIsEditing(false)}>
                Save Changes
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
