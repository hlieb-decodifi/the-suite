alter table "public"."booking_payments" drop constraint "booking_payments_status_check";

drop index if exists "public"."idx_booking_payments_pre_auth_scheduled";

CREATE INDEX idx_booking_payments_pre_auth_scheduled ON public.booking_payments USING btree (pre_auth_scheduled_for) WHERE ((pre_auth_scheduled_for IS NOT NULL) AND (status = ANY (ARRAY['incomplete'::text, 'pending'::text])));

alter table "public"."booking_payments" add constraint "booking_payments_status_check" CHECK ((status = ANY (ARRAY['incomplete'::text, 'pending'::text, 'completed'::text, 'failed'::text, 'refunded'::text, 'deposit_paid'::text, 'awaiting_balance'::text, 'authorized'::text, 'pre_auth_scheduled'::text]))) not valid;

alter table "public"."booking_payments" validate constraint "booking_payments_status_check";


