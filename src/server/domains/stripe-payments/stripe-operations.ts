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
    
    const paymentIntentData: Stripe.PaymentIntentCreateParams = {
      amount,
      currency: 'usd',
      customer: customerId,
      capture_method: 'manual', // This creates an uncaptured payment intent
      confirmation_method: 'automatic',
      // Professional receives service amount minus Stripe processing fees
      transfer_data: {
        amount: serviceAmount, // Only transfer the service amount (total - suite fee)
        destination: professionalStripeAccountId
      },
      // The remaining amount (suite fee) stays in the platform account
      on_behalf_of: professionalStripeAccountId, // Professional pays the processing fees
      metadata: {
        ...metadata,
        booking_id: metadata.booking_id || 'unknown',
        payment_type: 'deposit_scheduled'
      }
    };

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
  appointmentDate: Date,
  appointmentTime: string
): Promise<{ 
  success: boolean; 
  preAuthDate?: Date; 
  captureDate?: Date; 
  shouldPreAuthNow?: boolean;
  error?: string; 
}> {
  try {
    // Import the calculate payment schedule function
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    
    // Get total duration from booking services
    const { data: bookingServices, error: servicesError } = await supabase
      .from('booking_services')
      .select('duration')
      .eq('booking_id', bookingId);

    if (servicesError) {
      console.error('Error fetching booking services:', servicesError);
      return { success: false, error: servicesError.message };
    }

    // Calculate total duration in minutes
    const totalDurationMinutes = bookingServices?.reduce((sum, service) => sum + service.duration, 0) || 60;
    
    console.log(`[Payment Schedule] Booking ${bookingId}: Total duration ${totalDurationMinutes} minutes`);
    
    const { data, error } = await supabase
      .rpc('calculate_payment_schedule', {
        appointment_date: appointmentDate.toISOString().split('T')[0] || '',
        appointment_time: appointmentTime || '00:00:00',
        duration_minutes: totalDurationMinutes
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
    isServiceFeeOnly?: boolean;
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
      useUncapturedPayment = false,
      isServiceFeeOnly = false
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

    // For service fee only payments
    if (isServiceFeeOnly) {
      const serviceFeeResult = await createServiceFeePaymentIntent(
        customerResult.customerId,
        metadata
      );
      
      if (!serviceFeeResult.success) {
        throw new Error(serviceFeeResult.error || 'Failed to create service fee payment');
      }

      // Create checkout session for service fee
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
                name: 'Service Fee',
                description: `Processing fee for cash payment appointment`
              },
              unit_amount: await getServiceFeeFromConfig()
            },
            quantity: 1
          }
        ],
        success_url: `${baseUrl}/booking/success?session_id={CHECKOUT_SESSION_ID}&booking_id=${bookingId}`,
        cancel_url: `${baseUrl}/booking/cancel?booking_id=${bookingId}`,
        metadata: {
          ...metadata,
          payment_type: 'service_fee_only',
          booking_id: bookingId
        }
      });

      if (!session.url) {
        throw new Error('Failed to create checkout session URL');
      }

      return {
        success: true,
        checkoutUrl: session.url,
        sessionId: session.id
      };
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
      
      // Add custom text to explain the setup intent process and show the amount
      sessionConfig.custom_text = {
        submit: {
          message: `Save your payment method for your upcoming appointment. Total service cost: $${(amount / 100).toFixed(2)}. Payment will be authorized 6 days before your appointment and charged after service completion. No payment will be taken today.`
        }
      };
    } else {
      const chargeAmount = paymentType === 'deposit' ? (depositAmount ?? 0) : amount;
      
      if (chargeAmount <= 0) {
        throw new Error('Invalid charge amount');
      }

      const serviceFee = await getServiceFeeFromConfig();
      const serviceAmount = chargeAmount - serviceFee; // Professional gets this amount minus Stripe fees
      
      sessionConfig.mode = 'payment';
      sessionConfig.payment_method_types = ['card'];
      sessionConfig.line_items = [
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
      ];

      // Use direct charge to professional's account with correct fee structure
      sessionConfig.payment_intent_data = {
        // Professional receives service amount minus Stripe processing fees
        transfer_data: {
          amount: serviceAmount, // Only transfer the service amount (total - suite fee)
          destination: professionalStripeAccountId
        },
        metadata: sessionConfig.metadata || {},
        // The remaining amount (suite fee) stays in the platform account
        on_behalf_of: professionalStripeAccountId // Professional pays the processing fees
      };

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