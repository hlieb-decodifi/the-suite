'use client';

import { useState } from 'react';
import { User } from '@supabase/supabase-js';
import { Typography } from '@/components/ui/typography';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Phone, Clock, Pencil } from 'lucide-react';

export type ContactSectionProps = {
  user: User;
};

export function ContactSection({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  user,
}: ContactSectionProps) {
  const [isEditing, setIsEditing] = useState(false);

  // Mock data - would come from API in a real app
  const contact = {
    phone: '+1 (555) 123-4567',
    hours: [
      { day: 'Monday', hours: '9:00 AM - 5:00 PM' },
      { day: 'Tuesday', hours: '9:00 AM - 5:00 PM' },
      { day: 'Wednesday', hours: '9:00 AM - 5:00 PM' },
      { day: 'Thursday', hours: '9:00 AM - 5:00 PM' },
      { day: 'Friday', hours: '9:00 AM - 5:00 PM' },
      { day: 'Saturday', hours: '10:00 AM - 3:00 PM' },
      { day: 'Sunday', hours: 'Closed' },
    ],
  };

  return (
    <Card className="border border-border">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <Typography variant="h3" className="font-bold text-foreground">
          Contact & Hours
        </Typography>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsEditing(!isEditing)}
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
        >
          <Pencil className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="space-y-4">
          {/* Phone */}
          <div className="flex items-center space-x-2">
            <Phone className="h-4 w-4 text-primary" />
            <Typography className="text-foreground">{contact.phone}</Typography>
          </div>

          {/* Hours */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-primary" />
              <Typography
                variant="small"
                className="font-semibold text-foreground"
              >
                Working Hours
              </Typography>
            </div>
            <div className="space-y-1 pl-6">
              {contact.hours.map((day) => (
                <div key={day.day} className="flex justify-between text-sm">
                  <Typography variant="small" className="text-muted-foreground">
                    {day.day}
                  </Typography>
                  <Typography variant="small" className="text-foreground">
                    {day.hours}
                  </Typography>
                </div>
              ))}
            </div>
          </div>

          {isEditing && (
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button onClick={() => setIsEditing(false)}>Save Changes</Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
