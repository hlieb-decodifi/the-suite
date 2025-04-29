'use client';

import { useState } from 'react';
import { User } from '@supabase/supabase-js';
import { Typography } from '@/components/ui/typography';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  Pencil,
  Camera,
  Instagram,
  Facebook,
  Twitter,
  Link as LinkIcon,
} from 'lucide-react';

export type HeaderSectionProps = {
  user: User;
  isPublished: boolean;
  isSubscribed: boolean;
  onPublishToggle: () => void;
};

export function HeaderSection({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  user,
  isPublished,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  isSubscribed,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onPublishToggle,
}: HeaderSectionProps) {
  const [isEditing, setIsEditing] = useState(false);

  // Mock data - would come from API in a real app
  const professional = {
    firstName: 'John',
    lastName: 'Smith',
    profession: 'Hair Stylist',
    photoUrl: '/placeholder-profile.jpg', // This would be a real photo URL in production
    description:
      'Professional hair stylist with over 10 years of experience specializing in cutting, coloring, and styling for all hair types.',
    socialMedia: [
      {
        id: 'instagram',
        name: 'Instagram',
        url: 'https://instagram.com/professional',
        icon: Instagram,
      },
      {
        id: 'facebook',
        name: 'Facebook',
        url: 'https://facebook.com/professional',
        icon: Facebook,
      },
      {
        id: 'twitter',
        name: 'Twitter',
        url: 'https://twitter.com/professional',
        icon: Twitter,
      },
    ],
  };

  return (
    <Card className="border border-border">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <Typography variant="h3" className="font-bold text-foreground">
          Professional Information
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
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative">
              <Avatar className="h-24 w-24 border border-border">
                <AvatarImage
                  src={professional.photoUrl}
                  alt={`${professional.firstName} ${professional.lastName}`}
                />
                <AvatarFallback className="bg-muted text-xl">
                  {professional.firstName[0]}
                  {professional.lastName[0]}
                </AvatarFallback>
              </Avatar>
              {isEditing && (
                <Button
                  size="icon"
                  className="absolute -bottom-2 -right-2 rounded-full h-8 w-8 bg-primary text-primary-foreground shadow-md"
                >
                  <Camera className="h-4 w-4" />
                </Button>
              )}
            </div>

            <div className="flex-1">
              <div className="flex flex-col md:flex-row md:items-end gap-2 md:gap-6">
                <div>
                  <Typography
                    variant="h3"
                    className="font-bold text-foreground"
                  >
                    {professional.firstName} {professional.lastName}
                  </Typography>
                  <Typography variant="muted" className="text-muted-foreground">
                    {professional.profession}
                  </Typography>
                </div>
                <div
                  className={`px-3 py-1 rounded-full text-sm ${isPublished ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}
                >
                  {isPublished ? 'Published' : 'Not Published'}
                </div>
              </div>
              <Typography className="text-foreground mt-2">
                {professional.description}
              </Typography>

              {/* Social Media Links */}
              <div className="flex items-center space-x-3 mt-3">
                {professional.socialMedia.map((platform) => (
                  <a
                    key={platform.id}
                    href={platform.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={platform.name}
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    <platform.icon className="h-5 w-5" />
                  </a>
                ))}
                {isEditing && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 rounded-full flex items-center gap-1 text-xs"
                  >
                    <LinkIcon className="h-3.5 w-3.5" />
                    Add Link
                  </Button>
                )}
              </div>
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
