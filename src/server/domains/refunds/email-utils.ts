import { createClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email';
import {
  createRefundRequestNotificationEmail,
  createRefundDeclineNotificationEmail,
  createRefundCompletionClientEmail,
  createRefundCompletionProfessionalEmail
} from '@/lib/email/templates';

/**
 * Send refund request notification to professional with fetched data
 */
export async function sendRefundRequestEmail(refundId: string): Promise<void> {
  const supabase = await createClient();

  // Get refund with related data
  const { data: refund } = await supabase
    .from('refunds')
    .select(`
      id,
      reason,
      original_amount,
      appointments!inner(
        id,
        start_time,
        bookings!inner(
          id,
          booking_services(
            services(
              name
            )
          )
        )
      ),
      clients:users!client_id(
        first_name,
        last_name
      ),
      professionals:users!professional_id(
        id,
        first_name,
        last_name
      )
    `)
    .eq('id', refundId)
    .single();

  if (!refund) return;

  // Get professional email
  const { data: professionalAuth } = await supabase.auth.admin.getUserById(refund.professionals.id);
  if (!professionalAuth.user?.email) return;

  // Format data
  const appointmentDate = new Date(refund.appointments.start_time).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const appointmentTime = new Date(refund.appointments.start_time).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  const reviewUrl = `${process.env.NEXT_PUBLIC_APP_URL}/refunds/${refundId}/review`;
  const serviceName = refund.appointments.bookings.booking_services[0]?.services?.name || 'Service';

  const email = createRefundRequestNotificationEmail(
    professionalAuth.user.email,
    refund.professionals.first_name,
    {
      refundId: refund.id,
      clientName: `${refund.clients.first_name} ${refund.clients.last_name}`,
      serviceName,
      appointmentDate,
      appointmentTime,
      originalAmount: refund.original_amount,
      reason: refund.reason,
      reviewUrl
    }
  );

  await sendEmail(email);
}

/**
 * Send refund decline notification to client with fetched data
 */
export async function sendRefundDeclineEmail(refundId: string): Promise<void> {
  const supabase = await createClient();

  // Get refund with related data
  const { data: refund } = await supabase
    .from('refunds')
    .select(`
      id,
      declined_reason,
      professional_notes,
      original_amount,
      appointments!inner(
        bookings!inner(
          booking_services(
            services(
              name
            )
          )
        )
      ),
      clients:users!client_id(
        id,
        first_name,
        last_name
      ),
      professionals:users!professional_id(
        first_name,
        last_name
      )
    `)
    .eq('id', refundId)
    .single();

  if (!refund) return;

  // Get client email
  const { data: clientAuth } = await supabase.auth.admin.getUserById(refund.clients.id);
  if (!clientAuth.user?.email) return;

  const serviceName = refund.appointments.bookings.booking_services[0]?.services?.name || 'Service';

  const email = createRefundDeclineNotificationEmail(
    clientAuth.user.email,
    refund.clients.first_name,
    {
      professionalName: `${refund.professionals.first_name} ${refund.professionals.last_name}`,
      serviceName,
      originalAmount: refund.original_amount,
      ...(refund.declined_reason && { declinedReason: refund.declined_reason }),
      ...(refund.professional_notes && { professionalNotes: refund.professional_notes })
    }
  );

  await sendEmail(email);
}

/**
 * Send refund completion notifications to both parties with fetched data
 */
export async function sendRefundCompletionEmails(refundId: string): Promise<void> {
  const supabase = await createClient();

  // Get refund with related data
  const { data: refund } = await supabase
    .from('refunds')
    .select(`
      id,
      refund_amount,
      transaction_fee,
      original_amount,
      professional_notes,
      appointments!inner(
        bookings!inner(
          booking_services(
            services(
              name
            )
          )
        )
      ),
      clients:users!client_id(
        id,
        first_name,
        last_name
      ),
      professionals:users!professional_id(
        id,
        first_name,
        last_name
      )
    `)
    .eq('id', refundId)
    .single();

  if (!refund) return;

  // Get both emails
  const [{ data: clientAuth }, { data: professionalAuth }] = await Promise.all([
    supabase.auth.admin.getUserById(refund.clients.id),
    supabase.auth.admin.getUserById(refund.professionals.id)
  ]);

  if (!clientAuth.user?.email || !professionalAuth.user?.email) return;

  const serviceName = refund.appointments.bookings.booking_services[0]?.services?.name || 'Service';
  const clientName = `${refund.clients.first_name} ${refund.clients.last_name}`;
  const professionalName = `${refund.professionals.first_name} ${refund.professionals.last_name}`;

  // Create both emails
  const clientEmail = createRefundCompletionClientEmail(
    clientAuth.user.email,
    refund.clients.first_name,
    {
      professionalName,
      serviceName,
      originalAmount: refund.original_amount,
      refundAmount: refund.refund_amount || 0,
      ...(refund.professional_notes && { professionalNotes: refund.professional_notes })
    }
  );

  const professionalEmail = createRefundCompletionProfessionalEmail(
    professionalAuth.user.email,
    refund.professionals.first_name,
    {
      clientName,
      serviceName,
      originalAmount: refund.original_amount,
      refundAmount: refund.refund_amount || 0,
      transactionFee: refund.transaction_fee
    }
  );

  // Send both emails
  await Promise.all([
    sendEmail(clientEmail),
    sendEmail(professionalEmail)
  ]);
} 