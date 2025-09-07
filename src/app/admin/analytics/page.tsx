'use client';

import { Typography } from '@/components/ui/typography';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { GoogleAnalyticsDashboard } from '@/components/common/GoogleAnalyticsDashboard/GoogleAnalyticsDashboard';
import { PostHogDashboard } from '@/components/common/PostHogDashboard/PostHogDashboard';
import { GoogleAnalyticsDebug } from '@/components/common/GoogleAnalyticsDebug/GoogleAnalyticsDebug';

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <Typography variant="h2">Analytics Dashboard</Typography>

      {/* Analytics Tabs */}
      <Tabs defaultValue="google-analytics" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="google-analytics">Google Analytics</TabsTrigger>
          <TabsTrigger value="posthog">PostHog Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="google-analytics" className="space-y-4">
          <GoogleAnalyticsDebug />
          <GoogleAnalyticsDashboard />
        </TabsContent>

        <TabsContent value="posthog" className="space-y-4">
          <PostHogDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
