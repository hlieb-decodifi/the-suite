import { createClient } from '@/lib/supabase/server';
import {
  sendRefundRequestProfessional,
  sendRefundDeclineClient,
  sendRefundCompletionClient,
  sendRefundCompletionProfessional
} from '@/providers/brevo/templates';

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

  await sendRefundRequestProfessional(
    [{ email: professionalAuth.user.email, name: refund.professionals.first_name }],
    {
      professional_name: refund.professionals.first_name,
      client_name: `${refund.clients.first_name} ${refund.clients.last_name}`,
      service_name: serviceName,
      original_amount: refund.original_amount,
      reason: refund.reason,
      review_url: reviewUrl,
      date: appointmentDate,
      time: appointmentTime,
      appointment_id: refund.appointments.id,
      appointment_details_url: reviewUrl,
      website_url: process.env.NEXT_PUBLIC_BASE_URL!,
      support_email: process.env.BREVO_ADMIN_EMAIL!
    }
  );
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

  await sendRefundDeclineClient(
    [{ email: clientAuth.user.email, name: refund.clients.first_name }],
    {
      client_name: refund.clients.first_name,
      professional_name: `${refund.professionals.first_name} ${refund.professionals.last_name}`,
      original_amount: refund.original_amount,
      decline_reason: refund.declined_reason || 'No reason provided',
      booking_id: refund.appointments.bookings.id,
      appointment_id: refund.appointments.id,
      date: appointmentDate,
      time: appointmentTime,
      appointment_details_url: `${process.env.NEXT_PUBLIC_BASE_URL}/bookings/${refund.appointments.id}`,
      website_url: process.env.NEXT_PUBLIC_BASE_URL!,
      support_email: process.env.BREVO_ADMIN_EMAIL!
    }
  );
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

  const clientName = `${refund.clients.first_name} ${refund.clients.last_name}`;
  const professionalName = `${refund.professionals.first_name} ${refund.professionals.last_name}`;
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

  // Send both emails
  await Promise.all([
    sendRefundCompletionClient(
      [{ email: clientAuth.user.email, name: refund.clients.first_name }],
      {
        client_name: refund.clients.first_name,
        professional_name: professionalName,
        original_amount: refund.original_amount,
        refund_amount: refund.refund_amount || 0,
        reason: refund.professional_notes || 'Refund processed',
        booking_id: refund.appointments.bookings.id,
        appointment_id: refund.appointments.id,
        date: appointmentDate,
        time: appointmentTime,
        appointment_details_url: `${process.env.NEXT_PUBLIC_BASE_URL}/bookings/${refund.appointments.id}`,
        website_url: process.env.NEXT_PUBLIC_BASE_URL!,
        support_email: process.env.BREVO_ADMIN_EMAIL!
      }
    ),
    sendRefundCompletionProfessional(
      [{ email: professionalAuth.user.email, name: refund.professionals.first_name }],
      {
        client_name: clientName,
        professional_name: refund.professionals.first_name,
        original_amount: refund.original_amount,
        refund_amount: refund.refund_amount || 0,
        platform_fee: refund.transaction_fee,
        net_refund: (refund.refund_amount || 0) - refund.transaction_fee,
        reason: refund.professional_notes || 'Refund processed',
        booking_id: refund.appointments.bookings.id,
        appointment_id: refund.appointments.id,
        date: appointmentDate,
        time: appointmentTime,
        appointment_details_url: `${process.env.NEXT_PUBLIC_BASE_URL}/bookings/${refund.appointments.id}`,
        website_url: process.env.NEXT_PUBLIC_BASE_URL!,
        support_email: process.env.BREVO_ADMIN_EMAIL!
      }
    )
  ]);
} 