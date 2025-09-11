-- Remove redundant RLS policy for booking updates
-- 
-- RATIONALE:
-- The "Clients can update their own bookings" RLS policy is redundant because:
-- 1. All booking updates are handled by server actions with explicit authorization checks
-- 2. Stripe webhooks use admin client which bypasses RLS entirely
-- 3. Booking cancellation functions perform granular auth checks (professional OR client)
-- 4. The RLS policy is too restrictive - only allows clients, but professionals also need to update bookings
-- 5. Application-level authorization provides better security and business rule validation
--
-- SECURITY:
-- Booking updates are secured by:
-- - Server-side functions with explicit user authentication
-- - Authorization checks comparing auth.uid() to booking.client_id OR professional_profile.user_id
-- - Business rule validation (booking status, appointment status, etc.)
-- - Admin client usage for system operations (Stripe webhooks)

-- Drop the redundant update policy for bookings
drop policy if exists "Clients can update their own bookings" on bookings;

-- Keep the read policies and insert policy which are still needed:
-- - "Clients can view their own bookings" (for dashboard)
-- - "Professionals can view bookings for their profile" (for professional dashboard)  
-- - "Clients can create their own bookings" (for new bookings)
--
-- All booking updates will continue to be handled securely by:
-- - cancelBookingAction() with explicit auth checks
-- - cancelWithPolicyAction() with explicit auth checks  
-- - markNoShowAction() with explicit auth checks
-- - Stripe webhook handlers using admin client
