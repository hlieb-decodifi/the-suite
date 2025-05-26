import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import {
  getUserData,
  getSubscriptionPlans,
  getStripeConnectStatus,
} from '@/components/templates/ProfileTemplate/components/ProfessionalProfileView/actions';
import SubscriptionSectionClient from '@/components/templates/ProfileTemplate/components/ProfessionalProfileView/components/SubscriptionSection/SubscriptionSectionClient';
import { Typography } from '@/components/ui/typography';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default async function SubscriptionPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const supabase = await createClient();

  // Await searchParams before using
  const resolvedSearchParams = await searchParams;

  // Get the current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Fetch user data and subscription plans on the server
  const userData = await getUserData(user.id);
  const plans = await getSubscriptionPlans();

  // Get Stripe Connect status if user is subscribed
  let connectStatus = null;
  if (userData.isProfessional && userData.subscriptionStatus) {
    try {
      connectStatus = await getStripeConnectStatus(user.id);
    } catch (error) {
      console.error('Error fetching Stripe Connect status:', error);
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start mb-6 gap-4">
        <div>
          <Typography
            variant="h2"
            className="leading-5 border-none font-bold text-foreground"
          >
            Subscription Management
          </Typography>
          <Typography className="text-muted-foreground">
            Manage your professional subscription and billing settings
          </Typography>
        </div>
        <Link href="/profile">
          <Button variant="outline" className="w-full md:w-auto">
            <ArrowLeft size={16} className="mr-2" />
            Back to Profile
          </Button>
        </Link>
      </div>

      {/* Subscription Section */}
      <SubscriptionSectionClient
        userData={userData}
        plans={plans}
        connectStatus={connectStatus}
        searchParams={resolvedSearchParams}
      />
    </div>
  );
}
