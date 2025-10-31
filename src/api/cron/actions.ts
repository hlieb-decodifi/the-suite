'use server';

/**
 * Server action to trigger cron jobs securely
 * This keeps the CRON_SECRET on the server side
 */
export async function triggerCronJob(jobEndpoint: string): Promise<{
  success: boolean;
  message?: string;
  processed?: number;
  errors?: number;
  errorDetails?: string[];
  duration?: number;
  error?: string;
}> {
  try {
    // Get the cron secret from environment variables (server-side only)
    const cronSecret =
      process.env.CRON_SECRET || process.env.NEXT_PUBLIC_CRON_SECRET;

    if (!cronSecret) {
      console.error('CRON_SECRET not configured');
      return {
        success: false,
        message: 'Server configuration error: CRON_SECRET not found',
      };
    }

    // Get the base URL for the current environment
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      'http://localhost:3000';
    const url = `${baseUrl}${jobEndpoint}`;

    console.log(`[SERVER] Triggering cron job: ${url}`);

    // Make the request with the secret
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${cronSecret}`,
        'Content-Type': 'application/json',
      },
    });

    // Check if the response is JSON
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const result = await response.json();

      if (response.ok) {
        console.log(`[SERVER] Cron job succeeded: ${jobEndpoint}`);
        return {
          success: true,
          ...result,
        };
      } else {
        console.error(`[SERVER] Cron job failed: ${jobEndpoint}`, result);
        return {
          success: false,
          ...result,
        };
      }
    } else {
      // Handle non-JSON response
      const text = await response.text();
      console.error(
        `[SERVER] Non-JSON response from cron job: ${jobEndpoint}`,
        {
          status: response.status,
          text: text.substring(0, 100),
        },
      );

      return {
        success: false,
        message: `Server returned non-JSON response (${response.status})`,
        error: text.substring(0, 100) + '...',
      };
    }
  } catch (error) {
    console.error(`[SERVER] Error triggering cron job: ${jobEndpoint}`, error);
    return {
      success: false,
      message: 'Failed to trigger cron job',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
