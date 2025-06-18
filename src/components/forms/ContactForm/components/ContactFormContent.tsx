'use client';

import { UseFormReturn } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form } from '@/components/ui/form';
import { FormFieldWrapper } from '@/components/forms/common/FormFieldWrapper';
import { FormInput } from '@/components/forms/common/FormInput';
import { FormTextarea } from '@/components/forms/common/FormTextarea';
import { FormSelect } from '@/components/forms/common/FormSelect';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Typography } from '@/components/ui/typography';
import { ContactFormData } from '../schema';
import { Loader2, Send, AlertCircle } from 'lucide-react';
import { PhoneInput } from 'react-international-phone';
import 'react-international-phone/style.css';

const subjectOptions = [
  { value: 'technical_support', label: 'Technical Support' },
  { value: 'billing_payment', label: 'Billing/Payment Issues' },
  { value: 'account_problems', label: 'Account Problems' },
  { value: 'professional_application', label: 'Professional Application' },
  { value: 'feature_request', label: 'Feature Request' },
  { value: 'bug_report', label: 'Bug Report' },
  { value: 'general_inquiry', label: 'General Inquiry' },
  { value: 'complaint_feedback', label: 'Complaint/Feedback' },
  { value: 'other', label: 'Other' },
];

type ContactFormContentProps = {
  form: UseFormReturn<ContactFormData>;
  isPending: boolean;
  submitError: string | null;
  onSubmit: (data: ContactFormData) => void;
  className?: string;
};

export function ContactFormContent({
  form,
  isPending,
  submitError,
  onSubmit,
  className,
}: ContactFormContentProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-2xl font-semibold tracking-tight text-foreground">
          Contact Us
        </CardTitle>
        <Typography
          variant="small"
          className="text-sm text-muted-foreground leading-relaxed"
        >
          Have a question or need help? We're here to assist you.
        </Typography>
      </CardHeader>
      <CardContent className="space-y-6">
        <Form {...form}>
          {/* Name and Email Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormFieldWrapper
              control={form.control}
              name="name"
              label="Full Name *"
            >
              {(field) => (
                <FormInput
                  placeholder="Enter your full name"
                  {...field}
                  value={field.value ?? ''}
                  className="h-11"
                />
              )}
            </FormFieldWrapper>

            <FormFieldWrapper
              control={form.control}
              name="email"
              label="Email Address *"
            >
              {(field) => (
                <FormInput
                  type="email"
                  placeholder="Enter your email address"
                  {...field}
                  value={field.value ?? ''}
                  className="h-11"
                />
              )}
            </FormFieldWrapper>
          </div>

          {/* Phone */}
          <FormFieldWrapper
            control={form.control}
            name="phone"
            label="Phone Number *"
          >
            {(field) => (
              <PhoneInput
                defaultCountry="us"
                value={field.value || ''}
                onChange={(value) => {
                  // Clear phone errors when user types
                  form.clearErrors('phone');
                  field.onChange(value);
                }}
                inputClassName={`flex h-11 w-full rounded-md border px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${
                  form.formState.errors.phone
                    ? 'border-destructive focus-visible:ring-destructive'
                    : 'border-input focus-visible:ring-ring'
                }`}
              />
            )}
          </FormFieldWrapper>

          {/* Subject - Full Width */}
          <FormFieldWrapper
            control={form.control}
            name="subject"
            label="Subject *"
          >
            {(field) => (
              <FormSelect
                placeholder="Select a topic"
                options={subjectOptions}
                {...field}
                value={field.value ?? ''}
              />
            )}
          </FormFieldWrapper>

          {/* Message */}
          <FormFieldWrapper
            control={form.control}
            name="message"
            label="Message *"
          >
            {(field) => (
              <FormTextarea
                placeholder="Please describe your question or issue in detail..."
                rows={6}
                {...field}
                value={field.value ?? ''}
                className="min-h-[120px] resize-none"
              />
            )}
          </FormFieldWrapper>

          {/* Server Error Display */}
          {submitError && (
            <Alert className="flex items-center" variant="destructive">
              <AlertCircle className="size-4" />
              <AlertDescription className="!translate-y-0 leading-tight mt-0.5 text-sm">
                {submitError}
              </AlertDescription>
            </Alert>
          )}

          {/* Submit Button */}
          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              disabled={isPending}
              onClick={form.handleSubmit(onSubmit)}
              className="px-8 bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Message
                </>
              )}
            </Button>
          </div>
        </Form>
      </CardContent>
    </Card>
  );
}
