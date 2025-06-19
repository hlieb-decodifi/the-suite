'use client';

import { User } from '@supabase/supabase-js';
import { useState, useTransition } from 'react';
import type { ProfileData } from '@/types/profiles';
import type { HeaderFormValues } from '@/components/forms/HeaderForm/schema';
import type { WorkingHoursEntry } from '@/types/working_hours';
import type { PaymentMethod } from '@/types/payment_methods';
import type { PortfolioPhotoUI } from '@/types/portfolio-photos';
import { PhoneNumberUtil, PhoneNumberFormat } from 'google-libphonenumber';
import { ContactSection } from './components/ContactSection/ContactSection';
import { LocationSection } from './components/LocationSection/LocationSection';
import { ReviewsSection } from './components/ReviewsSection/ReviewsSection';
import { AvatarUpload } from '@/components/common/AvatarUpload';
import { ExpandableText } from '@/components/common/ExpandableText';
import { HeaderModal } from '@/components/modals';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Typography } from '@/components/ui/typography';
import { toast } from '@/components/ui/use-toast';
import {
  useProfessionalPaymentMethods,
  useAvailablePaymentMethods,
  useUpdateProfessionalPaymentMethods,
} from '@/api/payment_methods/hooks';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertCircle,
  Facebook,
  Instagram,
  Link as LinkIcon,
  Pencil,
  Phone,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { updateProfileHeaderAction } from './ProfilePage';
import {
  PaymentMethodsForm,
  PaymentMethodsFormValues,
} from '@/components/forms/PaymentMethodsForm';
import { useProfile } from '@/api/profiles/hooks';

const phoneUtil = PhoneNumberUtil.getInstance();

const formatPhoneNumber = (phone: string): string => {
  if (!phone || phone.trim() === '') {
    return phone;
  }

  try {
    const parsed = phoneUtil.parseAndKeepRawInput(phone);
    if (phoneUtil.isValidNumber(parsed)) {
      // Use INTERNATIONAL format for a clean, professional display
      return phoneUtil.format(parsed, PhoneNumberFormat.INTERNATIONAL);
    }
    // If parsing fails or number is invalid, return the original phone number
    return phone;
  } catch {
    // If parsing fails, return the original phone number
    return phone;
  }
};

export type ProfilePageClientProps = {
  user: User;
  profileData: ProfileData | null;
  workingHours: WorkingHoursEntry[];
  timezone: string;
  paymentMethods: PaymentMethod[];
  portfolioPhotos: PortfolioPhotoUI[];
  reviews: import('@/api/reviews/api').ReviewData[];
  reviewStats: import('@/api/reviews/api').ProfessionalRatingStats | null;
  isEditable?: boolean;
  unreadMessagesCount?: number;
};

// Inline HeaderSection component
function InlineHeaderSection({
  user,
  profileData,
  isEditable = true,
}: {
  user: User;
  profileData: ProfileData;
  isEditable?: boolean;
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSaveChanges = async (data: HeaderFormValues) => {
    startTransition(async () => {
      try {
        const result = await updateProfileHeaderAction(user.id, data);
        if (result.success) {
          toast({ description: 'Profile information updated successfully.' });
          setIsModalOpen(false);
        } else {
          toast({
            variant: 'destructive',
            title: 'Error saving profile',
            description: result.error || 'An unexpected error occurred',
          });
        }
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Error saving profile',
          description:
            error instanceof Error
              ? error.message
              : 'An unexpected error occurred',
        });
      }
    });
  };

  const isPublished = profileData.isPublished ?? false;
  const fallbackName = `${profileData.firstName} ${profileData.lastName}`;

  // Map profileData to the shape needed by HeaderModal
  const headerFormData: Partial<HeaderFormValues> = {
    firstName: profileData.firstName,
    lastName: profileData.lastName,
    profession: profileData.profession ?? '',
    description: profileData.description ?? '',
    phoneNumber: profileData.phoneNumber ?? '',
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
          {isEditable && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsModalOpen(true)}
              className="h-8 w-8 flex-shrink-0 text-muted-foreground hover:text-foreground"
              aria-label="Edit professional information"
              disabled={isPending}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-start flex-col md:flex-row gap-6">
            <AvatarUpload
              userId={user.id}
              fallbackName={fallbackName}
              size="lg"
              avatarContainerClassName="border-muted"
              uploadEnabled={isEditable}
            />

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
                      {formatPhoneNumber(headerFormData.phoneNumber)}
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
        onOpenChange={isPending ? () => {} : setIsModalOpen}
        onSubmitSuccess={handleSaveChanges}
        defaultValues={headerFormData}
      />
    </>
  );
}

// Inline ProfileOverviewSection component
function InlineProfileOverviewSection({
  portfolioPhotos,
  isEditable = true,
}: {
  portfolioPhotos: PortfolioPhotoUI[];
  isEditable?: boolean;
}) {
  const [currentSlide, setCurrentSlide] = useState(0);

  // Use server-fetched portfolio photos directly
  const isLoading = false; // No loading state needed since data is pre-fetched
  const error = null; // No error state needed since data is pre-fetched

  const nextSlide = () => {
    if (portfolioPhotos.length === 0) return;
    setCurrentSlide((prev) =>
      prev === portfolioPhotos.length - 1 ? 0 : prev + 1,
    );
  };

  const prevSlide = () => {
    if (portfolioPhotos.length === 0) return;
    setCurrentSlide((prev) =>
      prev === 0 ? portfolioPhotos.length - 1 : prev - 1,
    );
  };

  // Get the current photo safely
  const currentPhoto = portfolioPhotos[currentSlide];

  return (
    <Card className="border border-border">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <Typography variant="h3" className="font-bold text-foreground">
          Portfolio
        </Typography>
        {isEditable && (
          <Button
            variant="outline"
            size="icon"
            onClick={() => (window.location.href = '/profile/portfolio')}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            <Pencil className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="pt-2">
        <div className="space-y-6">
          {/* Loading state */}
          {isLoading && <Skeleton className="aspect-video w-full rounded-md" />}

          {/* Error state */}
          {error && !isLoading && (
            <div className="aspect-video bg-red-50 border border-red-200 rounded-md flex items-center justify-center p-4">
              <Typography className="text-red-600 text-center">
                Error loading portfolio images
              </Typography>
            </div>
          )}

          {/* Empty state */}
          {!isLoading && !error && portfolioPhotos.length === 0 && (
            <div className="aspect-video bg-muted rounded-md flex flex-col items-center justify-center p-4">
              <ImageIcon className="h-10 w-10 text-muted-foreground mb-2" />
              <Typography className="text-muted-foreground text-center">
                No portfolio images yet
              </Typography>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => (window.location.href = '/profile/portfolio')}
              >
                Add Photos
              </Button>
            </div>
          )}

          {/* Portfolio Carousel */}
          {!isLoading &&
            !error &&
            portfolioPhotos.length > 0 &&
            currentPhoto && (
              <div className="relative aspect-video bg-muted rounded-md overflow-hidden">
                <Image
                  src={currentPhoto.url}
                  alt={currentPhoto.description || 'Portfolio image'}
                  fill
                  sizes="(max-width: 768px) 100vw, 800px"
                  className="object-contain"
                  priority
                />

                {/* Navigation buttons (only if there's more than one photo) */}
                {portfolioPhotos.length > 1 && (
                  <>
                    <Button
                      variant="outline"
                      size="icon"
                      className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-background/80 hover:bg-background"
                      onClick={prevSlide}
                    >
                      <ChevronLeft className="h-6 w-6" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-background/80 hover:bg-background"
                      onClick={nextSlide}
                    >
                      <ChevronRight className="h-6 w-6" />
                    </Button>

                    {/* Dots indicator */}
                    <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-1">
                      {portfolioPhotos.map((_, index) => (
                        <button
                          key={index}
                          className={`w-2 h-2 rounded-full transition-colors ${
                            index === currentSlide
                              ? 'bg-primary'
                              : 'bg-background/60'
                          }`}
                          onClick={() => setCurrentSlide(index)}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
        </div>
      </CardContent>
    </Card>
  );
}

// Inline PaymentMethodsSection component
function InlinePaymentMethodsSection({
  user,
  isEditable = true,
}: {
  user: User;
  isEditable?: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);

  // Fetch data using React Query
  const {
    data: availableMethods = [],
    isLoading: isLoadingAvailable,
    error: availableError,
  } = useAvailablePaymentMethods();

  const {
    data: acceptedMethods = [],
    isLoading: isLoadingAccepted,
    error: acceptedError,
  } = useProfessionalPaymentMethods(user.id);

  // Fetch profile data to check if profile is published
  const { data: profileData } = useProfile(user.id);
  const isPublished = profileData?.isPublished ?? false;

  // Setup mutation for updating payment methods
  const updatePaymentMethods = useUpdateProfessionalPaymentMethods();

  const isLoading = isLoadingAvailable || isLoadingAccepted;

  const handleEditToggle = () => {
    setIsEditing(!isEditing);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  // Prepare default values for the form (boolean map)
  const defaultValuesForForm: PaymentMethodsFormValues =
    availableMethods.reduce((acc, method) => {
      acc[method.id] = acceptedMethods.some((am) => am.id === method.id);
      return acc;
    }, {} as PaymentMethodsFormValues);

  const handleSave = async (formData: PaymentMethodsFormValues) => {
    // Convert boolean map back to array of selected IDs
    const selectedMethodIds = Object.entries(formData)
      .filter(([, isSelected]) => isSelected)
      .map(([id]) => id);

    updatePaymentMethods.mutate(
      {
        userId: user.id,
        selectedMethodIds,
      },
      {
        onSuccess: () => {
          setIsEditing(false);
        },
      },
    );
  };

  if (isLoading) {
    return (
      <Card className="border border-border">
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (availableError || acceptedError) {
    return (
      <Card className="border border-red-200 bg-red-50">
        <CardContent className="py-4">
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            <Typography>Error loading payment methods</Typography>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-border">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <Typography variant="h3" className="font-bold text-foreground">
          Payment Methods
        </Typography>
        {isEditable && (
          <Button
            variant="outline"
            size="icon"
            onClick={handleEditToggle}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            disabled={updatePaymentMethods.isPending}
          >
            <Pencil className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="pt-2">
        {isEditing ? (
          <PaymentMethodsForm
            availableMethods={availableMethods}
            defaultValues={defaultValuesForForm}
            onSubmitSuccess={handleSave}
            onCancel={handleCancel}
            isSubmitting={updatePaymentMethods.isPending}
            isPublished={isPublished}
          />
        ) : (
          <div className="space-y-2">
            {acceptedMethods.length > 0 ? (
              acceptedMethods.map((method) => (
                <div key={method.id} className="flex items-center gap-2">
                  <Typography variant="small">{method.name}</Typography>
                </div>
              ))
            ) : (
              <Typography variant="small" className="text-muted-foreground">
                No payment methods selected
              </Typography>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function ProfilePageClient({
  user,
  profileData,
  workingHours,
  timezone,
  portfolioPhotos,
  reviews,
  reviewStats,
  isEditable = true,
}: ProfilePageClientProps) {
  // Handle error state
  if (!profileData) {
    return (
      <div className="p-4 border border-red-200 bg-red-50 rounded-md flex items-center gap-3">
        <AlertCircle className="h-5 w-5 text-red-600" />
        <div>
          <Typography variant="h4" className="font-medium text-red-800">
            Profile Unavailable
          </Typography>
          <Typography variant="p" className="text-red-600">
            Error loading profile data. Please try again later.
          </Typography>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8">
          <InlineHeaderSection
            user={user}
            profileData={profileData}
            isEditable={isEditable}
          />
          <InlineProfileOverviewSection
            isEditable={isEditable}
            portfolioPhotos={portfolioPhotos}
          />
        </div>
        <div className="md:col-span-1 space-y-8">
          <ContactSection
            user={user}
            workingHours={workingHours}
            timezone={timezone}
            isLoading={false}
            isEditable={isEditable}
          />
          <LocationSection user={user} isEditable={isEditable} />
          {/* {showPaymentMethods && ( */}
          <InlinePaymentMethodsSection user={user} isEditable={isEditable} />
          {/* )} */}
        </div>
      </div>
      <ReviewsSection
        reviews={reviews}
        reviewStats={reviewStats}
        isEditable={isEditable}
      />
    </div>
  );
}
