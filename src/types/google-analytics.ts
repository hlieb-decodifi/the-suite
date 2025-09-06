/**
 * Google Analytics dashboard data types
 */

export type SiteTrafficMetrics = {
  totalVisits: number;
  uniqueVisitors: number;
  pageViews: number;
  bounceRate: number;
  averageSessionDuration: number;
  sessionsPerUser: number;
}

export type DeviceTypeMetric = {
  device: string;
  sessions: number;
  percentage: number;
}

export type TrafficSourceMetric = {
  source: string;
  medium: string;
  sessions: number;
  percentage: number;
}

export type TopPageMetric = {
  page: string;
  pageViews: number;
  uniquePageViews: number;
  averageTimeOnPage: number;
}

export type GoogleAnalyticsDashboardData = {
  siteTraffic: SiteTrafficMetrics;
  deviceTypes: DeviceTypeMetric[];
  trafficSources: TrafficSourceMetric[];
  topPages: TopPageMetric[];
  dateRange: {
    startDate: string;
    endDate: string;
  };
}

export type GAApiResponse = {
  success: boolean;
  data?: GoogleAnalyticsDashboardData;
  error?: string;
}

