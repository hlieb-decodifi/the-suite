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
  [TEMPLATE_IDS.BOOKING_CANCELLATION]: {
    name: 'Booking Cancellation',
    description: 'Notification when a booking is cancelled',
    variables: [
      'Professional: Alex Starr',
      'Date: August 15, 2024',
      'Time: 2:30 PM',
      'Booking ID: b-123xyz',
      'Services: Haircut & Style ($85), Beard Trim ($25), Hot Towel Shave ($45)',
      'Cancellation Reason: Schedule conflict',
    ],
  },
  [TEMPLATE_IDS.BOOKING_CONFIRMATION]: {
    name: 'Booking Confirmation',
    description: 'Confirmation when a new booking is made',
    variables: [
      'Professional: Alex Starr',
      'Client: John Doe',
      'Date: August 15, 2024',
      'Time: 2:30 PM',
      'Services: Haircut & Style ($85)',
      'Total Amount: $85.00',
      'Deposit Amount: $25.00',
      'Balance Due: $60.00',
    ],
  },
  [TEMPLATE_IDS.PAYMENT_CONFIRMATION]: {
    name: 'Payment Confirmation',
    description: 'Confirmation when a payment is processed',
    variables: [
      'Professional: Alex Starr',
      'Client: John Doe',
      'Date: August 15, 2024',
      'Time: 2:30 PM',
      'Booking ID: b-123xyz',
      'Amount: $85.00',
      'Payment Method: Credit Card',
      'Receipt Link: https://example.com/receipt/123',
    ],
  },
} as const;

export function BrevoTemplateTester() {
  const [state, formAction] = useFormState(sendTemplateTest, initialState);
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [email, setEmail] = useState('');
  const [templateId, setTemplateId] = useState<string>(
    TEMPLATE_IDS.BOOKING_CANCELLATION.toString(),
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
