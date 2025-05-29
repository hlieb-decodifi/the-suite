import { stripe } from '@/lib/stripe/server';
import type Stripe from 'stripe';
import type {
  StripeCheckoutParams,
  StripeCheckoutResult
} from './types';

/**
 * Create a Stripe checkout session for booking payment
 */
export async function createStripeCheckoutSession(
  params: StripeCheckoutParams & { customerEmail?: string }
): Promise<StripeCheckoutResult> {
  try {
    const {
      bookingId,
      clientId,
      professionalStripeAccountId,
      amount,
      depositAmount,
      balanceAmount,
      paymentType,
      requiresBalancePayment,
      balancePaymentMethod,
      metadata,
      customerEmail
    } = params;

    if (!process.env.NEXT_PUBLIC_BASE_URL) {
      throw new Error('Missing base URL configuration');
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    
    // Get or create Stripe customer
    const { getOrCreateStripeCustomer } = await import('./db');
    const customerResult = await getOrCreateStripeCustomer(clientId, customerEmail);
    
    if (!customerResult.success || !customerResult.customerId) {
      console.error('Failed to get/create Stripe customer:', customerResult.error);
      // Fallback to creating customer in session if our function fails
    }
    
    // Determine the checkout session configuration based on payment type
    let sessionConfig: Stripe.Checkout.SessionCreateParams = {
      client_reference_id: clientId,
      success_url: `${baseUrl}/booking/success?session_id={CHECKOUT_SESSION_ID}&booking_id=${bookingId}`,
      cancel_url: `${baseUrl}/booking/cancel?booking_id=${bookingId}`,
      metadata: {
        ...metadata,
        booking_id: bookingId,
        payment_type: paymentType,
        requires_balance_payment: requiresBalancePayment.toString(),
        balance_payment_method: balancePaymentMethod
      }
    };

    // Use existing customer if available, otherwise create new one
    if (customerResult.success && customerResult.customerId) {
      sessionConfig.customer = customerResult.customerId;
    } else {
      sessionConfig.customer_creation = 'always';
      // Add customer email if provided and we're creating a new customer
      if (customerEmail) {
        sessionConfig.customer_email = customerEmail;
      }
    }

    if (paymentType === 'setup_only') {
      // Setup mode for storing payment method without charging
      sessionConfig = {
        ...sessionConfig,
        mode: 'setup',
        payment_method_types: ['card'],
        setup_intent_data: {
          metadata: sessionConfig.metadata || {},
          on_behalf_of: professionalStripeAccountId
        }
      };
    } else {
      // Payment mode for charging deposit or full amount
      const chargeAmount = paymentType === 'deposit' ? (depositAmount ?? 0) : amount;
      
      if (chargeAmount <= 0) {
        throw new Error('Invalid charge amount');
      }
      
      sessionConfig = {
        ...sessionConfig,
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: paymentType === 'deposit' ? 'Service Deposit' : 'Service Payment',
                description: paymentType === 'deposit' 
                  ? `Deposit for booking ${bookingId}${balanceAmount ? ` (Balance: $${(balanceAmount / 100).toFixed(2)} to be paid ${balancePaymentMethod === 'cash' ? 'in cash' : 'by card'})` : ''}`
                  : `Full payment for booking ${bookingId}`
              },
              unit_amount: chargeAmount
            },
            quantity: 1
          }
        ],
        payment_intent_data: {
          application_fee_amount: Math.round(chargeAmount * 0.029 + 30), // 2.9% + 30¢ platform fee
          transfer_data: {
            destination: professionalStripeAccountId
          },
          metadata: sessionConfig.metadata || {}
        }
      };

      // Add setup for future payments if balance payment is required and will be by card
      if (requiresBalancePayment && balancePaymentMethod === 'card') {
        sessionConfig.payment_intent_data!.setup_future_usage = 'off_session';
      }
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    if (!session.url) {
      throw new Error('Failed to create checkout session URL');
    }

    return {
      success: true,
      checkoutUrl: session.url,
      sessionId: session.id
    };

  } catch (error) {
    console.error('Error creating Stripe checkout session:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error creating checkout session'
    };
  }
}

/**
 * Create a payment intent for balance payment
 */
export async function createBalancePaymentIntent(
  bookingId: string,
  amount: number,
  userId: string,
  paymentMethodId: string,
  professionalStripeAccountId: string,
  metadata: Record<string, string> = {}
): Promise<{ success: boolean; paymentIntentId?: string; error?: string }> {
  try {
    // Get the customer ID for this user
    const { getStripeCustomerId } = await import('./db');
    const customerId = await getStripeCustomerId(userId);
    
    if (!customerId) {
      return {
        success: false,
        error: 'Customer not found. Please complete a checkout session first.'
      };
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      customer: customerId,
      payment_method: paymentMethodId,
      confirmation_method: 'automatic',
      confirm: true,
      off_session: true, // Indicates this is for a saved payment method
      application_fee_amount: Math.round(amount * 0.029 + 30), // 2.9% + 30¢ platform fee
      transfer_data: {
        destination: professionalStripeAccountId
      },
      metadata: {
        ...metadata,
        booking_id: bookingId,
        payment_type: 'balance'
      }
    });

    return {
      success: true,
      paymentIntentId: paymentIntent.id
    };

  } catch (error) {
    console.error('Error creating balance payment intent:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error creating payment intent'
    };
  }
}

/**
 * Retrieve checkout session details
 */
export async function getCheckoutSession(sessionId: string): Promise<{
  success: boolean;
  session?: Stripe.Checkout.Session;
  error?: string;
}> {
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent', 'setup_intent', 'customer']
    });

    return {
      success: true,
      session
    };

  } catch (error) {
    console.error('Error retrieving checkout session:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error retrieving session'
    };
  }
} 