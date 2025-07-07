alter table "public"."appointments" drop constraint "appointments_status_check";

alter table "public"."appointments" alter column "status" set default 'active'::text;

alter table "public"."appointments" add constraint "appointments_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'cancelled'::text]))) not valid;

alter table "public"."appointments" validate constraint "appointments_status_check";


