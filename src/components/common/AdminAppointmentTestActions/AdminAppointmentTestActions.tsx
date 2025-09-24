'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import {
  makeAppointmentOngoingAction,
  makeAppointmentCompletedAction,
  makeAppointmentUpcomingAction,
} from '@/server/domains/appointments/admin-actions';
import { Settings, Clock, CheckCircle, Calendar } from 'lucide-react';

type AdminAppointmentTestActionsProps = {
  appointmentId: string;
  onUpdate?: () => void;
};

export function AdminAppointmentTestActions({
  appointmentId,
  onUpdate,
}: AdminAppointmentTestActionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hoursAgo, setHoursAgo] = useState('2');
  const [hoursFromNow, setHoursFromNow] = useState('24');
  const { toast } = useToast();

  const handleAction = async (
    action: () => Promise<{ success: boolean; error?: string }>,
  ) => {
    setIsLoading(true);
    try {
      const result = await action();

      if (result.success) {
        toast({
          title: 'Success',
          description: 'Appointment time updated successfully',
        });
        setIsOpen(false);
        onUpdate?.();
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error || 'Failed to update appointment',
        });
      }
    } catch (error) {
      console.error('Error updating appointment:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'An unexpected error occurred',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const makeOngoing = () => {
    handleAction(() => makeAppointmentOngoingAction(appointmentId));
  };

  const makeCompleted = () => {
    const hours = parseInt(hoursAgo) || 2;
    handleAction(() => makeAppointmentCompletedAction(appointmentId, hours));
  };

  const makeUpcoming = () => {
    const hours = parseInt(hoursFromNow) || 24;
    handleAction(() => makeAppointmentUpcomingAction(appointmentId, hours));
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0 hover:bg-muted"
          title="Test Actions"
        >
          <Settings className="h-3 w-3" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Test Appointment Status
          </DialogTitle>
          <DialogDescription>
            Change the appointment start/end times to simulate different states
            for testing purposes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-3">
            <Button
              onClick={makeOngoing}
              disabled={isLoading}
              className="w-full justify-start"
              variant="outline"
            >
              <Clock className="mr-2 h-4 w-4" />
              Make Ongoing
              <span className="ml-auto text-xs text-muted-foreground">
                (Started 10 min ago)
              </span>
            </Button>

            <div className="space-y-2">
              <Button
                onClick={makeCompleted}
                disabled={isLoading}
                className="w-full justify-start"
                variant="outline"
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Make Completed
                <span className="ml-auto text-xs text-muted-foreground">
                  ({hoursAgo}h ago)
                </span>
              </Button>
              <div className="flex items-center space-x-2 pl-6">
                <Label htmlFor="hoursAgo" className="text-xs">
                  Hours ago:
                </Label>
                <Input
                  id="hoursAgo"
                  type="number"
                  value={hoursAgo}
                  onChange={(e) => setHoursAgo(e.target.value)}
                  className="h-7 w-16 text-xs"
                  min="1"
                  max="168"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Button
                onClick={makeUpcoming}
                disabled={isLoading}
                className="w-full justify-start"
                variant="outline"
              >
                <Calendar className="mr-2 h-4 w-4" />
                Make Upcoming
                <span className="ml-auto text-xs text-muted-foreground">
                  ({hoursFromNow}h from now)
                </span>
              </Button>
              <div className="flex items-center space-x-2 pl-6">
                <Label htmlFor="hoursFromNow" className="text-xs">
                  Hours from now:
                </Label>
                <Input
                  id="hoursFromNow"
                  type="number"
                  value={hoursFromNow}
                  onChange={(e) => setHoursFromNow(e.target.value)}
                  className="h-7 w-16 text-xs"
                  min="1"
                  max="8760"
                />
              </div>
            </div>
          </div>

          <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
            <strong>Note:</strong> This will modify the appointment's start_time
            and end_time in the database. The status is computed dynamically
            based on these times relative to the current time.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
