'use client';

import { EngagementAnalyticsDashboard } from '@/components/common/EngagementAnalyticsDashboard/EngagementAnalyticsDashboard';
import { GoogleAnalyticsDashboard } from '@/components/common/GoogleAnalyticsDashboard/GoogleAnalyticsDashboard';
import { PostHogDashboard } from '@/components/common/PostHogDashboard/PostHogDashboard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Typography } from '@/components/ui/typography';

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <Typography variant="h2">Analytics Dashboard</Typography>

      {/* Analytics Tabs */}
      <Tabs defaultValue="engagement" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="engagement">Engagement Analytics</TabsTrigger>
          <TabsTrigger value="google-analytics">Google Analytics</TabsTrigger>
          <TabsTrigger value="posthog">PostHog Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="engagement" className="space-y-4">
          <EngagementAnalyticsDashboard />
        </TabsContent>

        <TabsContent value="google-analytics" className="space-y-4">
          <GoogleAnalyticsDashboard />
        </TabsContent>

        <TabsContent value="posthog" className="space-y-4">
          <PostHogDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
