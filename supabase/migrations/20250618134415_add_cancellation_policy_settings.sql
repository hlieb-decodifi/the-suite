alter table "public"."professional_profiles" add column "cancellation_24h_charge_percentage" numeric(5,2) not null default 50.00;

alter table "public"."professional_profiles" add column "cancellation_48h_charge_percentage" numeric(5,2) not null default 25.00;

alter table "public"."professional_profiles" add column "cancellation_policy_enabled" boolean not null default true;

alter table "public"."professional_profiles" add constraint "chk_cancellation_24h_percentage" CHECK (((cancellation_24h_charge_percentage >= (0)::numeric) AND (cancellation_24h_charge_percentage <= (100)::numeric))) not valid;

alter table "public"."professional_profiles" validate constraint "chk_cancellation_24h_percentage";

alter table "public"."professional_profiles" add constraint "chk_cancellation_48h_percentage" CHECK (((cancellation_48h_charge_percentage >= (0)::numeric) AND (cancellation_48h_charge_percentage <= (100)::numeric))) not valid;

alter table "public"."professional_profiles" validate constraint "chk_cancellation_48h_percentage";

alter table "public"."professional_profiles" add constraint "chk_cancellation_policy_logic" CHECK ((cancellation_24h_charge_percentage >= cancellation_48h_charge_percentage)) not valid;

alter table "public"."professional_profiles" validate constraint "chk_cancellation_policy_logic";


