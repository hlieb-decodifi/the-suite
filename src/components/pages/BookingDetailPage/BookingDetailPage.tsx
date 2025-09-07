'use server';

import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { BookingDetailPageClient } from './BookingDetailPageClient';

// Type for detailed appointment data
export type DetailedAppointmentType = {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  computed_status: string;
  created_at: string;
  updated_at: string;
  booking_id: string;
  bookings: {
    id: string;
    client_id: string;
    professional_profile_id: string;
    booking_services: Array<{
      id: string;
      service_id: string;
      price: number;
      duration: number;
      services: {
        id: string;
        name: string;
        description: string | null;
      };
    }>;
    booking_payments: {
      id: string;
      amount: number;
      tip_amount: number;
      service_fee: number;
      status: string;
      payment_method_id: string;
      created_at: string;
      updated_at: string;
      refunded_amount: number;
      refunded_at: string | null;
      refund_reason?: string | null;
      stripe_payment_intent_id?: string | null;
      stripe_payment_method_id?: string | null;
      stripe_checkout_session_id?: string | null;
      deposit_amount: number;
      balance_amount: number;
      payment_type: 'full' | 'deposit' | 'balance';
      requires_balance_payment: boolean;
      capture_method: 'automatic' | 'manual';
      authorization_expires_at?: string | null;
      pre_auth_scheduled_for?: string | null;
      capture_scheduled_for?: string | null;
      captured_at?: string | null;
      pre_auth_placed_at?: string | null;
      balance_notification_sent_at?: string | null;
      refund_transaction_id?: string | null;
      payment_methods: {
        id: string;
        name: string;
        is_online: boolean;
      } | null;
    } | null;
    professionals: {
      id: string;
      user_id: string;
      profession: string | null;
      phone_number?: string | null;
      description?: string | null;
      location?: string | null;
      address?: {
        street_address: string | null;
        city: string | null;
        state: string | null;
        country: string | null;
        latitude?: number | null;
        longitude?: number | null;
      } | null;
      users: {
        id: string;
        first_name: string | null;
        last_name: string | null;
        avatar_url?: string | null;
      };
    } | null;
    clients: {
      id: string;
      first_name: string | null;
      last_name: string | null;
      avatar_url?: string | null;
      client_profiles: Array<{
        id: string;
        phone_number?: string | null;
        location?: string | null;
        address?: {
          street_address: string | null;
          city: string | null;
          state: string | null;
          country: string | null;
          latitude?: number | null;
          longitude?: number | null;
        } | null;
      }>;
    };
    notes?: string | null;
  };
};

export async function BookingDetailPage({
  id,
  showReviewPrompt = false,
}: {
  id: string;
  showReviewPrompt?: boolean;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }

  // Check if user is admin (via Supabase RPC)
  let isAdmin = false;
  try {
    const { data } = await supabase.rpc('is_admin', {
      user_uuid: user.id,
    });
    isAdmin = !!data;
  } catch {
    isAdmin = false;
  }

  const appointment = await getAppointmentById(id, isAdmin);

  const isProfessional =
    appointment.bookings.professionals?.user_id === user.id;
  const isClient = appointment.bookings.client_id === user.id;

  if (!isProfessional && !isClient && !isAdmin) {
    notFound();
  }

  // Fetch existing support request for this appointment
  const existingSupportRequest = await getExistingSupportRequest(id, isAdmin);

  // Fetch review status for this appointment
  const reviewStatus = await getReviewStatusForAppointment(
    appointment.booking_id,
    isAdmin,
  );

  return (
    <BookingDetailPageClient
      appointment={appointment}
      isProfessional={isProfessional}
      isClient={isClient}
      userId={user.id}
      isAdmin={isAdmin}
      existingSupportRequest={existingSupportRequest}
      reviewStatus={reviewStatus}
      showReviewPrompt={showReviewPrompt}
    />
  );
}

// Get appointment details by ID with enhanced data
export async function getAppointmentById(
  appointmentId: string,
  isAdmin: boolean = false,
): Promise<DetailedAppointmentType> {
  try {
    // Use admin client for admin users, else regular client
    const supabase = isAdmin
      ? (await import('@/lib/supabase/server')).createAdminClient()
      : await createClient();

    // Fetch the appointment with all related data
    const { data, error } = await supabase
      .from('appointments_with_status')
      .select(
        `
        id,
        start_time,
        end_time,
        status,
        computed_status,
        created_at,
        updated_at,
        booking_id,
        bookings!inner(
          id,
          client_id,
          professional_profile_id,
          notes,
          created_at,
          updated_at,
          booking_services(
            id,
            service_id,
            price,
            duration,
            services(
              id,
              name,
              description
            )
          ),
          booking_payments(
            id,
            amount,
            status,
            payment_method_id,
            created_at,
            updated_at,
            refunded_amount,
            refunded_at,
            refund_reason,
            tip_amount,
            service_fee,
            deposit_amount,
            balance_amount,
            payment_type,
            requires_balance_payment,
            capture_method,
            authorization_expires_at,
            pre_auth_scheduled_for,
            capture_scheduled_for,
            captured_at,
            pre_auth_placed_at,
            balance_notification_sent_at,
            refund_transaction_id,
            stripe_payment_intent_id,
            stripe_payment_method_id,
            stripe_checkout_session_id,
            payment_methods(
              id,
              name,
              is_online
            )
          ),
          professionals:professional_profiles!inner(
            id,
            user_id,
            profession,
            phone_number,
            description,
            location,
            address:address_id(
              street_address,
              city,
              state,
              country,
              latitude,
              longitude
            ),
            users(
              id,
              first_name,
              last_name,
              profile_photos:profile_photos(url)
            )
          ),
          clients:users!client_id(
            id,
            first_name,
            last_name,
            profile_photos:profile_photos(url),
            client_profiles(
              id,
              phone_number,
              location,
              address:address_id(
                street_address,
                city,
                state,
                country,
                latitude,
                longitude
              )
            )
          )
        )
      `,
      )
      .eq('id', appointmentId)
      .single();

    if (error) {
      console.error('Error fetching appointment:', error);
      notFound();
    }

    if (!data) {
      notFound();
    }

    // Transform the data to match the expected format
    const transformedData: DetailedAppointmentType = {
      id: data.id ?? '',
      start_time: data.start_time ?? '',
      end_time: data.end_time ?? '',
      status: data.status ?? '',
      computed_status: data.computed_status ?? '',
      created_at: data.created_at ?? '',
      updated_at: data.updated_at ?? '',
      booking_id: data.booking_id ?? '',
      bookings: {
        id: data.bookings.id,
        client_id: data.bookings.client_id,
        professional_profile_id: data.bookings.professional_profile_id,
        booking_services: data.bookings.booking_services,
        booking_payments: data.bookings.booking_payments
          ? {
              ...data.bookings.booking_payments,
              payment_type: data.bookings.booking_payments.payment_type as
                | 'full'
                | 'deposit'
                | 'balance',
              capture_method: data.bookings.booking_payments.capture_method as
                | 'automatic'
                | 'manual',
              refunded_at: data.bookings.booking_payments.refunded_at ?? null,
              refund_reason:
                data.bookings.booking_payments.refund_reason ?? null,
              stripe_payment_intent_id:
                data.bookings.booking_payments.stripe_payment_intent_id ?? null,
              stripe_payment_method_id:
                data.bookings.booking_payments.stripe_payment_method_id ?? null,
              stripe_checkout_session_id:
                data.bookings.booking_payments.stripe_checkout_session_id ??
                null,
              authorization_expires_at:
                data.bookings.booking_payments.authorization_expires_at ?? null,
              pre_auth_scheduled_for:
                data.bookings.booking_payments.pre_auth_scheduled_for ?? null,
              capture_scheduled_for:
                data.bookings.booking_payments.capture_scheduled_for ?? null,
              captured_at: data.bookings.booking_payments.captured_at ?? null,
              pre_auth_placed_at:
                data.bookings.booking_payments.pre_auth_placed_at ?? null,
              balance_notification_sent_at:
                data.bookings.booking_payments.balance_notification_sent_at ??
                null,
              refund_transaction_id:
                data.bookings.booking_payments.refund_transaction_id ?? null,
            }
          : null,
        professionals: data.bookings.professionals
          ? {
              ...data.bookings.professionals,
              profession: data.bookings.professionals.profession ?? null,
              phone_number: data.bookings.professionals.phone_number ?? null,
              description: data.bookings.professionals.description ?? null,
              location: data.bookings.professionals.location ?? null,
              address: data.bookings.professionals.address
                ? {
                    ...data.bookings.professionals.address,
                    street_address:
                      data.bookings.professionals.address.street_address ??
                      null,
                    city: data.bookings.professionals.address.city ?? null,
                    state: data.bookings.professionals.address.state ?? null,
                    country:
                      data.bookings.professionals.address.country ?? null,
                    latitude:
                      data.bookings.professionals.address.latitude ?? null,
                    longitude:
                      data.bookings.professionals.address.longitude ?? null,
                  }
                : null,
              users: {
                ...data.bookings.professionals.users,
                first_name:
                  data.bookings.professionals.users.first_name ?? null,
                last_name: data.bookings.professionals.users.last_name ?? null,
                avatar_url: Array.isArray(
                  data.bookings.professionals.users.profile_photos,
                )
                  ? (data.bookings.professionals.users.profile_photos[0]?.url ??
                    null)
                  : (data.bookings.professionals.users.profile_photos?.url ??
                    null),
              },
            }
          : null,
        clients: {
          ...data.bookings.clients,
          first_name: data.bookings.clients.first_name ?? null,
          last_name: data.bookings.clients.last_name ?? null,
          avatar_url: Array.isArray(data.bookings.clients.profile_photos)
            ? (data.bookings.clients.profile_photos[0]?.url ?? null)
            : (data.bookings.clients.profile_photos?.url ?? null),
          client_profiles: Array.isArray(data.bookings.clients.client_profiles)
            ? data.bookings.clients.client_profiles.map((profile) => ({
                ...profile,
                phone_number: profile.phone_number ?? null,
                location: profile.location ?? null,
                address: profile.address
                  ? {
                      ...profile.address,
                      street_address: profile.address.street_address ?? null,
                      city: profile.address.city ?? null,
                      state: profile.address.state ?? null,
                      country: profile.address.country ?? null,
                      latitude: profile.address.latitude ?? null,
                      longitude: profile.address.longitude ?? null,
                    }
                  : null,
              }))
            : [],
        },
        notes: data.bookings.notes ?? null,
      },
    };

    // console.log('Fetched appointment:', {
    //   id: transformedData.id,
    //   status: transformedData.status,
    //   computed_status: transformedData.computed_status,
    //   raw: data,
    // });

    return transformedData;
  } catch (error) {
    console.error('Error in getAppointmentById:', error);
    throw new Error('Failed to get appointment details');
  }
}

// Check if user has permission to view this appointment
function checkAppointmentPermission(
  appointment: DetailedAppointmentType,
  userId: string,
  isProfessional: boolean,
): boolean {
  if (isProfessional) {
    // Professional can only view their own appointments
    return (
      appointment.bookings.professionals?.user_id === userId ||
      appointment.bookings.professionals?.users.id === userId
    );
  } else {
    // Client can only view their own appointments
    return (
      appointment.bookings.client_id === userId ||
      appointment.bookings.clients?.id === userId
    );
  }
}

// Update appointment status
export async function updateAppointmentStatus(
  appointmentId: string,
  status: string,
  userId: string,
  isProfessional: boolean,
) {
  try {
    const supabase = await createClient();

    // First verify that the user has permission to update this appointment
    const appointment = await getAppointmentById(appointmentId);

    const hasPermission = checkAppointmentPermission(
      appointment,
      userId,
      isProfessional,
    );

    if (!hasPermission) {
      throw new Error('You do not have permission to update this appointment');
    }

    // Update the appointment status
    const { error: updateError } = await supabase
      .from('appointments')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', appointmentId);

    if (updateError) {
      throw new Error(`Failed to update appointment: ${updateError.message}`);
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating appointment status:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to update appointment status',
    };
  }
}

// Get existing support request for an appointment
async function getExistingSupportRequest(
  appointmentId: string,
  isAdmin: boolean = false,
): Promise<{
  id: string;
  status: string;
  category?: string;
} | null> {
  try {
    // Use admin client for admin users, else regular client
    const supabase = isAdmin
      ? (await import('@/lib/supabase/server')).createAdminClient()
      : await createClient();

    const { data: supportRequest, error } = await supabase
      .from('support_requests')
      .select('id, status, title, created_at, category')
      .eq('appointment_id', appointmentId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !supportRequest) {
      return null;
    }

    return {
      id: supportRequest.id,
      status: supportRequest.status,
      category: supportRequest.category,
    };
  } catch (error) {
    console.error('Error fetching existing support request:', error);
    return null;
  }
}

// Get review status for a booking
async function getReviewStatusForAppointment(
  bookingId: string,
  isAdmin: boolean = false,
): Promise<{
  canReview: boolean;
  hasReview: boolean;
  review: {
    id: string;
    score: number;
    message: string;
    createdAt: string;
  } | null;
} | null> {
  try {
    const { getReviewStatus } = await import(
      '@/server/domains/reviews/actions'
    );
    const result = await getReviewStatus(bookingId, isAdmin);

    console.log('Review status result:', { bookingId, isAdmin, result });

    if (result.success && result.reviewStatus) {
      return result.reviewStatus;
    }

    console.log(
      'Review status returned null:',
      result.error || 'No review status data',
    );
    return null;
  } catch (error) {
    console.error('Error fetching review status:', error);
    return null;
  }
}
