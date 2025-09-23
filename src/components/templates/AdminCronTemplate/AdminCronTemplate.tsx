import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AdminCronJobCard, type CronJob } from './AdminCronJobCard';

/**
 * List of available cron jobs in the system
 * This is a server component that defines the available cron jobs
 * The actual triggering is handled by the client component
 */
const CRON_JOBS: CronJob[] = [
  {
    name: 'Balance Notifications',
    endpoint: '/api/cron/balance-notifications',
    description:
      'Send balance notifications to clients after appointment completion',
    schedule: 'Every 30 minutes',
  },
  {
    name: 'Capture Payments',
    endpoint: '/api/cron/capture-payments',
    description: 'Capture pre-authorized payments for completed appointments',
    schedule: 'Every 4 hours',
  },
  {
    name: 'Pre-Auth Payments',
    endpoint: '/api/cron/pre-auth-payments',
    description: 'Pre-authorize payments for upcoming appointments',
    schedule: 'Daily at 9 AM and 9 PM',
  },
];

export function AdminCronTemplate() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Cron Job Management</h1>
        <p className="text-muted-foreground">
          Manually trigger cron jobs for testing and debugging
        </p>
      </div>

      <div className="grid gap-4">
        {CRON_JOBS.map((job) => (
          <AdminCronJobCard key={job.name} job={job} />
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>ℹ️ Important Notes</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p>• Cron jobs run automatically on production environments only</p>
          <p>• Use this panel for manual testing on staging/development</p>
          <p>
            • Ensure CRON_SECRET environment variable is properly configured
          </p>
          <p>• Monitor job execution results and handle errors appropriately</p>
        </CardContent>
      </Card>
    </div>
  );
}
