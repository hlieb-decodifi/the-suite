alter table "public"."booking_payments" add column "confirmation_emails_sent" boolean not null default false;

alter table "public"."booking_payments" add column "confirmation_emails_sent_at" timestamp with time zone;


