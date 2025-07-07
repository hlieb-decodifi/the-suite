import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { BalancePaymentContent } from './BalancePaymentContent';
import { Loader } from '@/components/common/Loader';
import { Typography } from '@/components/ui/typography';
import { ArrowLeftIcon } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';

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
        service_fee,
        status,
        requires_balance_payment,
        balance_notification_sent_at,
        payment_methods(
          name,
          is_online
        )
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
          name,
          description
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

  // Check if this booking needs balance payment or is a completed cash payment
  const payment = booking.booking_payments;
  const isCashPayment =
    payment?.status === 'completed' && !payment.requires_balance_payment;
  const needsBalancePayment =
    payment?.requires_balance_payment && payment.status !== 'completed';

  // Allow access for: 1) Balance payments needed, 2) Cash payments for tips/reviews
  if (!needsBalancePayment && !isCashPayment) {
    redirect('/bookings/' + id);
  }

  // Transform appointment data to match expected format
  const rawAppointment = booking.appointments[0];
  if (!rawAppointment) {
    redirect('/dashboard');
  }
  const startDate = new Date(rawAppointment.start_time);
  const endDate = new Date(rawAppointment.end_time);

  const appointment = {
    date: format(startDate, 'yyyy-MM-dd'),
    start_time: format(startDate, 'HH:mm:ss'),
    end_time: format(endDate, 'HH:mm:ss'),
  };

  const professional = booking.professional_profiles;

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-6">
          <Link
            href="/dashboard/appointments"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            <Typography>Back to Appointments</Typography>
          </Link>
        </div>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div className="flex flex-col gap-2">
              <Typography
                variant="h1"
                className="font-futura text-4xl md:text-5xl font-bold text-foreground"
              >
                {isCashPayment
                  ? 'Share Your Experience'
                  : 'Complete Your Payment'}
              </Typography>
              <Typography className="text-muted-foreground text-lg">
                {isCashPayment
                  ? `Leave a review and add a tip for your appointment with ${professional.users.first_name} ${professional.users.last_name}`
                  : `Finish paying for your appointment with ${professional.users.first_name} ${professional.users.last_name}`}
              </Typography>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-3">
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
  );
}
