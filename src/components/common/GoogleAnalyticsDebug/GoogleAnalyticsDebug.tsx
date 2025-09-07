'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';

export function GoogleAnalyticsDebug() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [isChecking, setIsChecking] = useState(false);

  const checkConfiguration = async () => {
    setIsChecking(true);
    try {
      const response = await fetch(
        '/api/analytics/google?startDate=7daysAgo&endDate=today',
      );
      const result = await response.json();

      setDebugInfo({
        apiResponse: result,
        statusCode: response.status,
        envVarsSet: {
          GA_MEASUREMENT_ID: !!process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID,
        },
      });
    } catch (error) {
      setDebugInfo({
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
        statusCode: 'Network Error',
      });
    }
    setIsChecking(false);
  };

  const getStatusIcon = (success: boolean) => {
    return success ? (
      <CheckCircle className="w-5 h-5 text-green-500" />
    ) : (
      <XCircle className="w-5 h-5 text-red-500" />
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          Google Analytics Debug Info
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={checkConfiguration} disabled={isChecking}>
          {isChecking ? 'Checking...' : 'Test Configuration'}
        </Button>

        {debugInfo && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="flex items-center gap-2">
                {getStatusIcon(!!process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID)}
                <span>
                  Frontend GA ID:{' '}
                  {process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || 'Not set'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {getStatusIcon(debugInfo.statusCode === 200)}
                <span>API Status: {debugInfo.statusCode}</span>
              </div>
            </div>

            <div className="bg-gray-100 p-4 rounded-md">
              <h4 className="font-medium mb-2">API Response:</h4>
              <pre className="text-sm overflow-auto">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
