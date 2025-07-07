import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

const emailTemplates = [
  {
    id: 'contact-inquiry-admin',
    name: 'Contact Inquiry (Admin)',
    description:
      'Notification sent to admin when someone submits a contact form',
    category: 'Contact',
  },
  {
    id: 'contact-inquiry-confirmation',
    name: 'Contact Inquiry (Confirmation)',
    description: 'Confirmation sent to user after submitting contact form',
    category: 'Contact',
  },
  {
    id: 'booking-confirmation-client',
    name: 'Booking Confirmation (Client)',
    description: 'Booking confirmation sent to client',
    category: 'Booking',
  },
  {
    id: 'booking-confirmation-professional',
    name: 'Booking Confirmation (Professional)',
    description: 'Booking notification sent to professional',
    category: 'Booking',
  },
  {
    id: 'booking-cancellation-client',
    name: 'Booking Cancellation (Client)',
    description: 'Cancellation notification sent to client',
    category: 'Booking',
  },
  {
    id: 'booking-cancellation-professional',
    name: 'Booking Cancellation (Professional)',
    description: 'Cancellation notification sent to professional',
    category: 'Booking',
  },
  {
    id: 'payment-confirmation-client',
    name: 'Payment Confirmation (Client)',
    description: 'Payment confirmation sent to client',
    category: 'Payment',
  },
  {
    id: 'payment-confirmation-professional',
    name: 'Payment Confirmation (Professional)',
    description: 'Payment notification sent to professional',
    category: 'Payment',
  },
  {
    id: 'balance-notification',
    name: 'Balance Notification',
    description: 'Notification for pending balance payment',
    category: 'Payment',
  },
  {
    id: 'refund-completion-client',
    name: 'Refund Completion (Client)',
    description: 'Refund processed notification sent to client',
    category: 'Refund',
  },
  {
    id: 'refund-completion-professional',
    name: 'Refund Completion (Professional)',
    description: 'Refund processed notification sent to professional',
    category: 'Refund',
  },
  {
    id: 'refund-decline-client',
    name: 'Refund Decline (Client)',
    description: 'Refund declined notification sent to client',
    category: 'Refund',
  },
  {
    id: 'refund-request-professional',
    name: 'Refund Request (Professional)',
    description: 'Refund request notification sent to professional',
    category: 'Refund',
  },
  {
    id: 'no-show-notification-client',
    name: 'No Show Notification (Client)',
    description: 'No show fee notification sent to client',
    category: 'Policy',
  },
  {
    id: 'no-show-notification-professional',
    name: 'No Show Notification (Professional)',
    description: 'No show notification sent to professional',
    category: 'Policy',
  },
  {
    id: 'cancellation-policy-charge-client',
    name: 'Cancellation Policy Charge (Client)',
    description: 'Late cancellation fee notification sent to client',
    category: 'Policy',
  },
  {
    id: 'cancellation-policy-charge-professional',
    name: 'Cancellation Policy Charge (Professional)',
    description: 'Late cancellation fee notification sent to professional',
    category: 'Policy',
  },
  {
    id: 'review-tip-notification',
    name: 'Review & Tip Notification',
    description: 'Post-appointment review and tip request',
    category: 'Engagement',
  },
];

const categories = [
  'Contact',
  'Booking',
  'Payment',
  'Refund',
  'Policy',
  'Engagement',
];

export default function EmailPreviewPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            Email Template Previews
          </h2>
          <p className="text-gray-600">
            Preview all email templates with standardized styling and consistent
            branding. Each template includes dummy data to showcase the complete
            email experience.
          </p>
        </div>

        {categories.map((category) => {
          const categoryTemplates = emailTemplates.filter(
            (template) => template.category === category,
          );

          return (
            <div key={category} className="mb-8">
              <h3 className="text-lg font-medium text-gray-900 mb-4 border-b pb-2">
                {category} Templates ({categoryTemplates.length})
              </h3>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {categoryTemplates.map((template) => (
                  <Card
                    key={template.id}
                    className="transition-all hover:shadow-md"
                  >
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">
                        {template.name}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {template.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex gap-2">
                        <Link
                          href={`/dev/email-preview/${template.id}`}
                          className="flex-1 text-center bg-amber-500 hover:bg-amber-600 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                        >
                          Preview HTML
                        </Link>
                        <Link
                          href={`/dev/email-preview/${template.id}?format=text`}
                          className="flex-1 text-center bg-gray-500 hover:bg-gray-600 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                        >
                          Preview Text
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Template Standards
        </h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Brand Colors</h4>
            <div className="space-y-1 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-[#dea85b]"></div>
                <span>Primary Gold: #dea85b</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-[#313131]"></div>
                <span>Text Dark: #313131</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-[#5d6c6f]"></div>
                <span>Text Muted: #5d6c6f</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-[#f5f5f5]"></div>
                <span>Background Light: #f5f5f5</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 mb-2">
              Standards Applied
            </h4>
            <ul className="space-y-1 text-sm text-gray-600">
              <li>✓ Consistent brand colors</li>
              <li>✓ Email-safe font stack</li>
              <li>✓ Mobile-responsive design</li>
              <li>✓ Accessible contrast ratios</li>
              <li>✓ Standardized components</li>
              <li>✓ Professional styling</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
