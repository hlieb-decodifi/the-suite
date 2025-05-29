import { createClient as createAdminClient } from '@supabase/supabase-js';
import { Database } from '@/../supabase/types';
import type {
  ProfessionalProfileForPayment,
  PaymentCalculation,
  BookingPaymentWithStripe
} from './types';

// Create admin client for operations that need elevated permissions
function createSupabaseAdminClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL');
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseServiceKey) {
    throw new Error('Missing Supabase service role key');
  }

  return createAdminClient<Database>(supabaseUrl, supabaseServiceKey);
}

/**
 * Get professional profile data needed for payment processing
 */
export async function getProfessionalProfileForPayment(professionalProfileId: string): Promise<ProfessionalProfileForPayment | null> {
  const supabase = createSupabaseAdminClient();
  
  try {
    const { data, error } = await supabase
      .from('professional_profiles')
      .select(`
        id,
        user_id,
        requires_deposit,
        deposit_type,
        deposit_value,
        balance_payment_method,
        stripe_account_id,
        stripe_connect_status
      `)
      .eq('id', professionalProfileId)
      .single();

    if (error || !data) {
      console.error('Error fetching professional profile for payment:', error);
      return null;
    }

    return {
      id: data.id,
      user_id: data.user_id,
      requires_deposit: data.requires_deposit ?? false,
      deposit_type: (data.deposit_type as 'percentage' | 'fixed') ?? 'percentage',
      deposit_value: data.deposit_value,
      balance_payment_method: (data.balance_payment_method as 'card' | 'cash') ?? 'card',
      stripe_account_id: data.stripe_account_id,
      stripe_connect_status: data.stripe_connect_status as 'not_connected' | 'pending' | 'complete'
    };
  } catch (error) {
    console.error('Error in getProfessionalProfileForPayment:', error);
    return null;
  }
}

/**
 * Calculate payment amounts based on professional's deposit settings
 */
export function calculatePaymentAmounts(
  totalAmount: number,
  professionalProfile: ProfessionalProfileForPayment
): PaymentCalculation {
  const { requires_deposit, deposit_type, deposit_value, balance_payment_method } = professionalProfile;

  if (!requires_deposit || !deposit_value) {
    return {
      totalAmount,
      depositAmount: 0,
      balanceAmount: totalAmount,
      requiresDeposit: false,
      requiresBalancePayment: true,
      balancePaymentMethod: balance_payment_method,
      isFullPayment: true
    };
  }

  let depositAmount: number;
  
  if (deposit_type === 'percentage') {
    depositAmount = Math.round((totalAmount * deposit_value) / 100);
  } else {
    depositAmount = Math.round(deposit_value * 100); // Convert to cents
  }

  // If deposit is greater than or equal to total, charge full amount as deposit
  if (depositAmount >= totalAmount) {
    return {
      totalAmount,
      depositAmount: totalAmount,
      balanceAmount: 0,
      requiresDeposit: true,
      requiresBalancePayment: false,
      balancePaymentMethod: balance_payment_method,
      isFullPayment: true
    };
  }

  const balanceAmount = totalAmount - depositAmount;

  return {
    totalAmount,
    depositAmount,
    balanceAmount,
    requiresDeposit: true,
    requiresBalancePayment: balanceAmount > 0,
    balancePaymentMethod: balance_payment_method,
    isFullPayment: false
  };
}

/**
 * Create or update booking payment record with Stripe information
 */
export async function createBookingPaymentRecord(
  bookingId: string,
  paymentMethodId: string,
  paymentCalculation: PaymentCalculation,
  serviceFee: number,
  tipAmount: number = 0,
  stripeCheckoutSessionId?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createSupabaseAdminClient();
  
  try {
    const paymentData = {
      booking_id: bookingId,
      payment_method_id: paymentMethodId,
      amount: paymentCalculation.totalAmount / 100, // Convert back to dollars
      deposit_amount: paymentCalculation.depositAmount / 100,
      balance_amount: paymentCalculation.balanceAmount / 100,
      tip_amount: tipAmount,
      service_fee: serviceFee,
      payment_type: paymentCalculation.isFullPayment ? 'full' : 'deposit' as const,
      requires_balance_payment: paymentCalculation.requiresBalancePayment,
      balance_payment_method: paymentCalculation.balancePaymentMethod,
      status: stripeCheckoutSessionId ? 'pending' : 'completed',
      stripe_checkout_session_id: stripeCheckoutSessionId || null
    };

    const { error } = await supabase
      .from('booking_payments')
      .insert(paymentData);

    if (error) {
      console.error('Error creating booking payment record:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in createBookingPaymentRecord:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Update booking payment with Stripe checkout session ID
 */
export async function updateBookingPaymentWithSession(
  bookingId: string,
  sessionId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createSupabaseAdminClient();
  
  try {
    const { error } = await supabase
      .from('booking_payments')
      .update({
        stripe_checkout_session_id: sessionId,
        updated_at: new Date().toISOString()
      })
      .eq('booking_id', bookingId);

    if (error) {
      console.error('Error updating booking payment with session:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in updateBookingPaymentWithSession:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Get booking payment by checkout session ID
 */
export async function getBookingPaymentBySessionId(sessionId: string): Promise<BookingPaymentWithStripe | null> {
  const supabase = createSupabaseAdminClient();
  
  try {
    const { data, error } = await supabase
      .from('booking_payments')
      .select('*')
      .eq('stripe_checkout_session_id', sessionId)
      .single();

    if (error || !data) {
      console.error('Error fetching booking payment by session ID:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getBookingPaymentBySessionId:', error);
    return null;
  }
}

/**
 * Update booking payment status
 */
export async function updateBookingPaymentStatus(
  bookingId: string,
  status: string,
  stripePaymentIntentId?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createSupabaseAdminClient();
  
  try {
    const updateData: Record<string, string> = {
      status,
      updated_at: new Date().toISOString()
    };

    if (stripePaymentIntentId) {
      updateData.stripe_payment_intent_id = stripePaymentIntentId;
    }

    const { error } = await supabase
      .from('booking_payments')
      .update(updateData)
      .eq('booking_id', bookingId);

    if (error) {
      console.error('Error updating booking payment status:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in updateBookingPaymentStatus:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Update existing booking payment record with Stripe information
 */
export async function updateBookingPaymentForStripe(
  bookingId: string,
  paymentCalculation: PaymentCalculation,
  stripeCheckoutSessionId?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createSupabaseAdminClient();
  
  try {
    const updateData = {
      deposit_amount: paymentCalculation.depositAmount / 100, // Convert back to dollars
      balance_amount: paymentCalculation.balanceAmount / 100,
      payment_type: paymentCalculation.isFullPayment ? 'full' : 'deposit' as const,
      requires_balance_payment: paymentCalculation.requiresBalancePayment,
      balance_payment_method: paymentCalculation.balancePaymentMethod,
      status: stripeCheckoutSessionId ? 'pending' : 'completed',
      stripe_checkout_session_id: stripeCheckoutSessionId || null,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('booking_payments')
      .update(updateData)
      .eq('booking_id', bookingId);

    if (error) {
      console.error('Error updating booking payment for Stripe:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in updateBookingPaymentForStripe:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Delete a booking and all its related records (for cancelled checkouts)
 */
export async function deleteBookingAndRelatedRecords(
  bookingId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createSupabaseAdminClient();
  
  try {
    // Delete in reverse order of dependencies
    
    // 1. Delete booking payment
    const { error: paymentError } = await supabase
      .from('booking_payments')
      .delete()
      .eq('booking_id', bookingId);

    if (paymentError) {
      console.error('Error deleting booking payment:', paymentError);
      // Continue with other deletions even if this fails
    }

    // 2. Delete booking services
    const { error: servicesError } = await supabase
      .from('booking_services')
      .delete()
      .eq('booking_id', bookingId);

    if (servicesError) {
      console.error('Error deleting booking services:', servicesError);
      // Continue with other deletions even if this fails
    }

    // 3. Delete appointment
    const { error: appointmentError } = await supabase
      .from('appointments')
      .delete()
      .eq('booking_id', bookingId);

    if (appointmentError) {
      console.error('Error deleting appointment:', appointmentError);
      // Continue with booking deletion even if this fails
    }

    // 4. Finally, delete the booking itself
    const { error: bookingError } = await supabase
      .from('bookings')
      .delete()
      .eq('id', bookingId);

    if (bookingError) {
      console.error('Error deleting booking:', bookingError);
      return { success: false, error: bookingError.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in deleteBookingAndRelatedRecords:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Get or create a Stripe customer for a user
 */
export async function getOrCreateStripeCustomer(
  userId: string,
  userEmail?: string
): Promise<{ success: boolean; customerId?: string; error?: string }> {
  const supabase = createSupabaseAdminClient();
  
  try {
    // First, check if customer already exists in our database
    const { data: existingCustomer, error: fetchError } = await supabase
      .from('customers')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching existing customer:', fetchError);
      return { success: false, error: fetchError.message };
    }

    // If customer exists, return their Stripe customer ID
    if (existingCustomer?.stripe_customer_id) {
      return { 
        success: true, 
        customerId: existingCustomer.stripe_customer_id 
      };
    }

    // Customer doesn't exist, create new one in Stripe
    const { stripe } = await import('@/lib/stripe/server');
    
    const customerData: {
      metadata: { user_id: string };
      email?: string;
    } = {
      metadata: {
        user_id: userId
      }
    };

    // Add email if provided
    if (userEmail) {
      customerData.email = userEmail;
    }

    const stripeCustomer = await stripe.customers.create(customerData);

    // Save the customer to our database
    const { error: insertError } = await supabase
      .from('customers')
      .insert({
        user_id: userId,
        stripe_customer_id: stripeCustomer.id
      });

    if (insertError) {
      console.error('Error saving customer to database:', insertError);
      // Even if we can't save to DB, return the Stripe customer ID
      // This prevents blocking the payment flow
      return { 
        success: true, 
        customerId: stripeCustomer.id 
      };
    }

    return { 
      success: true, 
      customerId: stripeCustomer.id 
    };

  } catch (error) {
    console.error('Error in getOrCreateStripeCustomer:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Get Stripe customer ID for a user (if exists)
 */
export async function getStripeCustomerId(userId: string): Promise<string | null> {
  const supabase = createSupabaseAdminClient();
  
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return null;
    }

    return data.stripe_customer_id;
  } catch (error) {
    console.error('Error getting Stripe customer ID:', error);
    return null;
  }
}

/**
 * Save customer record from completed Stripe session
 * This is useful when a customer was created during checkout but we didn't save it to our DB
 */
export async function saveCustomerFromStripeSession(
  userId: string,
  stripeCustomerId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createSupabaseAdminClient();
  
  try {
    // Check if customer already exists
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (existingCustomer) {
      // Customer already exists, no need to create
      return { success: true };
    }

    // Insert new customer record
    const { error } = await supabase
      .from('customers')
      .insert({
        user_id: userId,
        stripe_customer_id: stripeCustomerId
      });

    if (error) {
      console.error('Error saving customer from Stripe session:', error);
      return { success: false, error: error.message };
    }

    return { success: true };

  } catch (error) {
    console.error('Error in saveCustomerFromStripeSession:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Update customer email in Stripe when user email changes
 */
export async function updateStripeCustomerEmail(
  userId: string,
  newEmail: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const customerId = await getStripeCustomerId(userId);
    
    if (!customerId) {
      // No customer exists yet, will be created with correct email on next checkout
      return { success: true };
    }

    const { stripe } = await import('@/lib/stripe/server');
    
    await stripe.customers.update(customerId, {
      email: newEmail
    });

    return { success: true };

  } catch (error) {
    console.error('Error updating Stripe customer email:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
} 