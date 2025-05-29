alter table "public"."booking_payments" drop constraint "booking_payments_status_check";

alter table "public"."booking_payments" add column "balance_amount" numeric(10,2) not null default 0;

alter table "public"."booking_payments" add column "balance_payment_method" text;

alter table "public"."booking_payments" add column "deposit_amount" numeric(10,2) not null default 0;

alter table "public"."booking_payments" add column "payment_type" text not null default 'full'::text;

alter table "public"."booking_payments" add column "requires_balance_payment" boolean not null default false;

alter table "public"."booking_payments" add column "stripe_checkout_session_id" text;

CREATE INDEX idx_booking_payments_stripe_checkout_session_id ON public.booking_payments USING btree (stripe_checkout_session_id) WHERE (stripe_checkout_session_id IS NOT NULL);

alter table "public"."booking_payments" add constraint "booking_payments_balance_payment_method_check" CHECK ((balance_payment_method = ANY (ARRAY['card'::text, 'cash'::text]))) not valid;

alter table "public"."booking_payments" validate constraint "booking_payments_balance_payment_method_check";

alter table "public"."booking_payments" add constraint "booking_payments_payment_type_check" CHECK ((payment_type = ANY (ARRAY['full'::text, 'deposit'::text, 'balance'::text]))) not valid;

alter table "public"."booking_payments" validate constraint "booking_payments_payment_type_check";

alter table "public"."booking_payments" add constraint "booking_payments_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'completed'::text, 'failed'::text, 'refunded'::text, 'deposit_paid'::text, 'awaiting_balance'::text]))) not valid;

alter table "public"."booking_payments" validate constraint "booking_payments_status_check";


