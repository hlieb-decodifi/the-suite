alter table "public"."professional_profiles" add column "balance_payment_method" text default 'card'::text;

alter table "public"."professional_profiles" add column "deposit_type" text default 'percentage'::text;

alter table "public"."professional_profiles" add column "deposit_value" numeric(10,2);

alter table "public"."professional_profiles" add column "requires_deposit" boolean not null default false;

alter table "public"."professional_profiles" add constraint "professional_profiles_balance_payment_method_check" CHECK ((balance_payment_method = ANY (ARRAY['card'::text, 'cash'::text]))) not valid;

alter table "public"."professional_profiles" validate constraint "professional_profiles_balance_payment_method_check";

alter table "public"."professional_profiles" add constraint "professional_profiles_check" CHECK (((requires_deposit = false) OR ((requires_deposit = true) AND (deposit_type = 'percentage'::text) AND (deposit_value >= (0)::numeric) AND (deposit_value <= (100)::numeric)) OR ((requires_deposit = true) AND (deposit_type = 'fixed'::text) AND (deposit_value >= (0)::numeric)))) not valid;

alter table "public"."professional_profiles" validate constraint "professional_profiles_check";

alter table "public"."professional_profiles" add constraint "professional_profiles_deposit_type_check" CHECK ((deposit_type = ANY (ARRAY['percentage'::text, 'fixed'::text]))) not valid;

alter table "public"."professional_profiles" validate constraint "professional_profiles_deposit_type_check";


