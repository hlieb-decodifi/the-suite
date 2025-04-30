/* eslint-disable max-lines-per-function */
'use client';

import { useState } from 'react';
import { User } from '@supabase/supabase-js';
import { Typography } from '@/components/ui/typography';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { AvatarUpload } from '@/components/common/AvatarUpload';
import { HeaderModal } from '@/components/modals';
import {
  Pencil,
  Facebook,
  Instagram,
  Link as LinkIcon,
  Phone,
} from 'lucide-react';
import { HeaderFormValues } from '@/components/forms/HeaderForm';

export type HeaderSectionProps = {
  user: User;
  isPublished: boolean;
  isSubscribed: boolean;
  onPublishToggle: () => void;
  professionalData: HeaderFormValues & { photoUrl?: string | null | undefined };
  onSaveChanges: (data: HeaderFormValues) => Promise<void>;
};

export function HeaderSection({
  user,
  isPublished,
  professionalData,
  onSaveChanges,
}: HeaderSectionProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSaveChanges = async (data: HeaderFormValues) => {
    console.log('Saving changes:', data);
    try {
      await onSaveChanges(data);
      setIsModalOpen(false);
    } catch (error) {
      console.error('Failed to save header section:', error);
    }
  };

  const fallbackName = `${professionalData.firstName} ${professionalData.lastName}`;

  return (
    <>
      <Card className="border border-border overflow-hidden">
        <CardHeader className="flex flex-row items-start justify-between pb-4">
          <div>
            <Typography variant="h3" className="font-bold text-foreground">
              Professional Information
            </Typography>
            <div
              className={`mt-1 px-3 py-0.5 inline-block rounded-full text-xs font-medium ${isPublished ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}
            >
              {isPublished ? 'Published' : 'Not Published'}
            </div>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsModalOpen(true)}
            className="h-8 w-8 flex-shrink-0 text-muted-foreground hover:text-foreground"
            aria-label="Edit professional information"
          >
            <Pencil className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-col md:flex-row gap-6">
            <AvatarUpload
              userId={user.id}
              fallbackName={fallbackName}
              size="lg"
              avatarContainerClassName="border-muted"
            />

            <div className="flex-1 space-y-2">
              <div>
                <Typography variant="h3" className="font-bold text-foreground">
                  {fallbackName}
                </Typography>
                <Typography variant="muted" className="text-muted-foreground">
                  {professionalData.profession}
                </Typography>
              </div>

              {professionalData.description && (
                <Typography className="text-foreground text-sm">
                  {professionalData.description}
                </Typography>
              )}

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1">
                {professionalData.phoneNumber && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Phone className="h-3.5 w-3.5 mr-1.5" />
                    {professionalData.phoneNumber}
                  </div>
                )}
                {professionalData.instagramUrl && (
                  <a
                    href={professionalData.instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Instagram"
                    className="flex items-center text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Instagram className="h-4 w-4 mr-1" />
                  </a>
                )}
                {professionalData.facebookUrl && (
                  <a
                    href={professionalData.facebookUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Facebook"
                    className="flex items-center text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Facebook className="h-4 w-4 mr-1" />
                  </a>
                )}
                {professionalData.tiktokUrl && (
                  <a
                    href={professionalData.tiktokUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="TikTok"
                    className="flex items-center text-muted-foreground hover:text-primary transition-colors"
                  >
                    <LinkIcon className="h-4 w-4 mr-1" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <HeaderModal
        isOpen={isModalOpen}
        onOpenChange={setIsModalOpen}
        onSubmitSuccess={handleSaveChanges}
        defaultValues={professionalData}
      />
    </>
  );
}
