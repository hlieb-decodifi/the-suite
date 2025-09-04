import { stripe } from '@/lib/stripe/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import type { Stripe } from 'stripe';
import type {
  StripeCheckoutParams,
  StripeCheckoutResult
} from './types';

function createSupabaseAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

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
        requires_balance_payment: requiresBalancePayment.toString()
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
                  ? `Appointment deposit${balanceAmount ? ` (Balance: $${(balanceAmount / 100).toFixed(2)} to be paid later)` : ''}`
                  : `Full payment for your booking`
              },
              unit_amount: chargeAmount
            },
            quantity: 1
          }
        ],
        payment_intent_data: {
          // Get service fee from config instead of calculating percentage
          transfer_data: {
            amount: chargeAmount - await getServiceFeeFromConfig(), // Only transfer the service amount (total - suite fee)
            destination: professionalStripeAccountId
          },
          // The remaining amount (suite fee) stays in the platform account
          on_behalf_of: professionalStripeAccountId, // Professional pays the processing fees
          metadata: sessionConfig.metadata || {}
        }
      };

      // Add setup for future payments if balance payment is required
      if (requiresBalancePayment) {
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

    const serviceFee = await getServiceFeeFromConfig();
    const serviceAmount = amount - serviceFee; // Professional gets this amount minus Stripe fees

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      customer: customerId,
      payment_method: paymentMethodId,
      confirmation_method: 'automatic',
      confirm: true,
      off_session: true, // Indicates this is for a saved payment method
      // Professional receives service amount minus Stripe processing fees
      transfer_data: {
        amount: serviceAmount, // Only transfer the service amount (total - suite fee)
        destination: professionalStripeAccountId
      },
      // The remaining amount (suite fee) stays in the platform account
      on_behalf_of: professionalStripeAccountId, // Professional pays the processing fees
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

/**
 * Create an uncaptured payment intent for manual capture later
 */
export async function createUncapturedPaymentIntent(
  amount: number,
  customerId: string,
  professionalStripeAccountId: string,
  metadata: Record<string, string> = {},
  paymentMethodId?: string
): Promise<{ success: boolean; paymentIntentId?: string; error?: string }> {
  try {
    const serviceFee = await getServiceFeeFromConfig();
    const serviceAmount = amount - serviceFee; // Professional gets this amount minus Stripe fees
    
    // Check if this is a cash payment where we're only charging the suite fee
    const isCashPaymentSuiteFeeOnly = metadata.payment_method_type === 'cash' && amount === serviceFee;
    
    const paymentIntentData: Stripe.PaymentIntentCreateParams = {
      amount,
      currency: 'usd',
      customer: customerId,
      capture_method: 'manual', // This creates an uncaptured payment intent
      confirmation_method: 'automatic',
      metadata: {
        ...metadata,
        booking_id: metadata.booking_id || 'unknown',
        payment_type: 'deposit_scheduled'
      }
    };

    // Only add transfer_data if there's actually an amount to transfer to professional
    if (!isCashPaymentSuiteFeeOnly && serviceAmount > 0) {
      paymentIntentData.transfer_data = {
        amount: serviceAmount, // Only transfer the service amount (total - suite fee)
        destination: professionalStripeAccountId
      };
      // The remaining amount (suite fee) stays in the platform account
      paymentIntentData.on_behalf_of = professionalStripeAccountId; // Professional pays the processing fees
    }
    // For cash payments suite fee only: no transfer_data, entire amount stays with platform

    // If payment method is provided, set it and confirm
    if (paymentMethodId) {
      paymentIntentData.payment_method = paymentMethodId;
      paymentIntentData.confirm = true;
      paymentIntentData.off_session = true;
    }

    const paymentIntent = await stripe.paymentIntents.create(paymentIntentData);

    return {
      success: true,
      paymentIntentId: paymentIntent.id
    };

  } catch (error) {
    console.error('Error creating uncaptured payment intent:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error creating payment intent'
    };
  }
}

/**
 * Schedule payment authorization based on appointment timing
 */
export async function schedulePaymentAuthorization(
  bookingId: string,
  appointmentStartTime: Date,
  appointmentEndTime: Date
): Promise<{ 
  success: boolean; 
  preAuthDate?: Date; 
  captureDate?: Date; 
  shouldPreAuthNow?: boolean;
  error?: string; 
}> {
  try {
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    
    console.log(`[Payment Schedule] Booking ${bookingId}: Calculating schedule for appointment ${appointmentStartTime.toISOString()} - ${appointmentEndTime.toISOString()}`);
    
    const { data, error } = await supabase
      .rpc('calculate_payment_schedule', {
        appointment_start_time: appointmentStartTime.toISOString(),
        appointment_end_time: appointmentEndTime.toISOString()
      })
      .single();

    if (error) {
      console.error('Error calculating payment schedule:', error);
      return { success: false, error: error.message };
    }

    console.log(`[Payment Schedule] Booking ${bookingId}: Pre-auth at ${data.pre_auth_date}, Capture at ${data.capture_date}`);

    return {
      success: true,
      preAuthDate: new Date(data.pre_auth_date),
      captureDate: new Date(data.capture_date),
      shouldPreAuthNow: data.should_pre_auth_now
    };

  } catch (error) {
    console.error('Error in schedulePaymentAuthorization:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Capture a previously authorized payment intent
 */
export async function capturePaymentIntent(
  paymentIntentId: string,
  amountToCapture?: number
): Promise<{ success: boolean; capturedAmount?: number; error?: string }> {
  try {
    const captureParams: Stripe.PaymentIntentCaptureParams = {};
    
    if (amountToCapture) {
      captureParams.amount_to_capture = amountToCapture;
    }

    const paymentIntent = await stripe.paymentIntents.capture(paymentIntentId, captureParams);

    return {
      success: true,
      capturedAmount: paymentIntent.amount_received
    };

  } catch (error) {
    console.error('Error capturing payment intent:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error capturing payment'
    };
  }
}

/**
 * Handle cancellation with partial capture from uncaptured payment intent
 * This captures only the fees we want to charge (service fee + cancellation fee if applicable)
 * The rest is automatically cancelled by Stripe
 */
export async function handleCancellationPartialCapture(
  paymentIntentId: string,
  options: {
    hasCancellationPolicy: boolean;
    cancellationFeeAmount: number; // in cents
    originalAmount: number; // in cents
  }
): Promise<{ 
  success: boolean; 
  capturedAmount?: number; 
  cancelledAmount?: number;
  serviceFeeAmount?: number;
  cancellationFeeAmount?: number;
  error?: string 
}> {
  try {
    const { hasCancellationPolicy, cancellationFeeAmount, originalAmount } = options;
    
    // Get service fee from config
    const serviceFee = await getServiceFeeFromConfig();
    
    // Calculate what we want to capture (charge)
    let amountToCapture: number;
    
    if (hasCancellationPolicy && cancellationFeeAmount > 0) {
      // Capture cancellation fee + service fee
      amountToCapture = cancellationFeeAmount + serviceFee;
    } else {
      // Only capture service fee
      amountToCapture = serviceFee;
    }
    
    // Ensure we don't capture more than the original amount
    amountToCapture = Math.min(amountToCapture, originalAmount);
    
    console.log(`[Cancellation] Partial capture - Original: $${originalAmount/100}, Capturing: $${amountToCapture/100}, Service fee: $${serviceFee/100}, Cancellation fee: $${(hasCancellationPolicy ? cancellationFeeAmount : 0)/100}`);
    console.log(`[Cancellation] Payment Intent ID: ${paymentIntentId}`);
    
    // First, retrieve the payment intent to verify it's in the correct state
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (paymentIntent.status !== 'requires_capture') {
      return {
        success: false,
        error: `Payment intent is in ${paymentIntent.status} status, cannot partially capture`
      };
    }
    
    if (amountToCapture <= 0) {
      // No fees to charge, just cancel the entire payment intent
      await stripe.paymentIntents.cancel(paymentIntentId);
      return {
        success: true,
        capturedAmount: 0,
        cancelledAmount: originalAmount,
        serviceFeeAmount: 0,
        cancellationFeeAmount: 0
      };
    }

    // NOTE: There's a Stripe limitation - we can't easily update transfer_data before partial capture
    // This causes the error "destination[amount] must be less than or equal to the charge amount"
    // The workaround is to cancel the payment intent and create separate charges, but that's complex
    // For now, we'll document this limitation and fall back to full cancellation
    
    console.log(`[Cancellation] About to capture $${amountToCapture/100} from original $${originalAmount/100}`);
    console.log(`[Cancellation] Note: Due to transfer_data limitations, partial capture may fail`);
    
    // Calculate expected distribution for logging
    const originalTransferAmount = paymentIntent.transfer_data?.amount || 0;
    const transferRatio = originalTransferAmount / originalAmount;
    const expectedProfessionalAmount = Math.round(amountToCapture * transferRatio);
    const expectedPlatformAmount = amountToCapture - expectedProfessionalAmount;
    
    console.log(`[Cancellation] Expected distribution - Professional: $${expectedProfessionalAmount/100}, Platform: $${expectedPlatformAmount/100}`);
    
    // Now perform the partial capture
    const captureResult = await stripe.paymentIntents.capture(paymentIntentId, {
      amount_to_capture: amountToCapture
    });
    
    const cancelledAmount = originalAmount - amountToCapture;
    
    console.log(`[Cancellation] Partial capture completed - Captured: $${captureResult.amount_received/100}, Cancelled: $${cancelledAmount/100}`);
    
    return {
      success: true,
      capturedAmount: captureResult.amount_received,
      cancelledAmount: cancelledAmount,
      serviceFeeAmount: serviceFee,
      cancellationFeeAmount: hasCancellationPolicy ? cancellationFeeAmount : 0
    };

  } catch (error) {
    console.error('Error handling cancellation partial capture:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during partial capture'
    };
  }
}

/**
 * Create a payment intent for service fee only (cash payments)
 */
export async function createServiceFeePaymentIntent(
  customerId: string,
  metadata: Record<string, string> = {}
): Promise<{ success: boolean; paymentIntentId?: string; checkoutUrl?: string; error?: string }> {
  try {
    const serviceFee = await getServiceFeeFromConfig();
    
    const paymentIntent = await stripe.paymentIntents.create({
      amount: serviceFee,
      currency: 'usd',
      customer: customerId,
      confirmation_method: 'automatic',
      metadata: {
        ...metadata,
        payment_type: 'service_fee_only'
      }
    });

    return {
      success: true,
      paymentIntentId: paymentIntent.id
    };

  } catch (error) {
    console.error('Error creating service fee payment intent:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error creating service fee payment'
    };
  }
}

/**
 * Get service fee from admin configuration
 */
export async function getServiceFeeFromConfig(): Promise<number> {
  try {
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    
    const { data } = await supabase
      .from('admin_configs')
      .select('value')
      .eq('key', 'service_fee_dollars')
      .single();
    
    const serviceFeeInDollars = parseFloat(data?.value || '1.0');
    return Math.round(serviceFeeInDollars * 100); // Convert to cents
  } catch (error) {
    console.error('Error getting service fee from config:', error);
    return 100; // Default to $1.00 in cents
  }
}

/**
 * Create a checkout session with enhanced payment options
 */
export async function createEnhancedCheckoutSession(
  params: StripeCheckoutParams & { 
    customerEmail?: string;
    useUncapturedPayment?: boolean;
  }
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
      metadata,
      customerEmail,
      useUncapturedPayment = false
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
      throw new Error('Failed to create customer account');
    }

    // For regular payments, use corrected fee structure
    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      client_reference_id: clientId,
      customer: customerResult.customerId,
      success_url: `${baseUrl}/booking/success?session_id={CHECKOUT_SESSION_ID}&booking_id=${bookingId}`,
      cancel_url: `${baseUrl}/booking/cancel?booking_id=${bookingId}`,
      metadata: {
        ...metadata,
        booking_id: bookingId,
        payment_type: paymentType,
        requires_balance_payment: requiresBalancePayment.toString(),
        use_uncaptured: useUncapturedPayment.toString()
      }
    };

    if (paymentType === 'setup_only') {
      sessionConfig.mode = 'setup';
      sessionConfig.payment_method_types = ['card'];
      sessionConfig.setup_intent_data = {
        metadata: sessionConfig.metadata || {},
        on_behalf_of: professionalStripeAccountId
      };
      
      // Get payment method type from metadata to customize message
      const isServiceFeeAndDepositOnly = metadata.is_service_fee_and_deposit_only === 'true';
      const isDepositFlow = metadata.payment_flow === 'setup_for_deposit_and_balance';
      const depositAmount = metadata.deposit_amount;
      const balanceAmount = metadata.balance_amount;
      
      let customMessage: string;
      
      if (isDepositFlow && depositAmount && balanceAmount) {
        // Deposit flow - different messages based on timing and payment method
        const depositAmountInDollars = (parseInt(depositAmount) / 100).toFixed(2);
        const balanceAmountInDollars = (parseInt(balanceAmount) / 100).toFixed(2);
        const appointmentTiming = metadata.appointment_timing;
        const paymentMethodType = metadata.payment_method_type;
        const isOnlinePayment = paymentMethodType === 'card';
        
        if (isOnlinePayment) {
          // Card payment with deposit
          if (appointmentTiming === 'more_than_6_days') {
            // Appointment > 6 days away with deposit (card)
            customMessage = `Save your payment method for your upcoming appointment. Deposit of $${depositAmountInDollars} will be charged immediately to secure your booking. The remaining balance of $${balanceAmountInDollars} will be authorized 6 days before your appointment and charged after service completion.`;
          } else {
            // Appointment ≤ 6 days away with deposit (card)
            customMessage = `Save your payment method for your upcoming appointment. Deposit of $${depositAmountInDollars} will be charged immediately to secure your booking. The remaining balance of $${balanceAmountInDollars} will be authorized now and charged after service completion.`;
          }
        } else {
          // Cash payment with deposit
          const serviceFeeInDollars = "1.00"; // $1 service fee
          // Calculate service amount (balance - service fee)
          const serviceAmountInDollars = (parseInt(balanceAmount) / 100 - 1).toFixed(2);
          
          if (appointmentTiming === 'more_than_6_days') {
            // Appointment > 6 days away with deposit (cash)
            customMessage = `Save your payment method for your upcoming appointment. Deposit of $${depositAmountInDollars} will be charged immediately to secure your booking. Service fee of $${serviceFeeInDollars} will be authorized 6 days before your appointment. The remaining balance of $${serviceAmountInDollars} will be paid in cash at the appointment.`;
          } else {
            // Appointment ≤ 6 days away with deposit (cash)
            customMessage = `Save your payment method for your upcoming appointment. Deposit of $${depositAmountInDollars} will be charged immediately to secure your booking. Service fee of $${serviceFeeInDollars} will be authorized now. The remaining balance of $${serviceAmountInDollars} will be paid in cash at the appointment.`;
          }
        }
      } else if (isServiceFeeAndDepositOnly) {
        // Cash payment - only service fee and deposit will be charged
        customMessage = `Save your payment method for your upcoming appointment. Service fee and deposit: $${(amount / 100).toFixed(2)} will be charged 6 days before your appointment. The remaining balance will be paid in cash at the appointment. No payment will be taken today.`;
      } else {
        // Regular setup intent - full amount will be charged
        customMessage = `Save your payment method for your upcoming appointment. Total service cost: $${(amount / 100).toFixed(2)}. Payment will be authorized 6 days before your appointment and charged after service completion. No payment will be taken today.`;
      }
      
      // Add custom text to explain the setup intent process and show the amount
      sessionConfig.custom_text = {
        submit: {
          message: customMessage
        }
      };
    } else {
      const chargeAmount = paymentType === 'deposit' ? (depositAmount ?? 0) : amount;
      
      if (chargeAmount <= 0) {
        throw new Error('Invalid charge amount');
      }

      const serviceFee = await getServiceFeeFromConfig();
      
      // For deposit payments, don't include service fee
      const serviceAmount = paymentType === 'deposit' 
        ? chargeAmount // Deposit amount is already calculated correctly
        : chargeAmount - serviceFee; // For full payments, subtract fee
      
      sessionConfig.mode = 'payment';
      sessionConfig.payment_method_types = ['card'];
      
      // Check if this is a service fee only payment (cash payment without deposit)
      const isServiceFeeOnly = metadata?.payment_flow === 'immediate_service_fee_only';
      const isCashPayment = metadata?.payment_method_type === 'cash';
      
      // Determine product description based on payment type and conditions
      let productDescription: string;
      if (paymentType === 'deposit') {
        productDescription = `Appointment deposit${balanceAmount ? ` (Balance: $${(balanceAmount / 100).toFixed(2)} to be paid later)` : ''}`;
      } else {
        if (isServiceFeeOnly || (isCashPayment && !metadata?.deposit_amount)) {
          productDescription = 'Service fee for your booking (remaining balance to be paid in cash)';
        } else {
          productDescription = 'Full payment for your booking';
        }
      }
      
      sessionConfig.line_items = [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: paymentType === 'deposit' ? 'Service Deposit' : (isServiceFeeOnly || (isCashPayment && !metadata?.deposit_amount) ? 'Service Fee' : 'Service Payment'),
              description: productDescription
            },
            unit_amount: chargeAmount
          },
          quantity: 1
        }
      ];

      // Only include transfer data if this is not a service fee only payment
      
      // Use direct charge to professional's account with correct fee structure
      sessionConfig.payment_intent_data = {
        metadata: sessionConfig.metadata || {},
      };

      // Add transfer data only if this is not a service fee only payment
      if (!isServiceFeeOnly && serviceAmount > 0) {
        sessionConfig.payment_intent_data.transfer_data = {
          amount: serviceAmount, // For deposits, transfer the full deposit. For full payments, subtract fee
          destination: professionalStripeAccountId
        };
        // The remaining amount (suite fee) stays in the platform account
        sessionConfig.payment_intent_data.on_behalf_of = professionalStripeAccountId; // Professional pays the processing fees
      }

      // Add uncaptured payment configuration
      if (useUncapturedPayment) {
        sessionConfig.payment_intent_data.capture_method = 'manual';
      }

      // Add setup for future payments if needed
      if (requiresBalancePayment) {
        sessionConfig.payment_intent_data.setup_future_usage = 'off_session';
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
    console.error('Error creating enhanced checkout session:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error creating checkout session'
    };
  }
}

export async function createPaymentIntent(options: {
  amount: number;
  stripeCustomerId: string;
  stripeAccountId: string;
  bookingId: string;
  capture: boolean;
}): Promise<Stripe.PaymentIntent | null> {
  const { amount, stripeCustomerId, stripeAccountId, bookingId, capture } =
    options;
  const amountInCents = Math.round(amount * 100);

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'usd',
      customer: stripeCustomerId,
      transfer_data: {
        destination: stripeAccountId,
      },
      capture_method: capture ? 'automatic' : 'manual',
      metadata: {
        booking_id: bookingId,
      },
    });
    return paymentIntent;
  } catch (error) {
    console.error('Error creating PaymentIntent:', error);
    return null;
  }
}

/**
 * Handle cancellation with dual payment approach - avoids transfer_data limitations
 * 1. Cancel the original uncaptured payment intent
 * 2. Create separate charge for service fee (to platform)
 * 3. Create separate charge for cancellation fee (to professional) if applicable
 */
export async function handleCancellationDualPayment(
  paymentIntentId: string,
  customerId: string,
  paymentMethodId: string | null,
  professionalStripeAccountId: string,
  options: {
    hasCancellationPolicy: boolean;
    cancellationFeeAmount: number; // in cents
    originalAmount: number; // in cents
  }
): Promise<{ 
  success: boolean; 
  serviceFeeCharge?: string;
  cancellationFeeCharge?: string;
  cancelledAmount?: number;
  serviceFeeAmount?: number;
  cancellationFeeAmount?: number;
  error?: string 
}> {
  try {
    const { hasCancellationPolicy, cancellationFeeAmount, originalAmount } = options;
    
    // Get service fee from config
    const serviceFee = await getServiceFeeFromConfig();
    
    console.log(`[Cancellation Dual] Starting dual payment cancellation`);
    console.log(`[Cancellation Dual] Original: $${originalAmount/100}, Service fee: $${serviceFee/100}, Cancellation fee: $${(hasCancellationPolicy ? cancellationFeeAmount : 0)/100}`);
    
    // If no payment method ID provided, try to get it from the payment intent
    let actualPaymentMethodId = paymentMethodId;
    if (!actualPaymentMethodId) {
      try {
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        if (paymentIntent.payment_method) {
          actualPaymentMethodId = typeof paymentIntent.payment_method === 'string' 
            ? paymentIntent.payment_method 
            : paymentIntent.payment_method.id;
          console.log(`[Cancellation Dual] Retrieved payment method from payment intent: ${actualPaymentMethodId}`);
        }
      } catch (error) {
        console.error('[Cancellation Dual] Failed to retrieve payment method from payment intent:', error);
      }
    }
    
    if (!actualPaymentMethodId) {
      return {
        success: false,
        error: 'No payment method available for charging fees'
      };
    }
    
    // Step 1: Cancel the original payment intent
    await stripe.paymentIntents.cancel(paymentIntentId);
    console.log(`[Cancellation Dual] Cancelled original payment intent: ${paymentIntentId}`);
    
    // Step 2: Create service fee charge (to platform)
    let serviceFeeChargeId: string | undefined;
    if (serviceFee > 0) {
      try {
        const serviceFeeCharge = await stripe.charges.create({
          amount: serviceFee,
          currency: 'usd',
          customer: customerId,
          source: actualPaymentMethodId,
          description: 'Service fee for cancelled appointment',
          metadata: {
            payment_intent_id: paymentIntentId,
            charge_type: 'service_fee',
            original_amount: originalAmount.toString()
          }
        });
        
        serviceFeeChargeId = serviceFeeCharge.id;
        console.log(`[Cancellation Dual] Service fee charged: $${serviceFee/100} (${serviceFeeChargeId})`);
      } catch (serviceFeeError) {
        console.error('[Cancellation Dual] Failed to charge service fee:', serviceFeeError);
        // Continue anyway - this is non-critical
      }
    }
    
    // Step 3: Create cancellation fee charge (to professional) if applicable
    let cancellationFeeChargeId: string | undefined;
    if (hasCancellationPolicy && cancellationFeeAmount > 0) {
      try {
        const cancellationFeeCharge = await stripe.charges.create({
          amount: cancellationFeeAmount,
          currency: 'usd',
          customer: customerId,
          source: actualPaymentMethodId,
          description: `Cancellation fee (${Math.round((cancellationFeeAmount / (originalAmount - serviceFee)) * 100)}% of service amount)`,
          destination: {
            account: professionalStripeAccountId,
            amount: cancellationFeeAmount // Professional gets full cancellation fee
          },
          metadata: {
            payment_intent_id: paymentIntentId,
            charge_type: 'cancellation_fee',
            original_amount: originalAmount.toString(),
            cancellation_percentage: Math.round((cancellationFeeAmount / (originalAmount - serviceFee)) * 100).toString()
          }
        });
        
        cancellationFeeChargeId = cancellationFeeCharge.id;
        console.log(`[Cancellation Dual] Cancellation fee charged: $${cancellationFeeAmount/100} to professional (${cancellationFeeChargeId})`);
      } catch (cancellationFeeError) {
        console.error('[Cancellation Dual] Failed to charge cancellation fee:', cancellationFeeError);
        // This is critical - if we can't charge the professional, we should fail
        return {
          success: false,
          error: `Failed to charge cancellation fee: ${cancellationFeeError instanceof Error ? cancellationFeeError.message : 'Unknown error'}`,
          ...(serviceFeeChargeId && { serviceFeeCharge: serviceFeeChargeId })
        };
      }
    }
    
    // Calculate what was cancelled (refunded to customer)
    const totalCharged = serviceFee + (hasCancellationPolicy ? cancellationFeeAmount : 0);
    const cancelledAmount = originalAmount - totalCharged;
    
    console.log(`[Cancellation Dual] Summary - Charged: $${totalCharged/100}, Refunded: $${cancelledAmount/100}`);
    
    return {
      success: true,
      ...(serviceFeeChargeId && { serviceFeeCharge: serviceFeeChargeId }),
      ...(cancellationFeeChargeId && { cancellationFeeCharge: cancellationFeeChargeId }),
      cancelledAmount: cancelledAmount,
      serviceFeeAmount: serviceFee,
      cancellationFeeAmount: hasCancellationPolicy ? cancellationFeeAmount : 0
    };

  } catch (error) {
    console.error('Error handling dual payment cancellation:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during dual payment cancellation'
    };
  }
}

/**
 * Create split payment checkout session for ≤6 days appointments
 * 1. User pays full amount (service fee + service amount) in one session  
 * 2. Webhook handles splitting: immediate service fee capture + uncaptured service amount
 */
export async function createSplitPaymentCheckoutSession(
  params: StripeCheckoutParams & { 
    customerEmail?: string;
    serviceAmount: number; // Service amount in cents (without service fee)
  }
): Promise<StripeCheckoutResult> {
  try {
    const {
      bookingId,
      clientId,
      professionalStripeAccountId,
      amount,
      metadata,
      customerEmail,
      serviceAmount
    } = params;

    if (!process.env.NEXT_PUBLIC_BASE_URL) {
      throw new Error('Missing base URL configuration');
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    
    // Get or create Stripe customer
    const { getOrCreateStripeCustomer } = await import('./db');
    const customerResult = await getOrCreateStripeCustomer(clientId, customerEmail);
    
    if (!customerResult.success || !customerResult.customerId) {
      throw new Error('Failed to create customer account');
    }

    const serviceFee = await getServiceFeeFromConfig();
    
    console.log(`[Split Payment] Creating split payment session - Total: $${amount/100}, Service fee: $${serviceFee/100}, Service amount: $${serviceAmount/100}`);

    // Single checkout session for full amount with special metadata for webhook processing
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      client_reference_id: clientId,
      customer: customerResult.customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Service Payment',
              description: 'Payment for appointment services'
            },
            unit_amount: amount
          },
          quantity: 1
        }
      ],
      payment_intent_data: {
        capture_method: 'manual', // Create as uncaptured from the start
        // No transfer_data initially - we'll handle transfers manually after partial captures
        metadata: {
          ...metadata,
          booking_id: bookingId,
          payment_type: 'split_payment',
          payment_flow: 'split_service_fee_and_amount',
          service_amount: serviceAmount.toString(),
          service_fee: serviceFee.toString(),
          professional_stripe_account_id: professionalStripeAccountId
        }
      },
      success_url: `${baseUrl}/booking/success?session_id={CHECKOUT_SESSION_ID}&booking_id=${bookingId}`,
      cancel_url: `${baseUrl}/booking/cancel?booking_id=${bookingId}`,
      metadata: {
        ...metadata,
        booking_id: bookingId,
        payment_type: 'split_payment',
        payment_flow: 'split_service_fee_and_amount',
        service_amount: serviceAmount.toString(),
        service_fee: serviceFee.toString(),
        professional_stripe_account_id: professionalStripeAccountId
      }
    });

    if (!session.url) {
      throw new Error('Failed to create split payment checkout session URL');
    }

    console.log(`[Split Payment] Created session: ${session.id} for split processing`);

    return {
      success: true,
      checkoutUrl: session.url,
      sessionId: session.id
    };

  } catch (error) {
    console.error('Error creating split payment checkout session:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error creating split payment session'
    };
  }
}

export async function createUncapturedPayment(
  bookingId: string,
  amount: number,
  paymentMethodId: string,
  customerId: string,
  appointmentStartTime: string,
  appointmentEndTime: string
): Promise<Stripe.PaymentIntent> {
  const adminSupabase = createSupabaseAdminClient();

  console.log('Creating uncaptured payment for booking:', bookingId);
  console.log('Appointment times:', { start: appointmentStartTime, end: appointmentEndTime });

  // Calculate payment schedule
  const { data: scheduleData, error: scheduleError } = await adminSupabase
    .rpc('calculate_payment_schedule', {
      appointment_start_time: appointmentStartTime,
      appointment_end_time: appointmentEndTime
    });

  if (scheduleError) {
    console.error('Error calculating payment schedule:', scheduleError);
    throw new Error('Failed to calculate payment schedule');
  }

  console.log('Payment schedule calculated:', scheduleData);

  if (!scheduleData || scheduleData.length === 0) {
    console.error('No schedule data returned from calculate_payment_schedule');
    throw new Error('No schedule data returned');
  }

  // Create payment intent with manual capture
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100),
    currency: 'usd',
    customer: customerId,
    payment_method: paymentMethodId,
    capture_method: 'manual',
    metadata: {
      booking_id: bookingId
    }
  });

  console.log('Created Stripe payment intent:', paymentIntent.id);

  // Update booking_payments with capture schedule
  const { error: updateError } = await adminSupabase
    .from('booking_payments')
    .update({
      capture_method: 'manual',
      capture_scheduled_for: scheduleData[0].capture_date,
      pre_auth_placed_at: new Date().toISOString(),
      authorization_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      stripe_payment_intent_id: paymentIntent.id,
      status: 'authorized'
    })
    .eq('booking_id', bookingId);

  if (updateError) {
    console.error('Error updating booking payment schedule:', updateError);
    throw new Error('Failed to update booking payment schedule');
  }

  console.log('Updated booking payment with schedule:', {
    bookingId,
    captureScheduledFor: scheduleData[0].capture_date,
    paymentIntentId: paymentIntent.id
  });

  return paymentIntent;
}

/**
 * Update an existing payment intent with new amount or metadata
 */
export async function updatePaymentIntent(
  paymentIntentId: string,
  updates: {
    amount?: number;
    metadata?: Record<string, string>;
  }
): Promise<Stripe.PaymentIntent> {
  try {
    console.log('[updatePaymentIntent] Updating payment intent:', {
      paymentIntentId,
      updates,
    });

    const updateParams: Stripe.PaymentIntentUpdateParams = {};
    
    if (updates.amount !== undefined) {
      updateParams.amount = updates.amount;
    }
    
    if (updates.metadata) {
      updateParams.metadata = updates.metadata;
    }

    const updatedPaymentIntent = await stripe.paymentIntents.update(
      paymentIntentId,
      updateParams
    );

    console.log('[updatePaymentIntent] Successfully updated payment intent:', {
      id: updatedPaymentIntent.id,
      amount: updatedPaymentIntent.amount,
      status: updatedPaymentIntent.status,
    });

    return updatedPaymentIntent;
  } catch (error) {
    console.error('[updatePaymentIntent] Error updating payment intent:', error);
    throw error;
  }
}

// Update the existing payment creation function to use createUncapturedPayment
export async function createPaymentForBooking(
  bookingId: string,
  amount: number,
  paymentMethodId: string,
  customerId: string,
  appointmentStartTime: string,
  appointmentEndTime: string
): Promise<Stripe.PaymentIntent> {
  const adminSupabase = createSupabaseAdminClient();

  console.log('Creating payment for booking:', bookingId);
  console.log('Appointment times:', { start: appointmentStartTime, end: appointmentEndTime });

  // Calculate if we need to use uncaptured payment
  const { data: scheduleData, error: scheduleError } = await adminSupabase
    .rpc('calculate_payment_schedule', {
      appointment_start_time: appointmentStartTime,
      appointment_end_time: appointmentEndTime
    });

  if (scheduleError) {
    console.error('Error calculating payment schedule:', scheduleError);
    throw new Error('Failed to calculate payment schedule');
  }

  console.log('Payment schedule calculated:', scheduleData);

  if (!scheduleData || scheduleData.length === 0) {
    console.error('No schedule data returned from calculate_payment_schedule');
    throw new Error('No schedule data returned');
  }

  // If should_pre_auth_now is true, use uncaptured payment
  if (scheduleData[0].should_pre_auth_now) {
    console.log('Appointment is within 6 days, creating uncaptured payment');
    return createUncapturedPayment(
      bookingId,
      amount,
      paymentMethodId,
      customerId,
      appointmentStartTime,
      appointmentEndTime
    );
  }

  console.log('Creating normal payment intent');
  // Otherwise, create normal payment intent
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100),
    currency: 'usd',
    customer: customerId,
    payment_method: paymentMethodId,
    metadata: {
      booking_id: bookingId
    }
  });

  // Update booking_payments with payment intent ID
  const { error: updateError } = await adminSupabase
    .from('booking_payments')
    .update({
      stripe_payment_intent_id: paymentIntent.id
    })
    .eq('booking_id', bookingId);

  if (updateError) {
    console.error('Error updating booking payment:', updateError);
    throw new Error('Failed to update booking payment');
  }

  return paymentIntent;
} 