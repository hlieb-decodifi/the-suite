'use client';

import {
  ContactHoursDefaultInput,
  ContactHoursFormValues,
} from '@/components/forms/ContactHoursForm';
import { ContactHoursModal } from '@/components/modals/ContactHoursModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Typography } from '@/components/ui/typography';
import { Pencil } from 'lucide-react';
import { useState } from 'react';

// Helper to format form values back to display string
const formatHoursForDisplay = (
  hours: ContactHoursFormValues['hours'][number],
): string => {
  // Check for enabled and valid times upfront
  if (!hours.enabled || !hours.startTime || !hours.endTime) {
    return 'Closed';
  }

  // Basic AM/PM formatting (can be improved with date library if needed)
  const formatTime = (time: string): string => {
    const parts = time.split(':');
    // Add basic check for parts length
    if (parts.length !== 2 || parts[0] === undefined || parts[1] === undefined)
      return 'Invalid Time';
    const hour = parseInt(parts[0], 10);
    const minuteStr = parts[1]; // Keep as string
    if (isNaN(hour)) return 'Invalid Time';

    const ampm = hour < 12 ? 'AM' : 'PM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minuteStr} ${ampm}`;
  };

  // Now startTime and endTime are guaranteed to be strings here
  const formattedStartTime = formatTime(hours.startTime);
  const formattedEndTime = formatTime(hours.endTime);

  // Handle potential invalid time results from formatTime
  if (
    formattedStartTime === 'Invalid Time' ||
    formattedEndTime === 'Invalid Time'
  ) {
    return 'Invalid Time Range'; // Or handle error appropriately
  }

  return `${formattedStartTime} - ${formattedEndTime}`;
};

export function ContactSection() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [contactData, setContactData] = useState<ContactHoursDefaultInput>({
    hours: [
      { day: 'Monday', hours: 'Closed' },
      { day: 'Tuesday', hours: '9:00 AM - 5:00 PM' },
      { day: 'Wednesday', hours: '9:00 AM - 5:00 PM' },
      { day: 'Thursday', hours: '9:00 AM - 5:00 PM' },
      { day: 'Friday', hours: '9:00 AM - 5:00 PM' },
      { day: 'Saturday', hours: '10:00 AM - 3:00 PM' },
      { day: 'Sunday', hours: 'Closed' },
    ],
  });

  const handleEditClick = () => {
    setIsModalOpen(true);
  };

  const handleSave = async (formData: ContactHoursFormValues) => {
    console.log('Saving hours:', formData);

    const formattedHours = formData.hours.map((dayHours) => ({
      day: dayHours.day,
      hours: formatHoursForDisplay(dayHours),
    }));

    const dataToSave: ContactHoursDefaultInput = {
      hours: formattedHours,
    };

    console.log('Data formatted for API:', dataToSave);
    await new Promise((res) => setTimeout(res, 500));

    setContactData(dataToSave);
    setIsModalOpen(false);
  };

  return (
    <Card className="border border-border">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <Typography variant="h3" className="font-bold text-foreground">
          Working Hours
        </Typography>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleEditClick}
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
        >
          <Pencil className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="space-y-2">
          {contactData.hours.map((day) => (
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
      </CardContent>

      <ContactHoursModal
        isOpen={isModalOpen}
        onOpenChange={setIsModalOpen}
        onSubmitSuccess={handleSave}
        defaultValues={contactData}
      />
    </Card>
  );
}
