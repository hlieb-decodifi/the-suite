/* eslint-disable max-lines-per-function */
'use client';

import { useProfile, useUpdateProfileHeader } from '@/api/profiles/hooks';
import { AvatarUpload } from '@/components/common/AvatarUpload';
import { ExpandableText } from '@/components/common/ExpandableText';
import { HeaderFormValues } from '@/components/forms/HeaderForm/schema';
import { HeaderModal } from '@/components/modals';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Typography } from '@/components/ui/typography';
import { User } from '@supabase/supabase-js';
import {
  AlertCircle,
  Facebook,
  Instagram,
  Link as LinkIcon,
  Pencil,
  Phone,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

export type HeaderSectionProps = {
  user: User;
  onPublishToggle: () => void;
};

export function HeaderSection({ user }: HeaderSectionProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch profile data using React Query
  const { data: profileData, isLoading, error } = useProfile(user.id);

  // Setup mutation for updating profile header
  const updateProfileHeader = useUpdateProfileHeader();

  const handleSaveChanges = async (data: HeaderFormValues) => {
    updateProfileHeader.mutate(
      { userId: user.id, data },
      {
        onSuccess: () => setIsModalOpen(false),
      },
    );
  };

  // Handle loading state
  if (isLoading) {
    return (
      <Card className="border border-border overflow-hidden">
        <CardHeader className="flex flex-row items-start justify-between pb-4">
          <div>
            <Skeleton className="h-6 w-36" />
            <Skeleton className="h-4 w-24 mt-1" />
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-col md:flex-row gap-6">
            <Skeleton className="h-24 w-24 rounded-full" />
            <div className="flex-1 space-y-2">
              <div>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-32 mt-1" />
              </div>
              <Skeleton className="h-16 w-full" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Handle error state
  if (error || !profileData) {
    return (
      <Card className="border border-red-200 bg-red-50">
        <CardContent className="py-4">
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            <Typography>
              Error loading profile data. Please try again later.
            </Typography>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isPublished = profileData.isPublished ?? false;
  const fallbackName = `${profileData.firstName} ${profileData.lastName}`;

  // Map profileData to the shape needed by HeaderModal
  const headerFormData: HeaderFormValues = {
    firstName: profileData.firstName,
    lastName: profileData.lastName,
    profession: profileData.profession ?? '',
    description: profileData.description ?? '',
    phoneNumber: profileData.phoneNumber ?? undefined,
    facebookUrl: profileData.facebookUrl ?? undefined,
    instagramUrl: profileData.instagramUrl ?? undefined,
    tiktokUrl: profileData.tiktokUrl ?? undefined,
  };

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
            disabled={updateProfileHeader.isPending}
          >
            <Pencil className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-start flex-col md:flex-row gap-6">
            {user?.id && (
              <AvatarUpload
                userId={user.id}
                fallbackName={fallbackName}
                size="lg"
                avatarContainerClassName="border-muted"
              />
            )}

            <div className="flex-1 space-y-2">
              <div>
                <Typography variant="h3" className="font-bold text-foreground">
                  {fallbackName}
                </Typography>
                <Typography variant="muted" className="text-muted-foreground">
                  {headerFormData.profession}
                </Typography>
              </div>

              {headerFormData.description && (
                <ExpandableText
                  text={headerFormData.description}
                  maxLines={3}
                  variant="p"
                  textClassName="text-foreground text-sm"
                  lineHeight="leading-tight"
                />
              )}

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1">
                {headerFormData.phoneNumber && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Phone className="h-3.5 w-3.5 mr-1.5" />
                    <Link href={`tel:${headerFormData.phoneNumber}`}>
                      {headerFormData.phoneNumber}
                    </Link>
                  </div>
                )}
                {headerFormData.instagramUrl && (
                  <a
                    href={headerFormData.instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Instagram"
                    className="flex items-center text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Instagram className="h-4 w-4 mr-1" />
                  </a>
                )}
                {headerFormData.facebookUrl && (
                  <a
                    href={headerFormData.facebookUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Facebook"
                    className="flex items-center text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Facebook className="h-4 w-4 mr-1" />
                  </a>
                )}
                {headerFormData.tiktokUrl && (
                  <a
                    href={headerFormData.tiktokUrl}
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
        onOpenChange={updateProfileHeader.isPending ? () => {} : setIsModalOpen}
        onSubmitSuccess={handleSaveChanges}
        defaultValues={headerFormData}
      />
    </>
  );
}
