alter table "public"."professional_stripe_connect" drop constraint "professional_stripe_connect_stripe_connect_status_check";

alter table "public"."professional_stripe_connect" add constraint "professional_stripe_connect_stripe_connect_status_check" CHECK ((stripe_connect_status = ANY (ARRAY['not_connected'::text, 'pending'::text, 'in_review'::text, 'complete'::text]))) not valid;

alter table "public"."professional_stripe_connect" validate constraint "professional_stripe_connect_stripe_connect_status_check";


