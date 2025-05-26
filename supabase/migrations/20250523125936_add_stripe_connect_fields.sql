alter table "public"."professional_profiles" add column "stripe_account_id" text;

alter table "public"."professional_profiles" add column "stripe_charges_enabled" boolean not null default false;

alter table "public"."professional_profiles" add column "stripe_connect_status" text not null default 'not_connected'::text;

alter table "public"."professional_profiles" add column "stripe_connect_updated_at" timestamp with time zone;

alter table "public"."professional_profiles" add column "stripe_details_submitted" boolean not null default false;

alter table "public"."professional_profiles" add column "stripe_payouts_enabled" boolean not null default false;

CREATE INDEX idx_professional_profiles_stripe_account_id ON public.professional_profiles USING btree (stripe_account_id) WHERE (stripe_account_id IS NOT NULL);

CREATE INDEX idx_professional_profiles_stripe_connect_status ON public.professional_profiles USING btree (stripe_connect_status);

alter table "public"."professional_profiles" add constraint "professional_profiles_stripe_connect_status_check" CHECK ((stripe_connect_status = ANY (ARRAY['not_connected'::text, 'pending'::text, 'complete'::text]))) not valid;

alter table "public"."professional_profiles" validate constraint "professional_profiles_stripe_connect_status_check";


