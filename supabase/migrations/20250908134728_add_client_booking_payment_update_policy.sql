-- Add RLS policy to allow clients to update booking payments for cancellation
create policy "Clients can update booking payments for cancellation"
  on booking_payments for update
  using (
    exists (
      select 1 from bookings
      where bookings.id = booking_payments.booking_id
      and bookings.client_id = auth.uid()
    )
  );
