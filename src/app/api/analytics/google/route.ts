import { NextRequest, NextResponse } from 'next/server';
import { BetaAnalyticsDataClient } from '@google-analytics/data';
import type { GoogleAnalyticsDashboardData, GAApiResponse } from '@/types/google-analytics';

// Initialize the Analytics Data API client
let analyticsDataClient: BetaAnalyticsDataClient | null = null;

function getAnalyticsClient() {
  if (!analyticsDataClient) {
    const clientEmail = process.env.GA_CLIENT_EMAIL;
    const privateKey = process.env.GA_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const projectId = process.env.GA_PROJECT_ID;

    if (!clientEmail || !privateKey || !projectId) {
      throw new Error('Missing required Google Analytics credentials');
    }

    // Initialize with credentials
    analyticsDataClient = new BetaAnalyticsDataClient({
      credentials: {
        client_email: clientEmail,
        private_key: privateKey,
      },
      projectId: projectId,
    });
  }
  return analyticsDataClient;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') || '30daysAgo';
    const endDate = searchParams.get('endDate') || 'today';
    
    const propertyId = process.env.GA_PROPERTY_ID;
    
    if (!propertyId) {
      return NextResponse.json<GAApiResponse>({
        success: false,
        error: 'Google Analytics Property ID not configured',
      });
    }

    const client = getAnalyticsClient();

    // Fetch site traffic metrics
    const [siteTrafficResponse] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [
        {
          startDate,
          endDate,
        },
      ],
      metrics: [
        { name: 'sessions' },
        { name: 'totalUsers' },
        { name: 'screenPageViews' },
        { name: 'bounceRate' },
        { name: 'averageSessionDuration' },
        { name: 'sessionsPerUser' },
      ],
    });

    // Fetch device type data
    const [deviceTypeResponse] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [
        {
          startDate,
          endDate,
        },
      ],
      dimensions: [{ name: 'deviceCategory' }],
      metrics: [{ name: 'sessions' }],
      orderBys: [
        {
          metric: {
            metricName: 'sessions',
          },
          desc: true,
        },
      ],
    });

    // Fetch traffic source data
    const [trafficSourceResponse] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [
        {
          startDate,
          endDate,
        },
      ],
      dimensions: [{ name: 'sessionSource' }, { name: 'sessionMedium' }],
      metrics: [{ name: 'sessions' }],
      orderBys: [
        {
          metric: {
            metricName: 'sessions',
          },
          desc: true,
        },
      ],
      limit: 10,
    });

    // Fetch top pages data
    const [topPagesResponse] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [
        {
          startDate,
          endDate,
        },
      ],
      dimensions: [{ name: 'pagePath' }],
      metrics: [
        { name: 'screenPageViews' },
        { name: 'sessions' },
        { name: 'averageSessionDuration' },
      ],
      orderBys: [
        {
          metric: {
            metricName: 'screenPageViews',
          },
          desc: true,
        },
      ],
      limit: 10,
    });

    // Process site traffic data
    const siteTrafficMetrics = siteTrafficResponse.rows?.[0];
    const totalSessions = parseInt(siteTrafficMetrics?.metricValues?.[0]?.value || '0');
    
    // Process device type data
    const deviceTypes = deviceTypeResponse.rows?.map((row) => {
      const sessions = parseInt(row.metricValues?.[0]?.value || '0');
      return {
        device: row.dimensionValues?.[0]?.value || 'Unknown',
        sessions,
        percentage: totalSessions > 0 ? Math.round((sessions / totalSessions) * 100) : 0,
      };
    }) || [];

    // Process traffic source data
    const trafficSources = trafficSourceResponse.rows?.map((row) => {
      const sessions = parseInt(row.metricValues?.[0]?.value || '0');
      return {
        source: row.dimensionValues?.[0]?.value || 'Unknown',
        medium: row.dimensionValues?.[1]?.value || 'Unknown',
        sessions,
        percentage: totalSessions > 0 ? Math.round((sessions / totalSessions) * 100) : 0,
      };
    }) || [];

    // Process top pages data
    const topPages = topPagesResponse.rows?.map((row) => ({
      page: row.dimensionValues?.[0]?.value || '/',
      pageViews: parseInt(row.metricValues?.[0]?.value || '0'),
      uniquePageViews: parseInt(row.metricValues?.[1]?.value || '0'),
      averageTimeOnPage: parseFloat(row.metricValues?.[2]?.value || '0'),
    })) || [];

    const dashboardData: GoogleAnalyticsDashboardData = {
      siteTraffic: {
        totalVisits: totalSessions,
        uniqueVisitors: parseInt(siteTrafficMetrics?.metricValues?.[1]?.value || '0'),
        pageViews: parseInt(siteTrafficMetrics?.metricValues?.[2]?.value || '0'),
        bounceRate: parseFloat(siteTrafficMetrics?.metricValues?.[3]?.value || '0'),
        averageSessionDuration: parseFloat(siteTrafficMetrics?.metricValues?.[4]?.value || '0'),
        sessionsPerUser: parseFloat(siteTrafficMetrics?.metricValues?.[5]?.value || '0'),
      },
      deviceTypes,
      trafficSources,
      topPages,
      dateRange: {
        startDate,
        endDate,
      },
    };

    return NextResponse.json<GAApiResponse>({
      success: true,
      data: dashboardData,
    });

  } catch (error) {
    console.error('Google Analytics API error:', error);
    
    return NextResponse.json<GAApiResponse>({
      success: false,
      error: 'Failed to fetch Google Analytics data. Please check your configuration.',
    });
  }
}
