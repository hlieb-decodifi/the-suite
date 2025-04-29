'use client';

import { useState } from 'react';
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

export type ProfessionalProfileViewProps = {
  user: User;
};

// Helper component for the header section
function PageHeader({
  isPublished,
  isSubscribed,
  onPublishToggle,
  onSubscribe,
}: {
  isPublished: boolean;
  isSubscribed: boolean;
  onPublishToggle: () => void;
  onSubscribe: () => void;
}) {
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

// Helper component for the profile tab content
function ProfileTabContent({
  user,
  isPublished,
  isSubscribed,
  onPublishToggle,
}: {
  user: User;
  isPublished: boolean;
  isSubscribed: boolean;
  onPublishToggle: () => void;
}) {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8">
          <HeaderSection
            user={user}
            isPublished={isPublished}
            onPublishToggle={onPublishToggle}
            isSubscribed={isSubscribed}
          />
          <ProfileOverviewSection user={user} />
        </div>

        <div className="md:col-span-1 space-y-8">
          <ContactSection user={user} />
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
  const [isPublished, setIsPublished] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');

  const handlePublishToggle = () => {
    if (!isSubscribed) {
      // Can't publish without subscription
      setActiveTab('subscription');
      return;
    }
    setIsPublished(!isPublished);
  };

  const handleSubscribe = () => {
    setIsSubscribed(true);
    setActiveTab('subscription');
  };

  return (
    <div className="space-y-8">
      <PageHeader
        isPublished={isPublished}
        isSubscribed={isSubscribed}
        onPublishToggle={handlePublishToggle}
        onSubscribe={() => setActiveTab('subscription')}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full max-w-md mb-8 bg-muted/50 p-1 rounded-full">
          <TabsTrigger
            value="profile"
            className="flex-1 rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            Profile
          </TabsTrigger>
          <TabsTrigger
            value="services"
            className="flex-1 rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            Services
          </TabsTrigger>
          <TabsTrigger
            value="portfolio"
            className="flex-1 rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            Portfolio
          </TabsTrigger>
          <TabsTrigger
            value="subscription"
            className="flex-1 rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            Subscription
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <ProfileTabContent
            user={user}
            isPublished={isPublished}
            isSubscribed={isSubscribed}
            onPublishToggle={handlePublishToggle}
          />
        </TabsContent>

        <TabsContent value="services">
          <ServicesSection user={user} />
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
    </div>
  );
}
