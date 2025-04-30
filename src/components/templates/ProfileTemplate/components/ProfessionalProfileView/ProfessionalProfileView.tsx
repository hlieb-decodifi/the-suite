'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { Typography } from '@/components/ui/typography';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { HeaderSection } from './components/HeaderSection/HeaderSection';
import { ProfileOverviewSection } from './components/ProfileOverviewSection/ProfileOverviewSection';
import { LocationSection } from './components/LocationSection/LocationSection';
import { ContactSection } from './components/ContactSection/ContactSection';
import { PaymentMethodsSection } from './components/PaymentMethodsSection/PaymentMethodsSection';
import { SubscriptionSection } from './components/SubscriptionSection/SubscriptionSection';
import { ServicesSection } from './components/ServicesSection/ServicesSection';
import { PortfolioSection } from './components/PortfolioSection/PortfolioSection';
import { ReviewsSection } from './components/ReviewsSection/ReviewsSection';
import { HeaderFormValues } from '@/components/forms/HeaderForm';
import {
  getServicesAction,
  upsertServiceAction,
  deleteServiceAction,
  ServiceUI,
} from '@/api/services/actions';
import {
  getProfessionalProfileViewDataAction,
  updateProfessionalProfileHeaderAction,
  ProfessionalProfileViewData,
} from '@/api/profiles/actions';
import { ServiceModal } from '@/components/modals/ServiceModal';
import { ConfirmDeleteModal } from '@/components/modals/ConfirmDeleteModal';
import { ServiceFormValues } from '@/components/forms/ServiceForm';
import { toast } from '@/components/ui/use-toast';
import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

const VALID_TABS = ['profile', 'services', 'portfolio', 'subscription'];

export type ProfessionalProfileViewProps = {
  user: User;
};

// Type for PageHeader props
type PageHeaderProps = {
  isPublished: boolean;
  isSubscribed: boolean;
  onPublishToggle: () => void;
  onSubscribe: () => void;
};

// Type for ProfileTabContent props
type ProfileTabContentProps = {
  user: User;
  isPublished: boolean;
  isSubscribed: boolean;
  onPublishToggle: () => void;
  onEditPortfolio: () => void;
  professionalData: ProfessionalProfileViewData | null;
  onSaveChanges: (data: HeaderFormValues) => Promise<void>;
};

// PageHeader and ProfileTabContent remain largely the same, but might need props updated if needed later
function PageHeader({
  isPublished,
  isSubscribed,
  onPublishToggle,
  onSubscribe,
}: PageHeaderProps) {
  return (
    <div className="space-y-2">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <Typography variant="h2" className="font-bold text-foreground">
          Professional Profile
        </Typography>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="bg-background">
            Go to Dashboard
          </Button>
          <Button
            variant={isPublished ? 'default' : 'outline'}
            className={
              isPublished
                ? 'bg-primary'
                : 'bg-background border-primary text-primary'
            }
            onClick={onPublishToggle}
            disabled={!isSubscribed}
          >
            {isPublished ? 'Unpublish Profile' : 'Publish Profile'}
          </Button>
        </div>
      </div>
      {!isSubscribed && (
        <div className="bg-muted p-3 rounded-md">
          <Typography className="text-muted-foreground text-sm">
            You need to subscribe to publish your profile.{' '}
            <Button
              variant="link"
              className="p-0 h-auto text-primary"
              onClick={onSubscribe}
            >
              Subscribe now
            </Button>
          </Typography>
        </div>
      )}
      <Typography className="text-muted-foreground">
        Manage your professional profile information and services
      </Typography>
      <Separator className="my-4" />
    </div>
  );
}

function ProfileTabContent({
  user,
  isPublished,
  isSubscribed,
  onPublishToggle,
  onEditPortfolio,
  professionalData,
  onSaveChanges,
}: ProfileTabContentProps) {
  // Map profileViewData to the shape needed by HeaderSection (HeaderFormValues & { photoUrl?: string })
  const headerDataForSection = professionalData
    ? {
        firstName: professionalData.first_name,
        lastName: professionalData.last_name,
        profession: professionalData.profession ?? '',
        description: professionalData.description ?? '',
        phoneNumber: professionalData.phone_number ?? undefined,
        facebookUrl: professionalData.facebook_url ?? undefined,
        instagramUrl: professionalData.instagram_url ?? undefined,
        tiktokUrl: professionalData.tiktok_url ?? undefined,
        photoUrl: professionalData.photoUrl ?? undefined,
      }
    : null;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8">
          {headerDataForSection ? (
            <HeaderSection
              user={user}
              isPublished={isPublished}
              isSubscribed={isSubscribed}
              onPublishToggle={onPublishToggle}
              professionalData={
                headerDataForSection as HeaderFormValues & { photoUrl?: string }
              }
              onSaveChanges={onSaveChanges}
            />
          ) : (
            <Skeleton className="h-[200px] w-full" />
          )}
          <ProfileOverviewSection
            user={user}
            onEditPortfolio={onEditPortfolio}
          />
        </div>
        <div className="md:col-span-1 space-y-8">
          <ContactSection />
          <LocationSection user={user} />
          <PaymentMethodsSection user={user} />
        </div>
      </div>
      <Separator className="my-4" />
      <ReviewsSection user={user} />
    </div>
  );
}

export function ProfessionalProfileView({
  user,
}: ProfessionalProfileViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setSession = useAuthStore((state) => state.setSession);
  const supabase = createClient();

  // Tab state
  const initialTab = searchParams.get('tab') || 'profile';
  const currentTab = VALID_TABS.includes(initialTab) ? initialTab : 'profile';
  const [activeTab, setActiveTab] = useState(currentTab);

  // Services state
  const [services, setServices] = useState<ServiceUI[]>([]);
  const [isLoadingServices, setIsLoadingServices] = useState(true);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceUI | null>(null);
  const [isSubmittingService, setIsSubmittingService] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState<ServiceUI | null>(
    null,
  );
  const [isDeletingService, setIsDeletingService] = useState(false);

  // Profile Data State
  const [profileViewData, setProfileViewData] =
    useState<ProfessionalProfileViewData | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  // --- Effects ---
  // Sync URL with active tab state
  useEffect(() => {
    const urlTab = searchParams.get('tab') || 'profile';
    if (VALID_TABS.includes(urlTab) && urlTab !== activeTab) {
      setActiveTab(urlTab);
    }
  }, [searchParams, activeTab]);

  // Fetch combined profile data on mount
  useEffect(() => {
    const fetchProfileData = async () => {
      setIsLoadingProfile(true);
      const result = await getProfessionalProfileViewDataAction(user.id);
      if (result.success && result.data) {
        setProfileViewData(result.data);
      } else {
        toast({
          title: 'Error loading profile data',
          description: result.error || 'Could not load profile.',
          variant: 'destructive',
        });
        setProfileViewData(null);
      }
      setIsLoadingProfile(false);
    };
    fetchProfileData();
  }, [user.id]);

  // Fetch services only once on mount
  useEffect(() => {
    const fetchServices = async () => {
      setIsLoadingServices(true);
      const result = await getServicesAction(user.id);
      if (result.success) {
        setServices(result.services || []);
      } else {
        toast({
          title: 'Error loading services',
          description: result.error || 'An unexpected error occurred.',
          variant: 'destructive',
        });
        setServices([]);
      }
      setIsLoadingServices(false);
    };
    fetchServices();
  }, [user.id]); // Dependency on user.id ensures refetch if user changes

  // --- Handlers ---
  // Tab change handler
  const handleTabChange = (newTab: string) => {
    if (VALID_TABS.includes(newTab)) {
      setActiveTab(newTab);
      router.replace(`?tab=${newTab}`, { scroll: false });
    }
  };

  // Profile Header save handler
  const handleHeaderSaveChanges = async (data: HeaderFormValues) => {
    const previousProfileData = profileViewData;
    // Optimistic update matching ProfessionalProfileViewData structure
    setProfileViewData((prev) =>
      prev
        ? {
            ...prev,
            first_name: data.firstName,
            last_name: data.lastName,
            profession: data.profession,
            description: data.description,
            phone_number: data.phoneNumber || null,
            facebook_url: data.facebookUrl || null,
            instagram_url: data.instagramUrl || null,
            tiktok_url: data.tiktokUrl || null,
          }
        : null,
    );

    const result = await updateProfessionalProfileHeaderAction(user.id, data);
    if (!result.success) {
      toast({
        title: 'Error saving profile',
        description: result.error,
        variant: 'destructive',
      });
      // Revert optimistic update on error
      setProfileViewData(previousProfileData);
    } else {
      toast({ description: 'Profile information updated successfully.' });
      // Refresh session and update auth store
      try {
        const { data: sessionData, error: sessionError } =
          await supabase.auth.refreshSession();
        if (sessionError) {
          console.error('Error refreshing session:', sessionError);
          // Optionally show a toast for session refresh failure
        } else if (sessionData.session) {
          setSession(sessionData.session);
        }
      } catch (refreshError) {
        console.error('Failed to refresh session:', refreshError);
      }
      // Optionally refetch profile view data if needed, though session refresh might suffice
      // const refreshedResult = await getProfessionalProfileViewDataAction(user.id);
      // if (refreshedResult.success && refreshedResult.data) setProfileViewData(refreshedResult.data);
    }
  };

  // Publish toggle handler
  const handlePublishToggle = () => {
    if (!profileViewData?.isSubscribed) {
      handleTabChange('subscription');
      return;
    }
    // TODO: Add server action for publish toggle
    const newPublishState = !(profileViewData?.is_published ?? false);
    // Optimistic update
    setProfileViewData((prev) =>
      prev ? { ...prev, is_published: newPublishState } : null,
    );
    console.log(
      'TODO: Call server action to set is_published to:',
      newPublishState,
    );
    // Handle potential error rollback if needed
  };

  // Subscribe handler
  const handleSubscribe = () => {
    // TODO: Add server action for subscription
    // Optimistic update
    setProfileViewData((prev) =>
      prev ? { ...prev, isSubscribed: true } : null,
    );
    handleTabChange('subscription');
    console.log('TODO: Call server action for subscription');
    // Handle potential error rollback if needed
  };

  // Portfolio edit handler
  const handleEditPortfolio = () => {
    handleTabChange('portfolio');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // --- Service Handlers ---
  const handleAddServiceClick = () => {
    setEditingService(null);
    setIsServiceModalOpen(true);
  };

  const handleEditService = (service: ServiceUI) => {
    setEditingService(service);
    setIsServiceModalOpen(true);
  };

  const handleDeleteServiceClick = (service: ServiceUI) => {
    setServiceToDelete(service);
    setIsConfirmDeleteOpen(true);
  };

  const handleConfirmDeleteService = async () => {
    if (!serviceToDelete) return;
    setIsDeletingService(true);
    const result = await deleteServiceAction(user.id, serviceToDelete.id);
    setIsDeletingService(false);
    if (result.success) {
      setServices((prev) => prev.filter((s) => s.id !== serviceToDelete.id));
      toast({
        title: 'Service deleted',
        description: `"${serviceToDelete.name}" has been successfully deleted.`,
      });
      setIsConfirmDeleteOpen(false);
      setServiceToDelete(null);
    } else {
      toast({
        title: 'Error deleting service',
        description: result.error || 'Could not delete the service.',
        variant: 'destructive',
      });
    }
  };

  const handleServiceModalSubmitSuccess = async (
    data: ServiceFormValues & { id?: string },
  ) => {
    setIsSubmittingService(true);
    const result = await upsertServiceAction(user.id, data);
    setIsSubmittingService(false);
    if (result.success && result.service) {
      if (data.id) {
        setServices((prev) =>
          prev.map((s) => (s.id === data.id ? result.service! : s)),
        );
        toast({
          title: 'Service updated',
          description: `"${result.service.name}" has been updated.`,
        });
      } else {
        setServices((prev) => [result.service!, ...prev]);
        toast({
          title: 'Service added',
          description: `"${result.service.name}" has been added.`,
        });
      }
      setIsServiceModalOpen(false);
    } else {
      toast({
        title: 'Error saving service',
        description: result.error || 'Could not save the service.',
        variant: 'destructive',
      });
    }
  };

  // --- Render Logic ---
  // Show main loading skeleton if profile data isn't loaded yet
  if (isLoadingProfile) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-8 w-full max-w-md" />
        <Skeleton className="h-60 w-full" />
      </div>
    );
  }

  // Handle case where profile data failed to load
  if (!profileViewData) {
    return (
      <Typography>Error loading profile. Please try again later.</Typography>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        isPublished={profileViewData.is_published ?? false}
        isSubscribed={profileViewData.isSubscribed ?? false}
        onPublishToggle={handlePublishToggle}
        onSubscribe={handleSubscribe}
      />

      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="w-full"
      >
        <TabsList className="w-full max-w-md mb-8 bg-muted/50 p-1 rounded-full">
          {VALID_TABS.map((tab) => (
            <TabsTrigger
              key={tab}
              value={tab}
              className="flex-1 rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground capitalize"
            >
              {tab}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="profile">
          <ProfileTabContent
            user={user}
            isPublished={profileViewData.is_published ?? false}
            isSubscribed={profileViewData.isSubscribed ?? false}
            onPublishToggle={handlePublishToggle}
            onEditPortfolio={handleEditPortfolio}
            professionalData={profileViewData}
            onSaveChanges={handleHeaderSaveChanges}
          />
        </TabsContent>

        <TabsContent value="services">
          <ServicesSection
            services={services}
            isLoading={isLoadingServices}
            onAddService={handleAddServiceClick}
            onEditService={handleEditService}
            onDeleteService={handleDeleteServiceClick}
          />
        </TabsContent>

        <TabsContent value="portfolio">
          <PortfolioSection user={user} />
        </TabsContent>

        <TabsContent value="subscription">
          <SubscriptionSection
            user={user}
            isSubscribed={profileViewData.isSubscribed ?? false}
            onSubscribe={handleSubscribe}
          />
        </TabsContent>
      </Tabs>

      <ServiceModal
        isOpen={isServiceModalOpen}
        onOpenChange={isSubmittingService ? () => {} : setIsServiceModalOpen}
        onSubmitSuccess={handleServiceModalSubmitSuccess}
        service={editingService}
        isSubmitting={isSubmittingService}
      />

      <ConfirmDeleteModal
        isOpen={isConfirmDeleteOpen}
        onOpenChange={isDeletingService ? () => {} : setIsConfirmDeleteOpen}
        onConfirm={handleConfirmDeleteService}
        itemName={serviceToDelete?.name ?? 'this service'}
        title="Delete Service?"
        description={`Are you sure you want to delete the service "${serviceToDelete?.name ?? 'this service'}"? This action cannot be undone.`}
        isDeleting={isDeletingService}
      />
    </div>
  );
}
