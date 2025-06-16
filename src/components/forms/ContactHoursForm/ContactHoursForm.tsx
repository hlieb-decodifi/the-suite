import { useId, useMemo, forwardRef } from 'react';
import { Form } from '@/components/ui/form';
import { Typography } from '@/components/ui/typography';
import { Controller } from 'react-hook-form';
import { FormSelect } from '@/components/forms/common';
import { Checkbox } from '@/components/ui/checkbox';
import { useContactHoursForm } from './useContactHoursForm';
import { TIME_OPTIONS } from './constants';
import { ContactHoursFormValues } from './schema';
import { FormMessage } from '@/components/ui/form';
import { WorkingHoursEntry } from '@/types/working_hours';
// import { convertToLocal } from '@/utils';

export type ContactHoursFormProps = {
  onSubmitSuccess: (data: ContactHoursFormValues) => void;
  defaultValues?: WorkingHoursEntry[] | null;
};

export const ContactHoursForm = forwardRef<
  HTMLFormElement,
  ContactHoursFormProps
>(({ onSubmitSuccess, defaultValues }, ref) => {
  // Convert UTC times to local time for the form display
  const localizedDefaultValues = useMemo(
    () =>
      defaultValues?.map((entry) => ({
        ...entry,
        // startTime: entry.startTime ? convertToLocal(entry.startTime) : null,
        startTime: entry.startTime,
        // endTime: entry.endTime ? convertToLocal(entry.endTime) : null,
        endTime: entry.endTime,
      })) ?? null,
    [defaultValues],
  );

  const formId = useId();
  const {
    form,
    fields,
    onSubmit: handleFormSubmit,
  } = useContactHoursForm({
    onSubmit: onSubmitSuccess,
    defaultValues: localizedDefaultValues ?? null,
  });
  const hoursErrors = form.formState.errors.hours;

  return (
    <Form {...form}>
      <form ref={ref} onSubmit={form.handleSubmit(handleFormSubmit)} noValidate>
        {/* Working Hours - Table Layout */}
        <div className="space-y-2">
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
      </form>
    </Form>
  );
});

ContactHoursForm.displayName = 'ContactHoursForm';
