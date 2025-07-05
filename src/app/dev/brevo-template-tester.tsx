'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useEffect, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TEMPLATE_IDS } from '@/providers/brevo/constants';
import { sendTemplateTest } from './template-actions';

type TemplateResponse = {
  success: boolean;
  message: string;
};

const initialState: TemplateResponse = {
  success: false,
  message: '',
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      <Send className="mr-2 h-4 w-4" />
      {pending ? 'Sending...' : 'Send Test Email'}
    </Button>
  );
}

const TEMPLATE_EXAMPLES = {
  [TEMPLATE_IDS.BOOKING_CANCELLATION_CLIENT]: {
    name: 'Booking Cancellation - Client',
    description: 'Notification to client when a booking is cancelled',
    variables: [
      'Client: John Doe',
      'Professional: Alex Starr',
      'Date: August 15, 2024',
      'Time: 2:30 PM',
      'Booking ID: b-123xyz',
      'Payment Method: Credit Card',
      'Services: Haircut & Style ($85), Beard Trim ($25)',
      'Cancellation Reason: Schedule conflict',
      'Refund Amount: $110.00',
    ],
  },
  [TEMPLATE_IDS.BOOKING_CANCELLATION_PROFESSIONAL]: {
    name: 'Booking Cancellation - Professional',
    description: 'Notification to professional when a booking is cancelled',
    variables: [
      'Professional: Alex Starr',
      'Client: John Doe',
      'Client Phone: +1 234 567 8900',
      'Date: August 15, 2024',
      'Time: 2:30 PM',
      'Booking ID: b-123xyz',
      'Payment Method: Credit Card',
      'Services: Haircut & Style ($85), Beard Trim ($25)',
      'Cancellation Reason: Schedule conflict',
      'Refund Amount: $110.00',
    ],
  },
  [TEMPLATE_IDS.BOOKING_CONFIRMATION_CLIENT]: {
    name: 'Booking Confirmation - Client',
    description: 'Confirmation to client when a booking is made',
    variables: [
      'Client: John Doe',
      'Professional: Alex Starr',
      'Date: August 15, 2024',
      'Time: 2:30 PM',
      'Booking ID: b-123xyz',
      'Services: Haircut & Style ($85), Beard Trim ($25)',
      'Subtotal: $110.00',
      'Tip: $22.00',
      'Total: $132.00',
      'Payment Method: Credit Card',
      'Deposit: $25.00',
      'Balance Due: $107.00',
      'Balance Due Date: August 15, 2024',
    ],
  },
  [TEMPLATE_IDS.BOOKING_CONFIRMATION_PROFESSIONAL]: {
    name: 'Booking Confirmation - Professional',
    description: 'Notification to professional when a booking is made',
    variables: [
      'Professional: Alex Starr',
      'Client: John Doe',
      'Client Phone: +1 234 567 8900',
      'Date: August 15, 2024',
      'Time: 2:30 PM',
      'Booking ID: b-123xyz',
      'Services: Haircut & Style ($85), Beard Trim ($25)',
      'Subtotal: $110.00',
      'Tip: $22.00',
      'Professional Total: $132.00',
    ],
  },
  [TEMPLATE_IDS.PAYMENT_CONFIRMATION_CLIENT]: {
    name: 'Payment Confirmation - Client',
    description: 'Confirmation to client when a payment is processed',
    variables: [
      'Client: John Doe',
      'Professional: Alex Starr',
      'Payment Method: Credit Card',
      'Subtotal: $110.00',
      'Tip: $22.00',
      'Total: $132.00',
    ],
  },
  [TEMPLATE_IDS.PAYMENT_CONFIRMATION_PROFESSIONAL]: {
    name: 'Payment Confirmation - Professional',
    description: 'Notification to professional when a payment is processed',
    variables: [
      'Professional: Alex Starr',
      'Client: John Doe',
      'Payment Method: Credit Card',
      'Subtotal: $110.00',
      'Tip: $22.00',
      'Professional Total: $132.00',
    ],
  },
  [TEMPLATE_IDS.BALANCE_NOTIFICATION]: {
    name: 'Balance Notification',
    description: 'Notification about outstanding balance payment',
    variables: [
      'Professional: Alex Starr',
      'Total Amount: $110.00',
      'Deposit Paid: $25.00',
      'Balance Amount: $85.00',
      'Current Tip: $22.00',
      'Total Due: $107.00',
    ],
  },
  [TEMPLATE_IDS.REFUND_REQUEST_PROFESSIONAL]: {
    name: 'Refund Request - Professional',
    description: 'Notification to professional about refund request',
    variables: [
      'Professional: Alex Starr',
      'Client: John Doe',
      'Service: Haircut & Style',
      'Original Amount: $110.00',
      'Reason: Service not as described',
    ],
  },
  [TEMPLATE_IDS.REFUND_COMPLETION_CLIENT]: {
    name: 'Refund Completion - Client',
    description: 'Notification to client about approved refund',
    variables: [
      'Client: John Doe',
      'Professional: Alex Starr',
      'Original Amount: $110.00',
      'Refund Amount: $110.00',
      'Reason: Service not as described',
    ],
  },
  [TEMPLATE_IDS.REFUND_COMPLETION_PROFESSIONAL]: {
    name: 'Refund Completion - Professional',
    description: 'Notification to professional about processed refund',
    variables: [
      'Professional: Alex Starr',
      'Client: John Doe',
      'Original Amount: $110.00',
      'Refund Amount: $110.00',
      'Platform Fee: $2.75',
      'Net Refund: $107.25',
      'Reason: Service not as described',
    ],
  },
  [TEMPLATE_IDS.REFUND_DECLINE_CLIENT]: {
    name: 'Refund Decline - Client',
    description: 'Notification to client about declined refund',
    variables: [
      'Client: John Doe',
      'Professional: Alex Starr',
      'Original Amount: $110.00',
      'Decline Reason: Service was provided as described',
    ],
  },
  [TEMPLATE_IDS.REVIEW_TIP_NOTIFICATION]: {
    name: 'Review & Tip Notification',
    description: 'Request for review and optional tip',
    variables: [
      'Client: John Doe',
      'Professional: Alex Starr',
      'Payment Method: Credit Card',
      'Service Amount: $110.00',
      'Service Fee: $2.75',
      'Total Amount: $112.75',
    ],
  },
  [TEMPLATE_IDS.CONTACT_INQUIRY_ADMIN]: {
    name: 'Contact Inquiry - Admin',
    description: 'New contact form submission notification',
    variables: [
      'Name: John Doe',
      'Email: john@example.com',
      'Phone: +1 234 567 8900',
      'Subject: Service Question',
      'Message: I need help with booking',
      'Inquiry ID: inq-123xyz',
      'Submitted: August 15, 2024 2:30 PM',
      'Urgency: High',
    ],
  },
  [TEMPLATE_IDS.CONTACT_INQUIRY_CONFIRMATION]: {
    name: 'Contact Inquiry - Confirmation',
    description: 'Confirmation of contact form submission',
    variables: [
      'Name: John Doe',
      'Email: john@example.com',
      'Subject: Service Question',
      'Message: I need help with booking',
      'Inquiry ID: inq-123xyz',
    ],
  },
  [TEMPLATE_IDS.CANCELLATION_POLICY_CHARGE_CLIENT]: {
    name: 'Cancellation Policy Charge - Client',
    description: 'Notification about cancellation fee charge',
    variables: [
      'Client: John Doe',
      'Professional: Alex Starr',
      'Charge Amount: $55.00',
      'Charge Percentage: 50%',
      'Service Amount: $110.00',
      'Time Description: Less than 24 hours before appointment',
    ],
  },
  [TEMPLATE_IDS.CANCELLATION_POLICY_CHARGE_PROFESSIONAL]: {
    name: 'Cancellation Policy Charge - Professional',
    description: 'Notification about applied cancellation fee',
    variables: [
      'Professional: Alex Starr',
      'Client: John Doe',
      'Charge Amount: $55.00',
      'Charge Percentage: 50%',
      'Service Amount: $110.00',
      'Time Description: Less than 24 hours before appointment',
    ],
  },
  [TEMPLATE_IDS.NO_SHOW_NOTIFICATION_CLIENT]: {
    name: 'No Show Notification - Client',
    description: 'Notification about no-show fee charge',
    variables: [
      'Client: John Doe',
      'Professional: Alex Starr',
      'No Show Fee: $55.00',
    ],
  },
  [TEMPLATE_IDS.NO_SHOW_NOTIFICATION_PROFESSIONAL]: {
    name: 'No Show Notification - Professional',
    description: 'Notification about client no-show',
    variables: [
      'Professional: Alex Starr',
      'Client: John Doe',
      'No Show Fee: $55.00',
    ],
  },
} as const;

export function BrevoTemplateTester() {
  const [state, formAction] = useFormState(sendTemplateTest, initialState);
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [email, setEmail] = useState('');
  const [templateId, setTemplateId] = useState<string>(
    TEMPLATE_IDS.BOOKING_CANCELLATION_CLIENT.toString(),
  );

  useEffect(() => {
    if (state.message) {
      toast({
        title: state.success ? 'Success' : 'Error',
        description: state.message,
        variant: state.success ? 'default' : 'destructive',
      });
      if (state.success) {
        formRef.current?.reset();
        setEmail('');
      }
    }
  }, [state, toast]);

  const selectedTemplate =
    TEMPLATE_EXAMPLES[parseInt(templateId) as keyof typeof TEMPLATE_EXAMPLES];

  return (
    <form action={formAction} ref={formRef} className="space-y-4">
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Template</label>
          <Select
            name="templateId"
            value={templateId}
            onValueChange={setTemplateId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a template" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(TEMPLATE_EXAMPLES).map(([id, template]) => (
                <SelectItem key={id} value={id}>
                  {template.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedTemplate && (
            <p className="text-xs text-gray-500">
              {selectedTemplate.description}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium text-gray-700">
            Recipient Email
          </label>
          <Input
            type="email"
            id="email"
            name="email"
            placeholder="Enter recipient email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
      </div>

      {selectedTemplate && (
        <div className="text-xs text-gray-500 space-y-1">
          <p>Template variables that will be used:</p>
          <ul className="list-disc pl-4 space-y-1">
            {selectedTemplate.variables.map((variable, index) => (
              <li key={index}>{variable}</li>
            ))}
          </ul>
        </div>
      )}

      <SubmitButton />
    </form>
  );
}
