import { z } from 'zod';
import { DAYS_OF_WEEK, timeToMinutes } from './constants';

// Remove unused regex
// const phoneRegex = /^\+?[1-9]\d{1,14}$/;

const timeStringSchema = z
  .string()
  .regex(/^\d{2}:\d{2}$/, 'Invalid time format (HH:MM)')
  .nullable()
  .optional();

const DayHoursSchema = z
  .object({
    day: z.enum(DAYS_OF_WEEK),
    enabled: z.boolean().optional(),
    startTime: timeStringSchema,
    endTime: timeStringSchema,
  })
  .superRefine((data, ctx) => {
    if (data.enabled ?? false) {
      if (!data.startTime) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Start time required',
          path: ['startTime'],
        });
      }
      if (!data.endTime) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'End time required',
          path: ['endTime'],
        });
      }
      // Only compare times if both are valid strings
      const startMinutes = timeToMinutes(data.startTime);
      const endMinutes = timeToMinutes(data.endTime);

      if (
        startMinutes !== null &&
        endMinutes !== null &&
        endMinutes <= startMinutes
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'End time must be after start time',
          path: ['endTime'], // Attach error to endTime
        });
      }
    } else {
      // If not enabled, times should ideally be null/undefined
      // You could add refinements here to enforce that if needed,
      // but often easier to handle in form logic (resetting times when disabled)
    }
  });

export type DayHours = z.infer<typeof DayHoursSchema>;

export const contactHoursSchema = z.object({
  hours: z.array(DayHoursSchema).length(7, 'Must provide hours for all 7 days'),
});

export type ContactHoursFormValues = z.infer<typeof contactHoursSchema>;
