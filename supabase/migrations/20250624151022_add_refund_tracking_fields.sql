alter table "public"."booking_payments" drop constraint "booking_payments_status_check";

alter table "public"."booking_payments" add column "refund_reason" text;

alter table "public"."booking_payments" add column "refund_transaction_id" text;

alter table "public"."booking_payments" add column "refunded_amount" numeric(10,2) not null default 0;

alter table "public"."booking_payments" add column "refunded_at" timestamp with time zone;

CREATE INDEX idx_booking_payments_refunded_at ON public.booking_payments USING btree (refunded_at) WHERE (refunded_at IS NOT NULL);

alter table "public"."booking_payments" add constraint "booking_payments_refund_amount_check" CHECK (((refunded_amount >= (0)::numeric) AND (refunded_amount <= ((amount + tip_amount) + service_fee)))) not valid;

alter table "public"."booking_payments" validate constraint "booking_payments_refund_amount_check";

alter table "public"."booking_payments" add constraint "booking_payments_status_check" CHECK ((status = ANY (ARRAY['incomplete'::text, 'pending'::text, 'completed'::text, 'failed'::text, 'refunded'::text, 'partially_refunded'::text, 'deposit_paid'::text, 'awaiting_balance'::text, 'authorized'::text, 'pre_auth_scheduled'::text]))) not valid;

alter table "public"."booking_payments" validate constraint "booking_payments_status_check";


