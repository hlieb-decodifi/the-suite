'use server';

import { 
  EmailRecipient,
  BookingCancellationParams,
  BookingConfirmationParams,
  PaymentConfirmationParams,
  sendBookingCancellation,
  sendBookingConfirmation,
  sendPaymentConfirmation
} from '@/providers/brevo';
import { TEMPLATE_IDS } from '@/providers/brevo/constants';

export type TemplateResponse = {
  success: boolean;
  message: string;
};

export async function sendTemplateTest(
  prevState: TemplateResponse,
  formData: FormData,
): Promise<TemplateResponse> {
  const recipientEmail = formData.get('email') as string;
  const templateId = parseInt(formData.get('templateId') as string);

  if (!recipientEmail) {
    return {
      success: false,
      message: 'Recipient email is required.',
    };
  }

  try {
    const recipient: EmailRecipient = { 
      email: recipientEmail, 
      name: recipientEmail.split('@')[0] || recipientEmail 
    };

    let result;

    switch (templateId) {
      case TEMPLATE_IDS.BOOKING_CANCELLATION: {
        const params: BookingCancellationParams = {
          professional_name: 'Alex Starr',
          link: 'https://example.com/booking/123',
          date: 'August 15, 2024',
          time: '2:30 PM',
          booking_id: 'b-123xyz',
          payment_method: 'Credit Card (Online)',
          services: [
            { name: 'Haircut & Style', price: '85.00' },
            { name: 'Beard Trim', price: '25.00' },
            { name: 'Hot Towel Shave', price: '45.00' },
          ],
          cancellation_reason: 'Unexpected scheduling conflict'
        };
        result = await sendBookingCancellation([recipient], params);
        break;
      }

      case TEMPLATE_IDS.BOOKING_CONFIRMATION: {
        const params: BookingConfirmationParams = {
          professional_name: 'Alex Starr',
          client_name: 'John Doe',
          date: 'August 15, 2024',
          time: '2:30 PM',
          booking_id: 'b-123xyz',
          services: [
            { name: 'Haircut & Style', price: '85.00', duration: '60' }
          ],
          total_amount: '85.00',
          deposit_amount: '25.00',
          balance_due: '60.00',
          appointment_link: 'https://example.com/booking/123'
        };
        result = await sendBookingConfirmation([recipient], params);
        break;
      }

      case TEMPLATE_IDS.PAYMENT_CONFIRMATION: {
        const params: PaymentConfirmationParams = {
          professional_name: 'Alex Starr',
          client_name: 'John Doe',
          date: 'August 15, 2024',
          time: '2:30 PM',
          booking_id: 'b-123xyz',
          amount: '85.00',
          payment_method: 'Credit Card',
          receipt_link: 'https://example.com/receipt/123'
        };
        result = await sendPaymentConfirmation([recipient], params);
        break;
      }

      default:
        return {
          success: false,
          message: 'Invalid template ID'
        };
    }

    if (!result.success) {
      throw new Error(result.error || 'Unknown error');
    }

    return {
      success: true,
      message: `Test email sent successfully to ${recipientEmail}!`
    };

  } catch (error) {
    console.error('Error sending template test email:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to send test email'
    };
  }
} 