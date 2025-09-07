'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Typography } from '@/components/ui/typography';
import { Button } from '@/components/ui/button';
import {
  RefreshCw,
  Users,
  Eye,
  MousePointer,
  Clock,
  Monitor,
  Smartphone,
  Tablet,
} from 'lucide-react';
import type {
  GoogleAnalyticsDashboardData,
  GAApiResponse,
} from '@/types/google-analytics';
import { useDateRange } from '@/components/layouts/AdminDashboardPageLayout/DateRangeContextProvider';
import { MetricCard } from './MetricCard';
import { AnalyticsListWidget } from './AnalyticsListWidget';
import { TopPagesWidget } from './TopPagesWidget';

type GoogleAnalyticsDashboardProps = {
  className?: string;
};

export function GoogleAnalyticsDashboard({
  className,
}: GoogleAnalyticsDashboardProps) {
  const [data, setData] = useState<GoogleAnalyticsDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { start, end } = useDateRange();

  const fetchAnalyticsData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Build query parameters based on date range context
      const params = new URLSearchParams();

      if (start && end) {
        // Use the date range from context
        params.set('startDate', start);
        params.set('endDate', end);
      } else {
        // Use all time statistics if no dates selected
        params.set('startDate', '2015-08-14'); // Google Analytics earliest allowed date
        params.set('endDate', 'today');
      }

      const response = await fetch(
        `/api/analytics/google?${params.toString()}`,
      );
      const result: GAApiResponse = await response.json();

      if (result.success && result.data) {
        setData(result.data);
      } else {
        setError(result.error || 'Failed to fetch analytics data');
      }
    } catch (err) {
      setError('Failed to fetch analytics data');
      console.error('Analytics fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [start, end]);

  useEffect(() => {
    fetchAnalyticsData();
  }, [fetchAnalyticsData]);

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getDeviceIcon = (device: string) => {
    switch (device.toLowerCase()) {
      case 'mobile':
        return <Smartphone className="w-4 h-4" />;
      case 'tablet':
        return <Tablet className="w-4 h-4" />;
      default:
        return <Monitor className="w-4 h-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center justify-between">
          <Typography variant="h3">Site Traffic Analytics</Typography>
          <Button disabled>
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            Loading...
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center justify-between">
          <Typography variant="h3">Site Traffic Analytics</Typography>
          <Button onClick={fetchAnalyticsData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <Typography variant="h4" className="text-destructive mb-2">
                Failed to Load Analytics
              </Typography>
              <Typography className="text-muted-foreground mb-4">
                {error}
              </Typography>
              <Button onClick={fetchAnalyticsData}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Typography variant="h3">Site Traffic Analytics</Typography>
          <Typography className="text-muted-foreground">
            {data.dateRange.startDate} to {data.dateRange.endDate}
          </Typography>
        </div>
        <Button onClick={fetchAnalyticsData} disabled={isLoading}>
          <RefreshCw
            className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`}
          />
          Refresh
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Visits"
          value={formatNumber(data.siteTraffic.totalVisits)}
          icon={Users}
          iconColor="text-blue-500"
        />

        <MetricCard
          title="Unique Visitors"
          value={formatNumber(data.siteTraffic.uniqueVisitors)}
          icon={Users}
          iconColor="text-green-500"
        />

        <MetricCard
          title="Page Views"
          value={formatNumber(data.siteTraffic.pageViews)}
          icon={Eye}
          iconColor="text-purple-500"
        />

        <MetricCard
          title="Avg. Session Duration"
          value={formatDuration(data.siteTraffic.averageSessionDuration)}
          icon={Clock}
          iconColor="text-orange-500"
        />
      </div>

      {/* Device Types and Traffic Sources */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AnalyticsListWidget
          title="Device Types"
          items={data.deviceTypes.map((device, index) => ({
            id: index,
            primary: (
              <Typography className="font-medium capitalize">
                {device.device}
              </Typography>
            ),
            value: formatNumber(device.sessions),
            subValue: `${device.percentage}%`,
            icon: getDeviceIcon(device.device),
          }))}
          emptyMessage="No device data available"
          emptyDescription="Device analytics will appear here once your site receives traffic."
        />

        <AnalyticsListWidget
          title="Traffic Sources"
          items={data.trafficSources.map((source, index) => ({
            id: index,
            primary: source.source,
            secondary: source.medium,
            value: formatNumber(source.sessions),
            subValue: `${source.percentage}%`,
            icon: <MousePointer className="w-4 h-4 text-muted-foreground" />,
          }))}
          emptyMessage="No traffic source data available"
          emptyDescription="Traffic source analytics will appear here once your site receives visitors."
        />
      </div>

      {/* Top Pages */}
      <TopPagesWidget
        title="Top Pages"
        pages={data.topPages}
        formatNumber={formatNumber}
        formatDuration={formatDuration}
        emptyMessage="No page data available"
        emptyDescription="Page analytics will appear here once your site receives traffic and page views."
      />
    </div>
  );
}
