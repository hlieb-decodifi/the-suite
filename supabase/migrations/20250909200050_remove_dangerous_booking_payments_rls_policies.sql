-- Remove dangerous RLS policies for booking_payments
-- These policies allowed clients and professionals to directly insert/update payment records
-- which is a security risk for financial data

-- Drop client insert policy
drop policy if exists "Clients can create booking payments for their bookings" on booking_payments;

-- Drop client update policy  
drop policy if exists "Clients can update booking payments for cancellation" on booking_payments;

-- Drop professional update policy
drop policy if exists "Professionals can update payment amounts for ongoing appointments" on booking_payments;

-- Note: The "Users can view booking payments for their bookings" select policy is kept
-- as viewing payment data is safe and necessary for the application
