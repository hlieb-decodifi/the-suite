alter table "public"."booking_payments" drop constraint "booking_payments_status_check";

alter table "public"."booking_payments" add column "authorization_expires_at" timestamp with time zone;

alter table "public"."booking_payments" add column "capture_method" text default 'automatic'::text;

alter table "public"."booking_payments" add column "capture_scheduled_for" timestamp with time zone;

alter table "public"."booking_payments" add column "captured_at" timestamp with time zone;

alter table "public"."booking_payments" add column "pre_auth_placed_at" timestamp with time zone;

alter table "public"."booking_payments" add column "pre_auth_scheduled_for" timestamp with time zone;

CREATE INDEX idx_booking_payments_capture_scheduled ON public.booking_payments USING btree (capture_scheduled_for) WHERE ((capture_scheduled_for IS NOT NULL) AND (status = ANY (ARRAY['pending'::text, 'authorized'::text])));

CREATE INDEX idx_booking_payments_pre_auth_scheduled ON public.booking_payments USING btree (pre_auth_scheduled_for) WHERE ((pre_auth_scheduled_for IS NOT NULL) AND (status = 'pending'::text));

alter table "public"."booking_payments" add constraint "booking_payments_capture_method_check" CHECK ((capture_method = ANY (ARRAY['automatic'::text, 'manual'::text]))) not valid;

alter table "public"."booking_payments" validate constraint "booking_payments_capture_method_check";

alter table "public"."booking_payments" add constraint "booking_payments_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'completed'::text, 'failed'::text, 'refunded'::text, 'deposit_paid'::text, 'awaiting_balance'::text, 'authorized'::text, 'pre_auth_scheduled'::text]))) not valid;

alter table "public"."booking_payments" validate constraint "booking_payments_status_check";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.calculate_payment_schedule(appointment_date date, appointment_time time without time zone)
 RETURNS TABLE(pre_auth_date timestamp with time zone, capture_date timestamp with time zone, should_pre_auth_now boolean)
 LANGUAGE plpgsql
AS $function$
declare
  appointment_datetime timestamp with time zone;
  six_days_before timestamp with time zone;
  twelve_hours_after timestamp with time zone;
begin
  -- Combine date and time into full timestamp
  appointment_datetime := (appointment_date || ' ' || appointment_time)::timestamp with time zone;
  
  -- Calculate 6 days before appointment (for pre-auth)
  six_days_before := appointment_datetime - interval '6 days';
  
  -- Calculate 12 hours after appointment (for capture)
  twelve_hours_after := appointment_datetime + interval '12 hours';
  
  -- Determine if we should place pre-auth now (if appointment is within 6 days)
  return query select 
    six_days_before as pre_auth_date,
    twelve_hours_after as capture_date,
    (now() >= six_days_before) as should_pre_auth_now;
end;
$function$
;


