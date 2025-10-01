#!/usr/bin/env npx tsx

/**
 * Script to manually trigger cron jobs for development/staging
 * Usage: npx tsx scripts/trigger-cron.ts [job-name] [environment]
 * 
 * Examples:
 * npx tsx scripts/trigger-cron.ts balance-notifications staging
 * npx tsx scripts/trigger-cron.ts capture-payments production
 * npx tsx scripts/trigger-cron.ts all staging
 */

const CRON_JOBS = {
  'balance-notifications': '/api/cron/balance-notifications',
  'capture-payments': '/api/cron/capture-payments', 
  'pre-auth-payments': '/api/cron/pre-auth-payments'
} as const;

type CronJobName = keyof typeof CRON_JOBS | 'all';

async function triggerCronJob(jobName: CronJobName, environment: 'staging' | 'production' | 'local' = 'staging') {
  const baseUrls = {
    local: 'http://localhost:3000',
    staging: process.env.STAGING_URL || 'https://the-suite-git-develop-decodifi.vercel.app',
    production: process.env.PRODUCTION_URL || 'https://your-production-url.com'
  };

  const baseUrl = baseUrls[environment];
  // Use environment variable for local development
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    console.error('❌ CRON_SECRET environment variable is required');
    process.exit(1);
  }

  if (!baseUrl) {
    console.error(`❌ Base URL for ${environment} environment is not configured`);
    process.exit(1);
  }

  const jobsToRun = jobName === 'all' ? Object.keys(CRON_JOBS) as (keyof typeof CRON_JOBS)[] : [jobName as keyof typeof CRON_JOBS];

  console.log(`🚀 Triggering cron jobs on ${environment} environment: ${jobsToRun.join(', ')}`);

  for (const job of jobsToRun) {
    const endpoint = CRON_JOBS[job];
    const url = `${baseUrl}${endpoint}`;

    console.log(`\n⏰ Triggering: ${job}`);
    console.log(`🔗 URL: ${url}`);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${cronSecret}`,
          'Content-Type': 'application/json',
        },
      });

      // Check if the response is JSON
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const result = await response.json();

        if (response.ok) {
          console.log(`✅ ${job} completed successfully:`);
          console.log(`   📊 Processed: ${result.processed || 0}`);
          console.log(`   ⚠️ Errors: ${result.errors || 0}`);
          console.log(`   ⏱️ Duration: ${result.duration || 0}ms`);
          if (result.errorDetails) {
            console.log(`   🔍 Error details: ${result.errorDetails.slice(0, 3).join(', ')}${result.errorDetails.length > 3 ? '...' : ''}`);
          }
        } else {
          console.error(`❌ ${job} failed:`, result);
        }
      } else {
        // Handle non-JSON response
        const text = await response.text();
        if (response.ok) {
          console.log(`✅ ${job} completed with non-JSON response:`);
          console.log(`   Status: ${response.status} ${response.statusText}`);
          console.log(`   Response (first 100 chars): ${text.substring(0, 100)}...`);
        } else {
          console.error(`❌ ${job} failed with status ${response.status}:`);
          console.error(`   Response (first 100 chars): ${text.substring(0, 100)}...`);
        }
      }
    } catch (error) {
      console.error(`💥 Error triggering ${job}:`, error);
    }
  }

  console.log('\n🏁 Cron trigger script completed');
}

// Parse command line arguments
const args = process.argv.slice(2);
const jobName = (args[0] || 'all') as CronJobName;
const environment = (args[1] || 'staging') as 'staging' | 'production' | 'local';

// Validate job name
if (jobName !== 'all' && !CRON_JOBS[jobName as keyof typeof CRON_JOBS]) {
  console.error(`❌ Invalid job name: ${jobName}`);
  console.error(`Available jobs: ${Object.keys(CRON_JOBS).join(', ')}, all`);
  process.exit(1);
}

// Run the script
triggerCronJob(jobName, environment).catch(console.error);
