'use server';

import { 
  EmailRecipient,
  BookingCancellationClientParams,
  BookingCancellationProfessionalParams,
  BookingConfirmationClientParams,
  sendBookingCancellationClient,
  sendBookingCancellationProfessional,
  sendBookingConfirmationClient,
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

    const baseParams = {
      booking_id: 'b-123xyz',
      date: 'August 15, 2024',
      time: '2:30 PM',
      appointment_id: 'appt-123',
      appointment_details_url: 'https://example.com/bookings',
      website_url: 'https://example.com',
      support_email: 'support@example.com',
      cancellation_reason: 'Unexpected scheduling conflict',
      payment: {
        method: {
          name: 'Credit Card',
          is_online: true,
        },
      },
      refund_info: {
        original_amount: 110.00,
        refund_amount: 110.00,
        status: 'Processed',
      },
      services: [
        { name: 'Haircut & Style', price: 85 },
        { name: 'Beard Trim', price: 25 },
      ],
    };

    switch (templateId) {
      case TEMPLATE_IDS.BOOKING_CANCELLATION_CLIENT: {
        const params: BookingCancellationClientParams = {
          ...baseParams,
          client_name: 'John Doe',
          professional_name: 'Alex Starr',
        };
        result = await sendBookingCancellationClient([recipient], params);
        break;
      }

      case TEMPLATE_IDS.BOOKING_CANCELLATION_PROFESSIONAL: {
        const params: BookingCancellationProfessionalParams = {
          ...baseParams,
          client_name: 'John Doe',
          client_phone: '+1 234 567 8900',
          professional_name: 'Alex Starr',
        };
        result = await sendBookingCancellationProfessional([recipient], params);
        break;
      }

      case TEMPLATE_IDS.BOOKING_CONFIRMATION_CLIENT: {
        // Example for cash payment with deposit
        const subtotal = 110.00;
        const serviceFee = 2.75;
        const depositAmount = subtotal * 0.2; // 20% deposit
        const tipAmount = 22.00;
        const total = subtotal + serviceFee + tipAmount;

        const params: BookingConfirmationClientParams = {
          ...baseParams,
          client_name: 'John Doe',
          professional_name: 'Alex Starr',
          subtotal,
          service_fee: serviceFee,
          tip_amount: tipAmount,
          total,
          payment_method: 'Cash',
          is_card_payment: false,
          deposit_amount: depositAmount, // 20% deposit paid by card
          balance_due: subtotal - depositAmount, // Remaining amount to be paid in cash
          balance_due_date: 'August 15, 2024',
          booking_id: 'b-123xyz',
          appointment_id: 'appt-123',
          date: 'August 15, 2024',
          time: '2:30 PM',
          appointment_details_url: 'https://example.com/bookings',
          website_url: 'https://example.com',
          support_email: 'support@example.com'
        };
        result = await sendBookingConfirmationClient([recipient], params);
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