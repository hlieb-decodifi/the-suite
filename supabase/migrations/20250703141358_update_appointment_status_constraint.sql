alter table "public"."appointments" drop constraint "appointments_status_check";

alter table "public"."appointments" alter column "status" set default 'pending'::text;

alter table "public"."appointments" add constraint "appointments_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'active'::text, 'cancelled'::text, 'completed'::text]))) not valid;

alter table "public"."appointments" validate constraint "appointments_status_check";


