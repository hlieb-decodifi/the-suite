/**
 * Utility to chain cron job execution to staging environment
 * When running in production, this will trigger the same cron endpoint on staging
 */

type CronChainOptions = {
  /**
   * The cron endpoint path (e.g., '/api/cron/pre-auth-payments')
   */
  endpoint: string;
  /**
   * Whether to wait for staging to complete (default: false for non-blocking)
   */
  awaitCompletion?: boolean;
}

type CronChainResult = {
  stagingTriggered: boolean;
  stagingSuccess?: boolean;
  stagingMessage?: string;
  stagingError?: string;
}

/**
 * Triggers the same cron job on staging environment (if in production)
 * This allows Vercel's production-only cron to cascade to staging
 */
export async function chainToStaging(
  options: CronChainOptions,
): Promise<CronChainResult> {
  const { endpoint, awaitCompletion = false } = options;

  // Only trigger staging if we're in production
  const isProduction = process.env.VERCEL_ENV === 'production';
  const stagingUrl = process.env.STAGING_URL;
  const cronSecret = process.env.CRON_SECRET;

  if (!isProduction) {
    console.log('[CRON-CHAIN] Not in production, skipping staging trigger');
    return { stagingTriggered: false };
  }

  if (!stagingUrl) {
    console.log(
      '[CRON-CHAIN] STAGING_URL not configured, cannot trigger staging',
    );
    return {
      stagingTriggered: false,
      stagingError: 'STAGING_URL not configured',
    };
  }

  if (!cronSecret) {
    console.log(
      '[CRON-CHAIN] CRON_SECRET not configured, cannot trigger staging',
    );
    return {
      stagingTriggered: false,
      stagingError: 'CRON_SECRET not configured',
    };
  }

  const fullUrl = `${stagingUrl}${endpoint}`;
  console.log(`[CRON-CHAIN] Triggering staging: ${fullUrl}`);

  const triggerStaging = async () => {
    try {
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${cronSecret}`,
          'Content-Type': 'application/json',
        },
        // Set a reasonable timeout
        signal: AbortSignal.timeout(120000), // 2 minutes
      });

      const contentType = response.headers.get('content-type');
      const result =
        contentType && contentType.includes('application/json')
          ? await response.json()
          : { message: await response.text() };

      if (response.ok) {
        console.log('[CRON-CHAIN] Staging triggered successfully:', result);
        return {
          stagingTriggered: true,
          stagingSuccess: true,
          stagingMessage: result.message || 'Success',
        };
      } else {
        console.error('[CRON-CHAIN] Staging trigger failed:', result);
        return {
          stagingTriggered: true,
          stagingSuccess: false,
          stagingError: result.error || result.message || 'Unknown error',
        };
      }
    } catch (error) {
      console.error('[CRON-CHAIN] Error triggering staging:', error);
      return {
        stagingTriggered: true,
        stagingSuccess: false,
        stagingError:
          error instanceof Error ? error.message : 'Unknown error',
      };
    }
  };

  if (awaitCompletion) {
    // Wait for staging to complete before returning
    return await triggerStaging();
  } else {
    // Fire and forget - don't block production cron completion
    triggerStaging().catch((error) => {
      console.error('[CRON-CHAIN] Background staging trigger failed:', error);
    });

    return {
      stagingTriggered: true,
      stagingMessage: 'Triggered in background',
    };
  }
}
