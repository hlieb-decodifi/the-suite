import { Typography } from '@/components/ui/typography';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';

export default function PrivacyPolicyNotFound() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Card>
        <CardHeader className="text-center pb-6">
          <div className="mx-auto w-16 h-16 bg-yellow-100 dark:bg-yellow-900/20 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="h-8 w-8 text-yellow-600 dark:text-yellow-500" />
          </div>
          <Typography variant="h1" className="font-bold">
            Document Not Found
          </Typography>
          <Typography variant="p" className="text-muted-foreground">
            The Privacy Policy document you're looking for could not be found.
          </Typography>
        </CardHeader>
        <CardContent className="text-center">
          <div className="space-y-4">
            <Typography variant="p" className="text-sm">
              This might be a temporary issue. Please try again later or contact
              support if the problem persists.
            </Typography>
            <Button asChild>
              <Link href="/">Return to Home</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
