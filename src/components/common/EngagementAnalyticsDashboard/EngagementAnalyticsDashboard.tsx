'use client';

import { useEffect, useState, useCallback } from 'react';
import { Typography } from '@/components/ui/typography';
import { Button } from '@/components/ui/button';
import { RefreshCw, TrendingUp, TrendingDown, Users, Eye } from 'lucide-react';
import { MetricCard } from '@/components/common/GoogleAnalyticsDashboard/MetricCard';
import { AnalyticsListWidget } from '@/components/common/GoogleAnalyticsDashboard/AnalyticsListWidget';
import { useDateRange } from '@/components/layouts/AdminDashboardPageLayout/DateRangeContextProvider';
import {
  getEngagementAnalytics,
  getNonConvertingUsers,
} from '@/api/activity-log/actions';
import type {
  EngagementAnalytics,
  NonConvertingUser,
} from '@/types/activity-analytics';
import { NonConvertingUsersModal } from '@/components/modals/NonConvertingUsersModal';

type EngagementAnalyticsDashboardProps = {
  className?: string;
};

export function EngagementAnalyticsDashboard({
  className,
}: EngagementAnalyticsDashboardProps) {
  const [analyticsData, setAnalyticsData] =
    useState<EngagementAnalytics | null>(null);
  const [nonConvertingUsers, setNonConvertingUsers] = useState<
    NonConvertingUser[]
  >([]);
  const [totalNonConvertingUsers, setTotalNonConvertingUsers] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { start, end } = useDateRange();

  const fetchEngagementData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch engagement analytics
      const analyticsResult = await getEngagementAnalytics(start, end);

      if (!analyticsResult.success) {
        setError(
          analyticsResult.error || 'Failed to fetch engagement analytics',
        );
        return;
      }

      setAnalyticsData(analyticsResult.data || null);

      // Fetch non-converting users (only first 5 for widget display)
      const usersResult = await getNonConvertingUsers(start, end);

      if (!usersResult.success) {
        console.error(
          'Failed to fetch non-converting users:',
          usersResult.error,
        );
        setNonConvertingUsers([]);
        setTotalNonConvertingUsers(0);
      } else {
        const users = (usersResult.data as NonConvertingUser[]) || [];
        setNonConvertingUsers(users.slice(0, 5)); // Show only first 5 for the widget
        setTotalNonConvertingUsers(users.length);
      }
    } catch (err) {
      setError('Failed to fetch engagement data');
      console.error('Engagement analytics fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [start, end]);

  useEffect(() => {
    fetchEngagementData();
  }, [fetchEngagementData]);

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  const formatPercentage = (num: number): string => {
    return `${num.toFixed(1)}%`;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
    });
  };

  const formatUserName = (user: NonConvertingUser): string => {
    if (user.user_name) {
      return user.user_name;
    }
    if (user.user_id) {
      return `User ${user.user_id.slice(0, 8)}...`;
    }
    return `Anonymous (${user.session_id.slice(0, 8)}...)`;
  };

  const getDateRangeText = () => {
    if (start && end) {
      return `${start} to ${end}`;
    }
    return 'All time';
  };

  if (isLoading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center justify-between">
          <Typography variant="h3">Engagement Analytics</Typography>
          <Button disabled>
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            Loading...
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-card border rounded-lg p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center justify-between">
          <Typography variant="h3">Engagement Analytics</Typography>
          <Button onClick={fetchEngagementData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>

        <div className="bg-card border rounded-lg p-6">
          <div className="text-center">
            <Typography variant="h4" className="text-destructive mb-2">
              Failed to Load Engagement Analytics
            </Typography>
            <Typography className="text-muted-foreground mb-4">
              {error}
            </Typography>
            <Button onClick={fetchEngagementData}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!analyticsData) {
    return null;
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Typography variant="h3">Engagement Analytics</Typography>
          <Typography className="text-muted-foreground">
            {getDateRangeText()}
          </Typography>
        </div>
        <Button onClick={fetchEngagementData} disabled={isLoading}>
          <RefreshCw
            className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`}
          />
          Refresh
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Views"
          value={formatNumber(
            analyticsData.total_service_views +
              analyticsData.total_professional_views,
          )}
          description="Combined service + professional page views"
          icon={Eye}
          iconColor="text-blue-500"
        />

        <MetricCard
          title="Conversion Rate"
          value={formatPercentage(analyticsData.conversion_rate)}
          description="% of viewers who completed bookings"
          icon={TrendingUp}
          iconColor="text-green-500"
        />

        <MetricCard
          title="Engagement Rate"
          value={formatPercentage(analyticsData.engagement_rate)}
          description="% of viewers who started booking process"
          icon={TrendingUp}
          iconColor="text-purple-500"
        />

        <MetricCard
          title="Bounce Rate"
          value={formatPercentage(analyticsData.bounce_rate)}
          description="% of viewers who left without engaging"
          icon={TrendingDown}
          iconColor="text-orange-500"
        />
      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Breakdown */}
        <AnalyticsListWidget
          title="Activity Breakdown"
          items={[
            {
              id: 'service_views',
              primary: 'Service Views',
              value: formatNumber(analyticsData.total_service_views),
              icon: <Eye className="w-4 h-4 text-blue-500" />,
            },
            {
              id: 'professional_views',
              primary: 'Professional Views',
              value: formatNumber(analyticsData.total_professional_views),
              icon: <Users className="w-4 h-4 text-green-500" />,
            },
            {
              id: 'bookings_started',
              primary: 'Bookings Started',
              value: formatNumber(analyticsData.total_bookings_started),
              icon: <TrendingUp className="w-4 h-4 text-purple-500" />,
            },
            {
              id: 'bookings_completed',
              primary: 'Bookings Completed',
              value: formatNumber(analyticsData.total_bookings_completed),
              icon: <TrendingUp className="w-4 h-4 text-orange-500" />,
            },
          ]}
          emptyMessage="No activity data available"
          emptyDescription="Activity data will appear here once users start interacting with your platform."
        />

        {/* Non-Converting Users */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Typography variant="h4">
              Users Who Viewed But Didn't Book
            </Typography>
            {totalNonConvertingUsers > 0 && (
              <NonConvertingUsersModal totalCount={totalNonConvertingUsers} />
            )}
          </div>
          <AnalyticsListWidget
            title=""
            items={nonConvertingUsers.map((user, index) => ({
              id: user.session_id || index,
              primary: formatUserName(user),
              secondary: `Last seen: ${formatDate(user.last_activity)}`,
              value: `${user.service_views + user.professional_views} views`,
              subValue: `${user.bookings_started} started`,
              icon: <Users className="w-4 h-4 text-muted-foreground" />,
            }))}
            emptyMessage="No non-converting users found"
            emptyDescription="Users who viewed services or professionals but didn't complete bookings will appear here."
          />
        </div>
      </div>
    </div>
  );
}
