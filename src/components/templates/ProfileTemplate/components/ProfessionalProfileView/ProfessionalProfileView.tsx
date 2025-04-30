'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { User } from '@supabase/supabase-js';
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
import { ServiceModal } from '@/components/modals/ServiceModal';
import { ConfirmDeleteModal } from '@/components/modals/ConfirmDeleteModal';
import { ServiceFormValues } from '@/components/forms/ServiceForm';
import { toast } from '@/components/ui/use-toast';
import React from 'react';

const VALID_TABS = ['profile', 'services', 'portfolio', 'subscription'];

export type ProfessionalProfileViewProps = {
  user: User;
  // Removed mock props, data will be fetched/managed here
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
  professionalData: HeaderFormValues;
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
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8">
          <HeaderSection
            user={user}
            isPublished={isPublished}
            isSubscribed={isSubscribed}
            onPublishToggle={onPublishToggle}
            professionalData={professionalData}
            onSaveChanges={onSaveChanges}
          />
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

  // Other profile state (replace with actual data fetching)
  const [isPublished, setIsPublished] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [professionalData, setProfessionalData] = useState<HeaderFormValues>({
    firstName: 'Jane',
    lastName: 'Doe',
    profession: 'Professional',
    description: '',
    phoneNumber: '',
    twitterUrl: '',
    facebookUrl: '',
    tiktokUrl: '',
  });

  // --- Effects ---
  // Sync URL with active tab state
  useEffect(() => {
    const urlTab = searchParams.get('tab') || 'profile';
    if (VALID_TABS.includes(urlTab) && urlTab !== activeTab) {
      setActiveTab(urlTab);
    }
  }, [searchParams, activeTab]);

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

  // Profile data save handler (replace with actual logic)
  const handleSaveChanges = async (data: HeaderFormValues) => {
    console.log('Saving profile data:', data);
    setProfessionalData(data);
    await new Promise((resolve) => setTimeout(resolve, 500));
  };

  // Publish toggle handler (replace with actual logic)
  const handlePublishToggle = () => {
    if (!isSubscribed) {
      handleTabChange('subscription');
      return;
    }
    setIsPublished(!isPublished);
  };

  // Subscribe handler (replace with actual logic)
  const handleSubscribe = () => {
    setIsSubscribed(true);
    handleTabChange('subscription');
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

  return (
    <div className="space-y-8">
      <PageHeader
        isPublished={isPublished}
        isSubscribed={isSubscribed}
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
            isPublished={isPublished}
            isSubscribed={isSubscribed}
            onPublishToggle={handlePublishToggle}
            onEditPortfolio={handleEditPortfolio}
            professionalData={professionalData}
            onSaveChanges={handleSaveChanges}
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
            isSubscribed={isSubscribed}
            onSubscribe={handleSubscribe}
          />
        </TabsContent>
      </Tabs>

      {/* Render Modals Here (conditionally based on state) */}
      <ServiceModal
        isOpen={isServiceModalOpen}
        onOpenChange={setIsServiceModalOpen}
        onSubmitSuccess={handleServiceModalSubmitSuccess}
        service={editingService}
        isSubmitting={isSubmittingService}
      />

      <ConfirmDeleteModal
        isOpen={isConfirmDeleteOpen}
        onOpenChange={setIsConfirmDeleteOpen}
        onConfirm={handleConfirmDeleteService}
        itemName={serviceToDelete?.name ?? 'this service'}
        title="Delete Service?"
        description={`Are you sure you want to delete the service "${serviceToDelete?.name ?? 'this service'}"? This action cannot be undone.`}
        isDeleting={isDeletingService}
      />
    </div>
  );
}
