import fs from 'fs';
import path from 'path';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { PreviewActions } from './components/PreviewActions';

// Template data generators
function getDummyDataForTemplate(templateId: string) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const logoUrl = `${baseUrl}/images/logo-large.svg`;

  const commonData = {
    logoUrl,
    websiteUrl: baseUrl,
    supportEmail: 'support@thesuite.com',
    currentYear: new Date().getFullYear().toString(),
  };

  switch (templateId) {
    case 'contact-inquiry-admin':
      return {
        ...commonData,
        inquiryId: 'INQ-2025-001',
        urgency: 'medium',
        urgencyColor: '#f59e0b',
        subject: 'Interested in booking a massage therapist',
        name: 'Sarah Johnson',
        email: 'sarah.johnson@example.com',
        phone: '+1 (555) 123-4567',
        message:
          "Hi! I'm looking to book a deep tissue massage for next week. I have some chronic back pain and would prefer someone experienced with therapeutic massage. Please let me know your availability and pricing. Thank you!",
        submittedAt: new Date().toLocaleString(),
        dashboardUrl: `${baseUrl}/dashboard/messages`,
        footerText:
          'This is an automated notification from The Suite contact form.',
      };

    case 'contact-inquiry-confirmation':
      return {
        ...commonData,
        name: 'Sarah Johnson',
        inquiryId: 'INQ-2025-001',
        adminEmail: 'support@thesuite.com',
        footerText:
          'Thank you for choosing The Suite. We appreciate your business!',
      };

    case 'booking-confirmation-client':
      return {
        ...commonData,
        clientName: 'Alex Thompson',
        professionalName: 'Maria Rodriguez',
        appointmentDate: 'February 15, 2025',
        appointmentTime: '2:00 PM',
        bookingId: 'BK-2025-456',
        professionalPhone: '+1 (555) 987-6543',
        professionalAddress: '123 Wellness St, City, State 12345',
        notes:
          'Please focus on shoulders and neck area. I work at a computer all day.',
        services: [
          { name: 'Swedish Massage', duration: 60, price: '120.00' },
          { name: 'Aromatherapy Add-on', duration: 15, price: '25.00' },
        ],
        subtotal: '145.00',
        serviceFee: '12.50',
        tipAmount: '25.00',
        totalPaid: '182.50',
        isUncaptured: false,
        appointmentDetailsUrl: `${baseUrl}/bookings/appt-789`,
        footerText:
          'Thank you for choosing The Suite. We appreciate your business!',
      };

    case 'booking-confirmation-professional':
      return {
        ...commonData,
        professionalName: 'Maria Rodriguez',
        clientName: 'Alex Thompson',
        appointmentDate: 'February 15, 2025',
        appointmentTime: '2:00 PM',
        bookingId: 'BK-2025-456',
        clientPhone: '+1 (555) 234-5678',
        clientAddress: '456 Client Ave, City, State 12345',
        notes:
          'Please focus on shoulders and neck area. I work at a computer all day.',
        services: [
          { name: 'Swedish Massage', duration: 60, price: '120.00' },
          { name: 'Aromatherapy Add-on', duration: 15, price: '25.00' },
        ],
        subtotal: '145.00',
        tipAmount: '25.00',
        professionalTotal: '127.50',
        isUncaptured: false,
        appointmentDetailsUrl: `${baseUrl}/bookings/appt-789`,
        dashboardUrl: `${baseUrl}/dashboard`,
        footerText: 'This email was sent by The Suite. You have a new booking!',
      };

    case 'payment-confirmation-client':
      return {
        ...commonData,
        clientName: 'Alex Thompson',
        professionalName: 'Maria Rodriguez',
        appointmentDate: 'February 15, 2025',
        appointmentTime: '2:00 PM',
        serviceName: 'Swedish Massage with Aromatherapy',
        totalAmount: '145.00',
        tipAmount: '25.00',
        capturedAmount: '170.00',
        bookingId: 'BK-2025-456',
        footerText:
          'Thank you for choosing The Suite. We appreciate your business!',
      };

    case 'payment-confirmation-professional':
      return {
        ...commonData,
        professionalName: 'Maria Rodriguez',
        clientName: 'Alex Thompson',
        appointmentDate: 'February 15, 2025',
        appointmentTime: '2:00 PM',
        serviceName: 'Swedish Massage with Aromatherapy',
        totalAmount: '145.00',
        tipAmount: '25.00',
        capturedAmount: '170.00',
        bookingId: 'BK-2025-456',
        dashboardUrl: `${baseUrl}/dashboard`,
        footerText:
          'This email was sent by The Suite. Payment has been received!',
      };

    case 'balance-notification':
      return {
        ...commonData,
        clientName: 'Alex Thompson',
        professionalName: 'Maria Rodriguez',
        appointmentDate: 'February 15, 2025',
        appointmentTime: '2:00 PM',
        totalAmount: '145.00',
        depositPaid: '50.00',
        balanceAmount: '95.00',
        currentTip: '0.00',
        totalDue: '95.00',
        balancePaymentUrl: `${baseUrl}/bookings/BK-2025-456/balance`,
        bookingId: 'BK-2025-456',
        footerText:
          'This email was sent by The Suite. Your appointment balance is ready.',
      };

    case 'refund-completion-client':
      return {
        ...commonData,
        clientName: 'Alex Thompson',
        professionalName: 'Maria Rodriguez',
        serviceName: 'Swedish Massage',
        originalAmount: '145.00',
        refundAmount: '120.00',
        professionalNotes:
          'Partial refund due to appointment being cut short. Thank you for your understanding.',
        footerText:
          'Thank you for using The Suite. We appreciate your understanding.',
      };

    case 'refund-completion-professional':
      return {
        ...commonData,
        professionalName: 'Maria Rodriguez',
        clientName: 'Alex Thompson',
        serviceName: 'Swedish Massage',
        originalAmount: '145.00',
        refundAmount: '120.00',
        transactionFee: '3.50',
        footerText:
          'This email was sent by The Suite regarding a refund transaction.',
      };

    case 'refund-decline-client':
      return {
        ...commonData,
        clientName: 'Alex Thompson',
        professionalName: 'Maria Rodriguez',
        serviceName: 'Swedish Massage',
        originalAmount: '145.00',
        declinedReason: 'Service was completed as requested',
        professionalNotes:
          'The full service was provided as booked. If you have concerns about the quality, please contact us to discuss.',
        contactUrl: `${baseUrl}/contact`,
        footerText:
          'This email was sent by The Suite regarding your refund request.',
      };

    case 'refund-request-professional':
      return {
        ...commonData,
        professionalName: 'Maria Rodriguez',
        clientName: 'Alex Thompson',
        serviceName: 'Swedish Massage',
        appointmentDate: 'February 15, 2025',
        appointmentTime: '2:00 PM',
        originalAmount: '145.00',
        reason: 'Service was not completed due to equipment malfunction',
        reviewUrl: `${baseUrl}/refunds/REF-2025-123`,
        footerText:
          'This email was sent by The Suite. Action required for refund request.',
      };

    case 'no-show-notification-client':
      return {
        ...commonData,
        clientName: 'Alex Thompson',
        professionalName: 'Maria Rodriguez',
        appointmentDate: 'February 15, 2025',
        appointmentTime: '2:00 PM',
        serviceName: 'Swedish Massage',
        chargeAmount: '50.00',
        paymentMethod: '****1234',
        contactUrl: `${baseUrl}/contact`,
        footerText:
          'This email was sent by The Suite regarding a missed appointment.',
      };

    case 'no-show-notification-professional':
      return {
        ...commonData,
        professionalName: 'Maria Rodriguez',
        clientName: 'Alex Thompson',
        appointmentDate: 'February 15, 2025',
        appointmentTime: '2:00 PM',
        serviceName: 'Swedish Massage',
        chargeAmount: '50.00',
        professionalAmount: '37.50',
        dashboardUrl: `${baseUrl}/dashboard`,
        footerText:
          'This email was sent by The Suite regarding a client no-show.',
      };

    case 'cancellation-policy-charge-client':
      return {
        ...commonData,
        clientName: 'Alex Thompson',
        professionalName: 'Maria Rodriguez',
        appointmentDate: 'February 15, 2025',
        appointmentTime: '2:00 PM',
        serviceName: 'Swedish Massage',
        chargeAmount: '72.50',
        paymentMethod: '****1234',
        cancellationTime: '2 hours before appointment',
        contactUrl: `${baseUrl}/contact`,
        footerText:
          'This email was sent by The Suite regarding your cancellation.',
      };

    case 'cancellation-policy-charge-professional':
      return {
        ...commonData,
        professionalName: 'Maria Rodriguez',
        clientName: 'Alex Thompson',
        appointmentDate: 'February 15, 2025',
        appointmentTime: '2:00 PM',
        serviceName: 'Swedish Massage',
        chargeAmount: '72.50',
        professionalAmount: '54.38',
        cancellationTime: '2 hours before appointment',
        dashboardUrl: `${baseUrl}/dashboard`,
        footerText:
          'This email was sent by The Suite regarding a cancellation fee.',
      };

    case 'booking-cancellation-client':
      return {
        ...commonData,
        clientName: 'Alex Thompson',
        professionalName: 'Maria Rodriguez',
        appointmentDate: 'February 15, 2025',
        appointmentTime: '2:00 PM',
        bookingId: 'BK-2025-456',
        cancellationReason:
          'Professional requested cancellation due to illness',
        services: [
          { name: 'Swedish Massage', price: 120.0 },
          { name: 'Aromatherapy Add-on', price: 25.0 },
        ],
        refundInfo: {
          originalAmount: 182.5,
          refundAmount: 182.5,
          status: 'Full refund processed',
        },
        appointmentDetailsUrl: `${baseUrl}/bookings/appt-789`,
        footerText:
          'This email was sent by The Suite regarding your booking cancellation.',
      };

    case 'booking-cancellation-professional':
      return {
        ...commonData,
        professionalName: 'Maria Rodriguez',
        clientName: 'Alex Thompson',
        clientPhone: '+1 (555) 234-5678',
        appointmentDate: 'February 15, 2025',
        appointmentTime: '2:00 PM',
        bookingId: 'BK-2025-456',
        cancellationReason:
          'Client requested cancellation due to schedule conflict',
        services: [
          { name: 'Swedish Massage', price: 120.0 },
          { name: 'Aromatherapy Add-on', price: 25.0 },
        ],
        refundInfo: {
          originalAmount: 182.5,
          refundAmount: 182.5,
          status: 'Full refund processed',
        },
        appointmentDetailsUrl: `${baseUrl}/bookings/appt-789`,
        footerText:
          'This email was sent by The Suite regarding a booking cancellation.',
      };

    case 'review-tip-notification':
      return {
        ...commonData,
        clientName: 'Alex Thompson',
        professionalName: 'Maria Rodriguez',
        appointmentDate: 'February 15, 2025',
        appointmentTime: '2:00 PM',
        paymentMethod: '****1234',
        totalAmount: '145.00',
        serviceAmount: '132.50',
        serviceFee: '12.50',
        bookingId: 'BK-2025-456',
        reviewTipUrl: `${baseUrl}/bookings/BK-2025-456/balance`,
        footerText:
          'Thank you for choosing The Suite. We appreciate your feedback!',
      };

    default:
      return null;
  }
}

function loadTemplate(templateName: string, type: 'hbs' | 'txt'): string {
  const templatesDir = path.join(process.cwd(), 'src/lib/email/templates');
  const templatePath = path.join(templatesDir, `${templateName}.${type}`);

  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template not found: ${templatePath}`);
  }

  return fs.readFileSync(templatePath, 'utf-8');
}

function compileTemplate(
  template: string,
  data: Record<string, unknown>,
): string {
  let result = template;

  // Replace variables
  for (const [key, value] of Object.entries(data)) {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    result = result.replace(regex, String(value || ''));
  }

  // Handle triple-brace content variable
  result = result.replace('{{{content}}}', String(data.content || ''));

  // Handle conditionals {{#if variable}}...{{/if}}
  result = result.replace(
    /{{#if\s+(\w+)}}([\s\S]*?){{\/if}}/g,
    (match, variable, content) => {
      return data[variable] ? content : '';
    },
  );

  // Handle each loops {{#each array}}...{{/each}}
  result = result.replace(
    /{{#each\s+(\w+)}}([\s\S]*?){{\/each}}/g,
    (match, variable, itemTemplate) => {
      const array = data[variable] as unknown[];
      if (!Array.isArray(array)) return '';

      return array
        .map((item) => {
          let itemResult = itemTemplate;
          if (typeof item === 'object' && item !== null) {
            for (const [key, value] of Object.entries(item)) {
              const itemRegex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
              itemResult = itemResult.replace(itemRegex, String(value || ''));
            }
          }
          return itemResult;
        })
        .join('');
    },
  );

  // Clean up any remaining handlebars expressions
  result = result.replace(/{{[^}]*}}/g, '');

  return result;
}

type Props = {
  params: Promise<{ templateId: string }>;
  searchParams: Promise<{ format?: string }>;
};

export default async function TemplatePreviewPage({
  params,
  searchParams,
}: Props) {
  const { templateId } = await params;
  const { format } = await searchParams;

  const dummyData = getDummyDataForTemplate(templateId);

  if (!dummyData) {
    notFound();
  }

  try {
    const templateType = format === 'text' ? 'txt' : 'hbs';
    const template = loadTemplate(templateId, templateType);
    const compiledTemplate = compileTemplate(template, dummyData);
    const isText = format === 'text';

    return (
      <div className="min-h-screen bg-gray-50">
        <div className="border-b bg-white px-4 py-3">
          <div className="mx-auto flex max-w-7xl items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dev/email-preview">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Templates
                </Button>
              </Link>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">
                  {templateId}
                </h1>
                <p className="text-sm text-gray-600">
                  {isText ? 'Text Version' : 'HTML Version'} with dummy data
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link href={`/dev/email-preview/${templateId}`}>
                <Button variant={!isText ? 'default' : 'outline'} size="sm">
                  HTML
                </Button>
              </Link>
              <Link href={`/dev/email-preview/${templateId}?format=text`}>
                <Button variant={isText ? 'default' : 'outline'} size="sm">
                  Text
                </Button>
              </Link>
              {!isText && (
                <PreviewActions compiledTemplate={compiledTemplate} />
              )}
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-7xl p-4">
          {isText ? (
            <div className="rounded-lg border bg-white p-6">
              <pre className="whitespace-pre-wrap font-mono text-sm text-gray-900">
                {compiledTemplate}
              </pre>
            </div>
          ) : (
            <div className="rounded-lg border bg-white p-6">
              <div
                className="email-preview"
                dangerouslySetInnerHTML={{ __html: compiledTemplate }}
              />
            </div>
          )}
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error loading template:', error);
    notFound();
  }
}
