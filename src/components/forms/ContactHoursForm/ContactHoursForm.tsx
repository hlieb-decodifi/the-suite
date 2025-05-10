/* eslint-disable max-lines-per-function */
import { useId, useMemo } from 'react';
import { Form } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Typography } from '@/components/ui/typography';
import { Controller } from 'react-hook-form';
import { FormSelect } from '@/components/forms/common';
import { Checkbox } from '@/components/ui/checkbox';
import { useContactHoursForm } from './useContactHoursForm';
import { TIME_OPTIONS } from './constants';
import { ContactHoursFormValues } from './schema';
import { FormMessage } from '@/components/ui/form';
import { WorkingHoursEntry } from '@/types/working_hours';
import { convertToLocal } from '@/utils';

export type ContactHoursFormProps = {
  onSubmitSuccess: (data: ContactHoursFormValues) => void;
  onCancel: () => void;
  defaultValues?: WorkingHoursEntry[] | null;
};

export function ContactHoursForm({
  onSubmitSuccess,
  onCancel,
  defaultValues,
}: ContactHoursFormProps) {
  // Convert UTC times to local time for the form display
  const localizedDefaultValues = useMemo(
    () =>
      defaultValues?.map((entry) => ({
        ...entry,
        startTime: entry.startTime ? convertToLocal(entry.startTime) : null,
        endTime: entry.endTime ? convertToLocal(entry.endTime) : null,
      })) ?? null,
    [defaultValues],
  );

  const formId = useId();
  const {
    form,
    fields,
    isPending,
    onSubmit: handleFormSubmit,
  } = useContactHoursForm({
    onSubmit: onSubmitSuccess,
    defaultValues: localizedDefaultValues ?? null,
  });
  const hoursErrors = form.formState.errors.hours;

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleFormSubmit)}
        className="space-y-6"
        noValidate
      >
        {/* Working Hours - Table Layout */}
        <div className="space-y-3">
          {/* Header Row - Adjust column spans */}
          <div className="grid grid-cols-7 gap-x-4 px-1 pb-2 border-b border-border">
            <Typography
              variant="small"
              className="col-span-1 font-medium text-muted-foreground"
            >
              Day
            </Typography>
            <Typography
              variant="small"
              className="col-span-1 text-center font-medium text-muted-foreground"
            >
              Status
            </Typography>
            <div className="col-span-1" />
            <Typography
              variant="small"
              className="col-span-2 font-medium text-muted-foreground"
            >
              Start Time
            </Typography>
            <Typography
              variant="small"
              className="col-span-2 font-medium text-muted-foreground"
            >
              End Time
            </Typography>
          </div>

          {/* Data Rows */}
          {fields.map((item, index) => {
            const dayName = item.day;
            const dayErrors = hoursErrors?.[index];
            const isEnabled = form.watch(`hours.${index}.enabled`);

            return (
              // Grid row for each day - items-center should handle vertical alignment
              <div
                key={item.id}
                className="grid grid-cols-7 gap-x-4 items-center min-h-[50px] relative"
              >
                {/* Day Name (Adjust col-span) */}
                <Typography variant="small" className="col-span-1 font-medium">
                  {dayName}
                </Typography>

                {/* Status Checkbox (Adjust col-span) */}
                <div className="col-span-1 flex justify-center">
                  <Controller
                    control={form.control}
                    name={`hours.${index}.enabled`}
                    render={({ field }) => (
                      <Checkbox
                        id={`${formId}-enabled-${index}`}
                        checked={field.value ?? false}
                        onCheckedChange={field.onChange}
                        aria-label={`${dayName} status`}
                      />
                    )}
                  />
                </div>

                <div className="col-span-1" />

                {/* Start Time Select (Adjust col-span) */}
                <div className="col-span-2 relative">
                  {/* ... Controller and FormSelect ... */}
                  <Controller
                    control={form.control}
                    name={`hours.${index}.startTime`}
                    render={({ field }) => (
                      <FormSelect
                        options={TIME_OPTIONS}
                        placeholder="-"
                        disabled={!isEnabled}
                        value={isEnabled ? (field.value ?? '') : ''}
                        onChange={(value) => field.onChange(value || null)}
                        aria-label={`${dayName} start time`}
                      />
                    )}
                  />
                  {dayErrors?.startTime?.message && (
                    <FormMessage className="absolute text-xs mt-1">
                      {dayErrors.startTime.message}
                    </FormMessage>
                  )}
                </div>

                {/* End Time Select (Adjust col-span) */}
                <div className="col-span-2 relative">
                  {/* ... Controller and FormSelect ... */}
                  <Controller
                    control={form.control}
                    name={`hours.${index}.endTime`}
                    render={({ field }) => (
                      <FormSelect
                        options={TIME_OPTIONS}
                        placeholder="-"
                        disabled={!isEnabled}
                        value={isEnabled ? (field.value ?? '') : ''}
                        onChange={(value) => field.onChange(value || null)}
                        aria-label={`${dayName} end time`}
                      />
                    )}
                  />
                  {dayErrors?.endTime?.message && (
                    <FormMessage className="absolute text-xs mt-1">
                      {dayErrors.endTime.message}
                    </FormMessage>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
