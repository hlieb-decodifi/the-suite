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
        <div className="text-center mb-16">
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

        {/* Additional Contact Information */}
        <div className="text-center">
          <Typography
            variant="h3"
            className="mb-12 text-2xl font-semibold tracking-tight text-foreground"
          >
            Other Ways to Reach Us
          </Typography>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto mb-16">
            <div className="space-y-3 p-6 bg-card border border-border rounded-lg">
              <Typography
                variant="h4"
                className="text-xl font-semibold tracking-tight text-primary"
              >
                Email Support
              </Typography>
              <Typography
                variant="small"
                className="text-sm text-muted-foreground leading-relaxed"
              >
                Get help with your account or services
              </Typography>
              <Typography
                variant="p"
                className="font-medium text-foreground hover:underline"
              >
                <a href="mailto:support@thesuite.com">support@thesuite.com</a>
              </Typography>
            </div>

            <div className="space-y-3 p-6 bg-card border border-border rounded-lg">
              <Typography
                variant="h4"
                className="text-xl font-semibold tracking-tight text-primary"
              >
                Business Inquiries
              </Typography>
              <Typography
                variant="small"
                className="text-sm text-muted-foreground leading-relaxed"
              >
                Partnership and business opportunities
              </Typography>
              <Typography
                variant="p"
                className="font-medium text-foreground hover:underline"
              >
                <a href="mailto:business@thesuite.com">business@thesuite.com</a>
              </Typography>
            </div>

            <div className="space-y-3 p-6 bg-card border border-border rounded-lg">
              <Typography
                variant="h4"
                className="text-xl font-semibold tracking-tight text-primary"
              >
                Technical Issues
              </Typography>
              <Typography
                variant="small"
                className="text-sm text-muted-foreground leading-relaxed"
              >
                Report bugs or technical problems
              </Typography>
              <Typography
                variant="p"
                className="font-medium text-foreground hover:underline"
              >
                <a href="mailto:tech@thesuite.com">tech@thesuite.com</a>
              </Typography>
            </div>
          </div>

          {/* FAQ Link */}
          {/* <div className="pt-8 border-t border-border">
            <Typography
              variant="small"
              className="text-sm text-muted-foreground"
            >
              Looking for quick answers? Check out our{' '}
              <a
                href="/faq"
                className="text-primary font-medium hover:underline transition-colors"
              >
                Frequently Asked Questions
              </a>
            </Typography>
          </div> */}
        </div>
      </div>
    </div>
  );
}
