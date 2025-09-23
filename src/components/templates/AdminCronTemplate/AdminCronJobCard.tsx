'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Play, Clock, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { triggerCronJob } from '@/api/cron/actions';

export type CronJob = {
  name: string;
  endpoint: string;
  description: string;
  schedule: string;
};

export type CronJobResult = {
  success?: boolean;
  message?: string;
  processed?: number;
  errors?: number;
  errorDetails?: string[];
  duration?: number;
  error?: string;
};

export function AdminCronJobCard({ job }: { job: CronJob }) {
  const [status, setStatus] = useState<
    'idle' | 'running' | 'success' | 'error'
  >('idle');
  const [result, setResult] = useState<CronJobResult | null>(null);
  const { toast } = useToast();

  const handleTriggerJob = async () => {
    setStatus('running');

    try {
      // Call the server action
      const result = await triggerCronJob(job.endpoint);

      if (result.success) {
        setStatus('success');
        setResult(result);

        toast({
          title: `${job.name} completed successfully`,
          description: `Processed: ${result.processed || 0}, Errors: ${result.errors || 0}`,
        });
      } else {
        setStatus('error');
        setResult(result);

        toast({
          title: `${job.name} failed`,
          description: result.message || 'Unknown error occurred',
          variant: 'destructive',
        });
      }
    } catch (error) {
      setStatus('error');
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      toast({
        title: `${job.name} failed`,
        description: 'Failed to trigger cron job',
        variant: 'destructive',
      });
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'running':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'running':
        return <Badge variant="secondary">Running</Badge>;
      case 'success':
        return (
          <Badge variant="default" className="bg-green-500">
            Success
          </Badge>
        );
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="outline">Idle</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <CardTitle className="text-lg">{job.name}</CardTitle>
            {getStatusBadge()}
          </div>
          <Button
            onClick={handleTriggerJob}
            disabled={status === 'running'}
            size="sm"
          >
            {status === 'running' ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <Play className="h-4 w-4 mr-1" />
            )}
            Trigger
          </Button>
        </div>
        <CardDescription>{job.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium">Schedule:</span> {job.schedule}
          </div>
          <div>
            <span className="font-medium">Endpoint:</span> {job.endpoint}
          </div>
        </div>

        {result && (
          <div className="mt-4 p-3 bg-muted rounded-md">
            <h4 className="font-medium mb-2">Last Execution Result:</h4>
            <div className="text-sm space-y-1">
              {result.processed !== undefined && (
                <div>
                  Processed:{' '}
                  <span className="font-mono">{result.processed}</span>
                </div>
              )}
              {result.errors !== undefined && (
                <div>
                  Errors: <span className="font-mono">{result.errors}</span>
                </div>
              )}
              {result.duration && (
                <div>
                  Duration:{' '}
                  <span className="font-mono">{result.duration}ms</span>
                </div>
              )}
              {result.errorDetails && result.errorDetails.length > 0 && (
                <div>
                  <div className="font-medium text-red-600">Error Details:</div>
                  <ul className="list-disc list-inside text-red-600">
                    {result.errorDetails.slice(0, 3).map((error, index) => (
                      <li key={index} className="font-mono text-xs">
                        {error}
                      </li>
                    ))}
                    {result.errorDetails.length > 3 && (
                      <li className="text-xs">
                        ... and {result.errorDetails.length - 3} more
                      </li>
                    )}
                  </ul>
                </div>
              )}
              {result.error && (
                <div className="text-red-600">
                  <span className="font-medium">Error:</span> {result.error}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
