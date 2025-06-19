'use client';

import { ContactForm } from '@/components/forms/ContactForm';
import { Typography } from '@/components/ui/typography';

type ContactTemplateProps = {
  userData?: {
    name?: string;
    email?: string;
    phone?: string;
  } | null;
};

export function ContactTemplate({ userData }: ContactTemplateProps) {
  return (
    <div className="min-h-screen w-full bg-background">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Typography
            variant="p"
            className="mb-4 font-caslon text-3xl italic text-primary"
          >
            We're here to help
          </Typography>

          <Typography
            variant="h1"
            className="mb-6 text-4xl font-bold font-futura md:text-5xl tracking-tight text-foreground"
          >
            Contact Us
          </Typography>

          <Typography
            variant="lead"
            className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed"
          >
            Need help with your account, have a question about our services, or
            want to provide feedback? We're here to help and would love to hear
            from you.
          </Typography>
        </div>

        {/* Contact Form */}
        <div className="flex justify-center mb-20">
          <ContactForm
            className="w-full max-w-2xl"
            {...(userData && { userData })}
          />
        </div>
      </div>
    </div>
  );
}
