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
              // Responsive row layout
              <div
                key={item.id}
                className="flex flex-col sm:grid sm:grid-cols-7 gap-3 sm:gap-x-4 py-4 sm:py-0 border-b sm:border-none last:border-none border-border relative"
              >
                {/* Header Group: Day & Status (Flex on mobile, Contents on desktop) */}
                <div className="flex items-center justify-start gap-3 w-full sm:contents">
                  <Typography 
                    variant="small" 
                    className="font-medium sm:col-span-1 text-base sm:text-sm"
                  >
                    {dayName}
                  </Typography>

                  <div className="sm:col-span-1 flex sm:justify-center">
                    <Controller
                      control={form.control}
                      name={`hours.${index}.enabled`}
                      render={({ field }) => (
                        <div className="flex items-center gap-2">
                          <span className="sm:hidden text-sm text-muted-foreground">
                            {field.value ? 'Open' : 'Closed'}
                          </span>
                          <Checkbox
                            id={`${formId}-enabled-${index}`}
                            checked={field.value ?? false}
                            onCheckedChange={field.onChange}
                            aria-label={`${dayName} status`}
                          />
                        </div>
                      )}
                    />
                  </div>
                </div>

                <div className="hidden sm:block col-span-1" />

                {/* Time Inputs Group (Grid on mobile, Contents on desktop) */}
                <div className="grid grid-cols-2 gap-3 w-full sm:contents">
                  {/* Start Time Select */}
                  <div className="sm:col-span-2 relative">
                    <Controller
                      control={form.control}
                      name={`hours.${index}.startTime`}
                      render={({ field }) => (
                        <FormSelect
                          options={TIME_OPTIONS}
                          placeholder="Start"
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

                  {/* End Time Select */}
                  <div className="sm:col-span-2 relative">
                    <Controller
                      control={form.control}
                      name={`hours.${index}.endTime`}
                      render={({ field }) => (
                        <FormSelect
                          options={TIME_OPTIONS}
                          placeholder="End"
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
              </div>
            );
          })}
        </div>
      </form>
    </Form>
  );
});

ContactHoursForm.displayName = 'ContactHoursForm';
