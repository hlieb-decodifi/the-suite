import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { BalancePaymentContent } from './BalancePaymentContent';
import { Loader } from '@/components/common/Loader';

type BalancePaymentPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function BalancePaymentPage({
  params,
}: BalancePaymentPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // Get the current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/auth/signin?redirect=/bookings/' + id + '/balance');
  }

  // Get booking details with payment information
  const { data: booking, error } = await supabase
    .from('bookings')
    .select(
      `
      id,
      status,
      client_id,
      professional_profile_id,
      appointments!inner(
        id,
        date,
        start_time,
        end_time,
        status
      ),
      booking_payments!inner(
        id,
        amount,
        deposit_amount,
        balance_amount,
        tip_amount,
        status,
        requires_balance_payment,
        balance_notification_sent_at
      ),
      professional_profiles!inner(
        id,
        profession,
        users!inner(
          first_name,
          last_name
        ),
        stripe_account_id
      ),
      booking_services(
        id,
        price,
        duration,
        services(
          name
        )
      )
    `,
    )
    .eq('id', id)
    .eq('client_id', user.id)
    .single();

  if (error || !booking) {
    redirect('/dashboard');
  }

  // Check if this booking actually needs a balance payment
  const payment = booking.booking_payments;
  if (!payment?.requires_balance_payment || payment.status === 'completed') {
    redirect('/bookings/' + id);
  }

  const appointment = booking.appointments;
  const professional = booking.professional_profiles;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-gradient-to-r from-purple-600 to-purple-800 text-white p-6">
              <h1 className="text-2xl font-bold">Complete Your Payment</h1>
              <p className="text-purple-100 mt-2">
                Finish paying for your appointment with{' '}
                {professional.profession ||
                  `${professional.users.first_name} ${professional.users.last_name}`}
              </p>
            </div>

            <Suspense fallback={<Loader />}>
              <BalancePaymentContent
                booking={booking}
                appointment={appointment}
                professional={professional}
                payment={payment}
              />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
